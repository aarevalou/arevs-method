import { EMPTY_STATE } from "../utils/constants";
import { normalizePhysicalMetrics } from "../utils/physicalAssessments";
import { supabase } from "./supabase";

let saveQueue = Promise.resolve();

const normalizeData = (value) => {
  const stored = value ?? EMPTY_STATE;
  return {
    ...EMPTY_STATE,
    ...stored,
    schedules: stored.schedules ?? [],
    exercises: stored.exercises ?? [],
    circuits: stored.circuits ?? [],
    plans:
      stored.plans && Object.keys(stored.plans).length
        ? stored.plans
        : EMPTY_STATE.plans,
    settings: {
      ...EMPTY_STATE.settings,
      ...(stored.settings ?? {}),
      zoomFactor:
        Number.isFinite(stored.settings?.zoomFactor) &&
        stored.settings.zoomFactor >= 0.8 &&
        stored.settings.zoomFactor <= 1.5
          ? stored.settings.zoomFactor
          : EMPTY_STATE.settings.zoomFactor,
      theme: stored.settings?.theme === "light" ? "light" : "dark",
      assessmentMetrics: normalizePhysicalMetrics(
        stored.settings?.assessmentMetrics,
      ),
    },
    athletes: (stored.athletes ?? []).map((athlete) => {
      const {
        paymentArchivedAt,
        paymentArchivedAmount,
        paymentArchivedDetails,
        ...currentAthlete
      } = athlete;
      const archivedRecords = Object.fromEntries(
        (paymentArchivedDetails?.charges ?? []).map((charge) => [
          charge.key,
          { paid: true, paidAt: paymentArchivedAt ?? null },
        ]),
      );
      const paymentRecords = {
        ...archivedRecords,
        ...(athlete.paymentRecords ?? {}),
      };
      return {
        ...currentAthlete,
        payment:
          athlete.payment === "VENCIDO"
            ? "PENDIENTE"
            : (athlete.payment ?? "PENDIENTE"),
        ...(athlete.paymentRecords || Object.keys(archivedRecords).length
          ? { paymentRecords }
          : {}),
      };
    }),
  };
};

const readCloudState = async (userId) => {
  const { data, error } = await supabase
    .from("app_data")
    .select("state")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new Error(`No se pudieron cargar los datos: ${error.message}`);
  return data?.state ?? null;
};

const loadLegacyLocalData = async () => {
  const local = await window.db?.load();
  return normalizeData(local);
};

const clearLegacyLocalData = async () => {
  await window.db?.clearLegacyData();
};

export const loadData = async (userId) => {
  if (!supabase) throw new Error("La conexión con Supabase no está configurada.");

  const cloudState = await readCloudState(userId);
  if (cloudState) {
    await clearLegacyLocalData();
    return normalizeData(cloudState);
  }

  const legacyState = await loadLegacyLocalData();
  const { error } = await supabase
    .from("app_data")
    .insert({ owner_id: userId, state: legacyState });

  if (!error) {
    await clearLegacyLocalData();
    return legacyState;
  }
  if (error.code !== "23505") {
    throw new Error(`No se pudieron inicializar los datos: ${error.message}`);
  }

  const concurrentlyCreatedState = await readCloudState(userId);
  if (!concurrentlyCreatedState) {
    throw new Error("No se encontró el estado inicial creado en Supabase.");
  }
  await clearLegacyLocalData();
  return normalizeData(concurrentlyCreatedState);
};

export const saveData = (userId, state) => {
  if (!supabase) {
    return Promise.reject(
      new Error("La conexión con Supabase no está configurada."),
    );
  }

  const write = saveQueue.catch(() => undefined).then(async () => {
    const { error } = await supabase
      .from("app_data")
      .upsert(
        { owner_id: userId, state },
        { onConflict: "owner_id" },
      );
    if (error) {
      throw new Error(`No se pudieron guardar los cambios: ${error.message}`);
    }
  });
  saveQueue = write;
  return write;
};
