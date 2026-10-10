import { createContext, useContext, useEffect, useRef, useState } from "react";
import { loadData, saveData } from "../services/storage";
import { EMPTY_STATE, PLANS } from "../utils/constants";
import SupabaseAuthScreen from "../components/SupabaseAuthScreen";
import { supabase, supabaseConfigured } from "../services/supabase";
import { REMEMBER_SESSION_STORAGE_KEY } from "../services/sessionPersistence";
import {
  createAthlete,
  createEvaluation,
  remainingAfter,
  todayISO,
} from "../utils/helpers";
import { getPaymentDetails, syncPaymentRecords } from "../utils/payments";
import { normalizePhysicalMetrics } from "../utils/physicalAssessments";
import {
  schedulePeriod,
  scheduleSessionType,
} from "../utils/attendanceSummary";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
const newId = () => crypto.randomUUID();

export function AppProvider({ children }) {
  const [state, setState] = useState(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(!supabaseConfigured);
  const [authError, setAuthError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [syncStatus, setSyncStatus] = useState("saved");
  const [syncError, setSyncError] = useState("");
  const [saveAttempt, setSaveAttempt] = useState(0);
  const pendingSaveRef = useRef(Promise.resolve());
  const currentMonth = todayISO().slice(0, 7);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setAuthError("");
      },
    );
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(`No se pudo recuperar la sesión: ${error.message}`);
        setSession(data?.session ?? null);
        setAuthInitialized(true);
      })
      .catch((error) => {
        if (!active) return;
        setAuthError(`No se pudo recuperar la sesión: ${error.message}`);
        setAuthInitialized(true);
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setReady(false);
      setLoadError("");
      setState(EMPTY_STATE);
      return undefined;
    }
    let active = true;
    setReady(false);
    setLoadError("");
    setState(EMPTY_STATE);
    loadData(session.user.id)
      .then((storedState) => {
        if (!active) return;
        setState(storedState);
        setSyncStatus("saved");
        setSyncError("");
        setReady(true);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error.message || "No se pudieron cargar los datos.");
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id, loadAttempt]);

  useEffect(() => {
    if (!ready || !session?.user?.id) return undefined;
    let active = true;
    setSyncStatus("saving");
    setSyncError("");
    const request = saveData(session.user.id, state);
    pendingSaveRef.current = request;
    request
      .then(() => {
        if (active) setSyncStatus("saved");
      })
      .catch((error) => {
        if (!active) return;
        setSyncStatus("error");
        setSyncError(error.message || "No se pudieron guardar los cambios.");
      });
    return () => {
      active = false;
    };
  }, [state, ready, session?.user?.id, saveAttempt]);

  useEffect(() => {
    if (!ready) return;
    setState((current) => {
      let changed = false;
      const athletes = current.athletes.map((athlete) => {
        const synced = syncPaymentRecords(
          athlete,
          current.sessions,
          currentMonth,
          current.plans,
        );
        if (synced !== athlete) changed = true;
        return synced;
      });
      return changed ? { ...current, athletes } : current;
    });
  }, [ready, state.athletes, state.sessions, state.plans, currentMonth]);

  useEffect(() => {
    if (!ready) return;
    const zoomFactor = state.settings?.zoomFactor ?? EMPTY_STATE.settings.zoomFactor;
    const setNativeZoom = window.db?.setZoomFactor;
    if (setNativeZoom) {
      setNativeZoom(zoomFactor).catch((error) => {
        console.error("No se pudo restaurar el nivel de zoom guardado.", error);
      });
    } else {
      document.documentElement.style.zoom = String(zoomFactor);
    }
  }, [ready, state.settings?.zoomFactor]);

  useEffect(() => {
    if (!ready) return;
    const theme = state.settings?.theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.bsTheme = theme;
  }, [ready, state.settings?.theme]);

  const actions = {
    addAthlete: (form) =>
      setState((s) => ({
        ...s,
        athletes: [...s.athletes, createAthlete(form, newId(), s.plans)],
      })),

    savePlan: (id, plan) =>
      setState((s) => ({
        ...s,
        plans: { ...s.plans, [id]: plan },
        athletes: s.athletes.map((athlete) => {
          if (athlete.plan !== id) return athlete;
          const sessionsUsed = Math.max(
            0,
            athlete.allocated - athlete.remaining,
          );
          return {
            ...athlete,
            allocated: plan.sessions,
            remaining: Math.max(0, plan.sessions - sessionsUsed),
          };
        }),
      })),

    updateSettings: (patch) =>
      setState((s) => ({
        ...s,
        settings: { ...(s.settings ?? EMPTY_STATE.settings), ...patch },
      })),

    saveAssessmentMetrics: (metrics) =>
      setState((s) => ({
        ...s,
        settings: {
          ...(s.settings ?? EMPTY_STATE.settings),
          assessmentMetrics: normalizePhysicalMetrics(metrics),
        },
        assessments: [],
      })),

    clearPaymentHistory: () =>
      setState((s) => ({
        ...s,
        athletes: s.athletes.map((athlete) => {
          const {
            paymentArchivedAt,
            paymentArchivedAmount,
            paymentArchivedDetails,
            paymentRecords,
            ...currentAthlete
          } = athlete;
          return {
            ...currentAthlete,
            payment: "PENDIENTE",
          };
        }),
      })),

    resetAllData: () =>
      setState({
        ...EMPTY_STATE,
        athletes: [],
        sessions: [],
        schedules: [],
        exercises: [],
        circuits: [],
        logs: [],
        assessments: [],
        plans: Object.fromEntries(
          Object.entries(PLANS).map(([id, plan]) => [id, { ...plan }]),
        ),
        settings: { ...EMPTY_STATE.settings },
      }),

    deletePlan: (id) =>
      setState((s) => {
        if (
          Object.keys(s.plans).length <= 1 ||
          s.athletes.some((athlete) => athlete.plan === id)
        ) {
          return s;
        }
        return {
          ...s,
          plans: Object.fromEntries(
            Object.entries(s.plans).filter(([planId]) => planId !== id),
          ),
        };
      }),

    updateAthlete: (id, patch) =>
      setState((s) => ({
        ...s,
        athletes: s.athletes.map((athlete) =>
          athlete.id === id ? { ...athlete, ...patch } : athlete,
        ),
      })),

    updatePaymentRecord: (athleteId, chargeKey, paid) =>
      setState((current) => ({
        ...current,
        athletes: current.athletes.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          const details = getPaymentDetails(
            athlete,
            current.sessions,
            currentMonth,
            current.plans,
          );
          const previous = athlete.paymentRecords?.[chargeKey];
          const paymentRecords = {
            ...(athlete.paymentRecords ?? {}),
            [chargeKey]: {
              paid,
              paidAt: paid
                ? (previous?.paidAt ?? new Date().toISOString())
                : null,
              amount:
                details.charges.find((charge) => charge.key === chargeKey)
                  ?.amount ?? previous?.amount,
            },
          };
          const payment = details.charges.every((charge) =>
            charge.key === chargeKey
              ? paid
              : Boolean(paymentRecords[charge.key]?.paid ?? charge.paid),
          )
            ? "AL_DIA"
            : "PENDIENTE";
          return { ...athlete, payment, paymentRecords };
        }),
      })),

    markAllPaymentsPaid: (athleteId) =>
      setState((current) => ({
        ...current,
        athletes: current.athletes.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          const details = getPaymentDetails(
            athlete,
            current.sessions,
            currentMonth,
            current.plans,
          );
          const now = new Date().toISOString();
          const paymentRecords = {
            ...(athlete.paymentRecords ?? {}),
            ...Object.fromEntries(
              details.charges.map((charge) => [
                charge.key,
                {
                  paid: true,
                  paidAt: athlete.paymentRecords?.[charge.key]?.paidAt ?? now,
                  amount: charge.amount,
                },
              ]),
            ),
          };
          return { ...athlete, payment: "AL_DIA", paymentRecords };
        }),
      })),

    archiveAthlete: (id) =>
      setState((current) => ({
        ...current,
        athletes: current.athletes.map((athlete) =>
          athlete.id === id
            ? {
                ...athlete,
                statusBeforeArchive: athlete.status,
                status: "INACTIVO",
                archivedAt: new Date().toISOString(),
              }
            : athlete,
        ),
      })),

    restoreAthlete: (id) =>
      setState((current) => ({
        ...current,
        athletes: current.athletes.map((athlete) => {
          if (athlete.id !== id) return athlete;
          const { archivedAt, statusBeforeArchive, ...rest } = athlete;
          return {
            ...rest,
            status: statusBeforeArchive ?? "ACTIVO",
            archivedAt: null,
          };
        }),
      })),

    markAttendance: ({
      athleteId,
      date,
      block,
      sessionType,
      status,
      noticeAt,
      scheduledStartAt,
    }) =>
      setState((s) => {
        const resolvedSessionType =
          sessionType ??
          (block === "RECUPERACION" || block === "DOMICILIO"
            ? block
            : "NORMAL");
        const old = s.sessions.find(
          (x) =>
            x.athleteId === athleteId &&
            x.date === date &&
            schedulePeriod(x) === schedulePeriod({ block }) &&
            scheduleSessionType(x) === resolvedSessionType,
        );
        const resolvedStatus = status;
        const athlete = s.athletes.find((item) => item.id === athleteId);
        const isRecoverySession = resolvedSessionType === "RECUPERACION";
        const grantsRecoveryCredit =
          !isRecoverySession && resolvedStatus === "AUSENTE_CON_AVISO";
        const recoveryCreditGranted = Boolean(old?.recoveryCreditGranted);
        const recoveryCreditConsumed =
          isRecoverySession &&
          (resolvedStatus === "PRESENTE" ||
            resolvedStatus === "AUSENTE_SIN_AVISO");
        const wasRecoveryCreditConsumed = Boolean(old?.recoveryCreditConsumed);
        const creditDelta =
          (grantsRecoveryCredit && !recoveryCreditGranted ? 1 : 0) -
          (!grantsRecoveryCredit && recoveryCreditGranted ? 1 : 0) -
          (recoveryCreditConsumed && !wasRecoveryCreditConsumed ? 1 : 0) +
          (wasRecoveryCreditConsumed && !recoveryCreditConsumed ? 1 : 0);
        const remaining = isRecoverySession
          ? athlete.remaining
          : remainingAfter(athlete, old?.status, resolvedStatus);
        const plan = s.plans[athlete.plan];
        const session = {
          ...(old ?? { id: newId() }),
          athleteId,
          date,
          block,
          sessionType: resolvedSessionType,
          status: resolvedStatus,
          noticeAt: noticeAt ?? null,
          scheduledStartAt: scheduledStartAt ?? null,
          billingType: plan?.billingType ?? old?.billingType,
          recoveryCreditGranted: grantsRecoveryCredit,
          recoveryCreditConsumed,
          cycleClosedWithoutNotice:
            !isRecoverySession &&
            plan?.billingType !== "monthly" &&
            resolvedStatus === "AUSENTE_SIN_AVISO" &&
            remaining === 0,
        };
        return {
          ...s,
          sessions: old
            ? s.sessions.map((x) => (x === old ? session : x))
            : [...s.sessions, session],
          athletes: s.athletes.map((a) =>
            a.id === athleteId
              ? {
                  ...a,
                  remaining,
                  recoveryCredits: Math.max(
                    0,
                    (a.recoveryCredits ?? 0) + creditDelta,
                  ),
                }
              : a,
          ),
        };
      }),

    saveAttendanceSchedule: ({
      athleteId,
      date,
      block,
      sessionType,
      scheduleId,
      ...times
    }) =>
      setState((s) => {
        const old = s.schedules.find(
          (schedule) =>
            (scheduleId && schedule.id === scheduleId) ||
            (schedule.athleteId === athleteId &&
              schedule.date === date &&
              schedule.block === block &&
              (schedule.sessionType ?? "NORMAL") === (sessionType ?? "NORMAL")),
        );
        const isSpecificTime = Object.hasOwn(times, "time");
        const updated = {
          ...(old ?? {}),
          ...times,
          sessionType: sessionType ?? "NORMAL",
          time: isSpecificTime ? times.time : "",
          startTime: isSpecificTime ? "" : (times.startTime ?? old?.startTime ?? ""),
          endTime: isSpecificTime ? "" : (times.endTime ?? old?.endTime ?? ""),
          athleteId,
          date,
          block,
        };
        const hasTime = isSpecificTime
          ? Boolean(updated.time)
          : Boolean(updated.startTime || updated.endTime);

        return {
          ...s,
          schedules: hasTime
            ? old
              ? s.schedules.map((schedule) =>
                  schedule === old ? updated : schedule,
                )
              : [...s.schedules, { id: newId(), ...updated }]
            : s.schedules.filter((schedule) => schedule !== old),
        };
      }),

    saveExercise: (exercise) =>
      setState((s) => {
        const exists = s.exercises.some((item) => item.id === exercise.id);
        return {
          ...s,
          exercises: exists
            ? s.exercises.map((item) =>
                item.id === exercise.id ? exercise : item,
              )
            : [...s.exercises, exercise],
        };
      }),

    deleteExercise: (id) =>
      setState((s) => {
        if (s.circuits.some((circuit) =>
          circuit.nodes.some((node) => node.exerciseId === id),
        )) {
          return s;
        }
        return {
          ...s,
          exercises: s.exercises.filter((exercise) => exercise.id !== id),
        };
      }),

    saveCircuit: (circuit) =>
      setState((s) => {
        const exists = s.circuits.some((item) => item.id === circuit.id);
        return {
          ...s,
          circuits: exists
            ? s.circuits.map((item) =>
                item.id === circuit.id ? circuit : item,
              )
            : [...s.circuits, circuit],
        };
      }),

    deleteCircuit: (id) =>
      setState((s) => ({
        ...s,
        circuits: s.circuits.filter((circuit) => circuit.id !== id),
        sessions: s.sessions.map((session) =>
          session.circuitId === id
            ? { ...session, circuitId: "" }
            : session,
        ),
      })),

    assignCircuitToSession: (sessionId, circuitId) =>
      setState((s) => ({
        ...s,
        sessions: s.sessions.map((session) =>
          session.id === sessionId
            ? { ...session, circuitId: circuitId || "" }
            : session,
        ),
      })),

    deleteAthlete: (id) =>
      setState((s) => ({
        ...s,
        athletes: s.athletes.filter((a) => a.id !== id),
        schedules: s.schedules.filter((schedule) => schedule.athleteId !== id),
      })),

    addEvaluation: (athleteId, form) =>
      setState((s) => ({
        ...s,
        logs: [...s.logs, createEvaluation(athleteId, form, newId())],
      })),

    removeEvaluation: (id) =>
      setState((s) => ({ ...s, logs: s.logs.filter((l) => l.id !== id) })),

    addPhysicalAssessment: (assessment) =>
      setState((s) => ({
        ...s,
        assessments: [...(s.assessments ?? []), assessment],
      })),

    removePhysicalAssessment: (id) =>
      setState((s) => ({
        ...s,
        assessments: (s.assessments ?? []).filter(
          (assessment) => assessment.id !== id,
        ),
      })),
  };

  const signIn = async (email, password, rememberSession = false) => {
    if (!supabase) throw new Error("La conexión con Supabase no está configurada.");
    try {
      if (rememberSession) {
        localStorage.setItem(REMEMBER_SESSION_STORAGE_KEY, "true");
      } else {
        localStorage.removeItem(REMEMBER_SESSION_STORAGE_KEY);
      }
    } catch (error) {
      throw new Error(`No se pudo guardar la preferencia de sesión: ${error.message}`);
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      localStorage.removeItem(REMEMBER_SESSION_STORAGE_KEY);
      throw new Error(`No se pudo iniciar sesión: ${error.message}`);
    }
  };
  const signOut = async () => {
    if (!supabase) return;
    setAuthError("");
    try {
      await pendingSaveRef.current;
    } catch (error) {
      const message =
        `No se cerró la sesión porque hay cambios sin guardar: ${error.message}`;
      setAuthError(message);
      throw new Error(message);
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      const message = `No se pudo cerrar sesión: ${error.message}`;
      setAuthError(message);
      throw new Error(message);
    }
    localStorage.removeItem(REMEMBER_SESSION_STORAGE_KEY);
  };

  if (!supabaseConfigured) {
    return (
      <SupabaseAuthScreen
        configured={false}
        onSignIn={signIn}
      />
    );
  }
  if (!authInitialized) {
    return <main className="supabase-loading">Conectando con Supabase…</main>;
  }
  if (!session) {
    return (
      <SupabaseAuthScreen
        configured
        onSignIn={signIn}
        initialError={authError}
      />
    );
  }
  if (loadError) {
    return (
      <main className="supabase-loading">
        <section className="supabase-load-error" role="alert">
          <h1>No se pudieron cargar los datos</h1>
          <p>{loadError}</p>
          <button
            type="button"
            className="circuit-primary-button"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          >
            Reintentar
          </button>
          <button type="button" className="supabase-text-button" onClick={signOut}>
            Cerrar sesión
          </button>
        </section>
      </main>
    );
  }
  if (!ready) {
    return <main className="supabase-loading">Cargando datos de la cuenta…</main>;
  }

  return (
    <AppContext.Provider
      value={{ state, actions, user: session.user, signOut }}
    >
      {children}
      {(authError || syncStatus === "saving" || syncStatus === "error") && (
        <div className={`supabase-sync-status${syncStatus === "error" || authError ? " is-error" : ""}`} role={authError ? "alert" : "status"} aria-live="polite">
          {authError ? (
            authError
          ) : syncStatus === "saving" ? (
            "Guardando en Supabase…"
          ) : (
            <>
              <span>{syncError}</span>
              <button
                type="button"
                onClick={() => setSaveAttempt((attempt) => attempt + 1)}
              >
                Reintentar
              </button>
            </>
          )}
        </div>
      )}
    </AppContext.Provider>
  );
}
