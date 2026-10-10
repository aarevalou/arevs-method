import { useState } from "react";
import { useApp } from "../context/AppContext";
import { PageHeader, SegmentedControl } from "../components/UI";
import DatePicker from "../components/DatePicker";
import { ATTENDANCE, BLOCKS, SESSION_TYPES } from "../utils/constants";
import { ageOf, isActive, todayISO } from "../utils/helpers";
import {
  schedulePeriod,
  scheduleSessionType,
  scheduleSlotKey,
  scheduleStartTime,
} from "../utils/attendanceSummary";

const OPTIONS = Object.entries(ATTENDANCE).map(
  ([value, { label, tone, description }]) => ({
    value,
    label,
    tone,
    description,
  }),
);

const UNSCHEDULED = "UNSCHEDULED";

const scheduledStartAt = (date, schedule) => {
  const time = scheduleStartTime(schedule);
  return time ? new Date(`${date}T${time}:00`).toISOString() : "";
};

export default function AttendancePage() {
  const { state, actions } = useApp();
  const [date, setDate] = useState(todayISO());
  const [selectedPeriod, setSelectedPeriod] = useState("AM");
  const [selectedSessionType, setSelectedSessionType] = useState("NORMAL");
  const [slotKey, setSlotKey] = useState("");
  const [scheduleEditor, setScheduleEditor] = useState(null);
  const [attendanceError, setAttendanceError] = useState("");
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const active = state.athletes.filter(isActive);
  const schedulesForDate = state.schedules.filter(
    (schedule) => schedule.date === date && scheduleSlotKey(schedule),
  );
  const slots = [
    ...new Map(
      schedulesForDate.map((schedule) => [
        scheduleSlotKey(schedule),
        {
          key: scheduleSlotKey(schedule),
          block: schedulePeriod(schedule),
          sessionType: scheduleSessionType(schedule),
          displayTime: schedule.time
            ? schedule.time
            : `${scheduleStartTime(schedule)} – ${schedule.endTime || "sin hora de término"}`,
          startTime: scheduleStartTime(schedule),
        },
      ]),
    ).values(),
  ].sort((first, second) => first.startTime.localeCompare(second.startTime));
  const matchingSlots = slots.filter(
    (slot) =>
      slot.block === selectedPeriod &&
      slot.sessionType === selectedSessionType,
  );
  const selectedSlot =
    matchingSlots.find((slot) => slot.key === slotKey) ??
    (slotKey === "" ? matchingSlots[0] ?? null : null);
  const isUnscheduledSelected =
    slotKey === UNSCHEDULED || (slotKey === "" && matchingSlots.length === 0);
  const hasSchedule = (athlete) =>
    state.schedules.some(
      (schedule) =>
        schedule.athleteId === athlete.id &&
        schedule.date === date &&
        schedulePeriod(schedule) === selectedPeriod &&
        scheduleSessionType(schedule) === selectedSessionType &&
        scheduleSlotKey(schedule),
    );
  const visibleAthletes = selectedSlot
    ? active.filter((athlete) =>
        state.schedules.some(
          (schedule) =>
            schedule.athleteId === athlete.id &&
            schedule.date === date &&
            schedulePeriod(schedule) === selectedPeriod &&
            scheduleSessionType(schedule) === selectedSessionType &&
            scheduleSlotKey(schedule) === selectedSlot.key,
        ),
      )
    : isUnscheduledSelected
      ? active.filter((athlete) => !hasSchedule(athlete))
      : [];
  const sessionOf = (a) =>
    state.sessions.find(
      (s) =>
        selectedSlot &&
        s.athleteId === a.id &&
        s.date === date &&
        schedulePeriod(s) === selectedSlot.block &&
        scheduleSessionType(s) === selectedSlot.sessionType,
    );
  const statusOf = (a) => sessionOf(a)?.status;
  const scheduleOf = (a) =>
    state.schedules.find(
      (schedule) =>
        schedule.athleteId === a.id &&
        schedule.date === date &&
        (selectedSlot
          ? scheduleSlotKey(schedule) === selectedSlot.key
          : isUnscheduledSelected
            ? schedulePeriod(schedule) === selectedPeriod &&
              scheduleSessionType(schedule) === selectedSessionType &&
              !scheduleSlotKey(schedule)
            : false),
    ) ?? {};

  const openScheduleEditor = (athlete, plan, schedule) => {
    setScheduleEditor({
      athleteId: athlete.id,
      scheduleId: schedule.id,
      athleteName: athlete.name,
      planLabel: plan?.label ?? "Plan no disponible",
      isPerSession: plan?.billingType === "per_session",
      isExistingSchedule: Boolean(schedule.id),
      block:
        schedulePeriod(schedule) === "SIN_FRANJA"
          ? "AM"
          : schedulePeriod(schedule) || selectedPeriod,
      sessionType: scheduleSessionType(schedule),
      time: schedule.time ?? "",
      startTime: schedule.startTime ?? "",
      endTime: schedule.endTime ?? "",
    });
  };

  const saveSchedule = () => {
    if (!scheduleEditor) return;
    const hasAnyTime = scheduleEditor.isPerSession
      ? Boolean(scheduleEditor.time)
      : Boolean(scheduleEditor.startTime || scheduleEditor.endTime);
    if (
      hasAnyTime &&
      ((scheduleEditor.isPerSession && !scheduleEditor.time) ||
        (!scheduleEditor.isPerSession &&
          (!scheduleEditor.startTime || !scheduleEditor.endTime)))
    ) {
      setAttendanceError("Completa el horario antes de guardarlo.");
      return;
    }
    actions.saveAttendanceSchedule({
      athleteId: scheduleEditor.athleteId,
      scheduleId: scheduleEditor.scheduleId,
      date,
      block: scheduleEditor.block,
      sessionType: scheduleEditor.sessionType,
      ...(scheduleEditor.isPerSession
        ? { time: scheduleEditor.time }
        : {
            startTime: scheduleEditor.startTime,
            endTime: scheduleEditor.endTime,
          }),
    });
    setScheduleEditor(null);
    if (hasAnyTime) {
      const savedSlot = scheduleEditor.isPerSession
        ? {
            block: scheduleEditor.block,
            sessionType: scheduleEditor.sessionType,
            time: scheduleEditor.time,
          }
        : {
            block: scheduleEditor.block,
            sessionType: scheduleEditor.sessionType,
            startTime: scheduleEditor.startTime,
            endTime: scheduleEditor.endTime,
          };
      setSlotKey(scheduleSlotKey(savedSlot));
      setSelectedPeriod(scheduleEditor.block);
      setSelectedSessionType(scheduleEditor.sessionType);
    } else {
      setSlotKey(UNSCHEDULED);
    }
    setAttendanceError("");
  };

  const handleAttendanceChange = (athlete, status) => {
    if (!selectedSlot) {
      setAttendanceError("Define primero el horario del atleta.");
      return;
    }
    const schedule = scheduleOf(athlete);
    const sessionStart = scheduledStartAt(date, schedule);
    if (
      (status === "AUSENTE_CON_AVISO" ||
        status === "AUSENTE_SIN_AVISO") &&
      !sessionStart
    ) {
      setAttendanceError(
        "Guarda la hora de inicio de la sesión antes de registrar la inasistencia.",
      );
      openScheduleEditor(athlete, state.plans[athlete.plan], schedule);
      return;
    }
    if (
      selectedSlot.sessionType === "RECUPERACION" &&
      status === "PRESENTE" &&
      (athlete.recoveryCredits ?? 0) < 1
    ) {
      setAttendanceError("Este atleta no tiene clases recuperativas disponibles.");
      return;
    }
    setAttendanceError("");
    setAttendanceMessage("");
    if (status === "AUSENTE_CON_AVISO") {
      const noticeAt = new Date().toISOString();
      actions.markAttendance({
        athleteId: athlete.id,
        date,
        block: selectedSlot.block,
        sessionType: selectedSlot.sessionType,
        status,
        noticeAt,
        scheduledStartAt: sessionStart,
      });
      setAttendanceMessage(
        selectedSlot.sessionType === "RECUPERACION"
          ? "La clase recuperativa sigue disponible; no se generó un crédito duplicado."
          : "Aviso registrado: se agregó una clase recuperativa al saldo.",
      );
      return;
    }
    actions.markAttendance({
      athleteId: athlete.id,
      date,
      block: selectedSlot.block,
      sessionType: selectedSlot.sessionType,
      status,
      scheduledStartAt: sessionStart,
    });
  };

  return (
    <div >
      <PageHeader title="Asistencia">
        <DatePicker
          className="attendance-date-picker"
          value={date}
          onChange={(nextDate) => {
            setDate(nextDate);
            setSlotKey("");
            setAttendanceError("");
            setAttendanceMessage("");
          }}
        />
      </PageHeader>

      <section className="attendance-toolbar" aria-label="Filtros de asistencia">
        <div className="attendance-filter-group">
          <span className="attendance-filter-label">Franja</span>
          <div className="attendance-filter-options" role="group" aria-label="Franja horaria">
            {BLOCKS.map((period) => (
              <button
                key={period}
                type="button"
                className={selectedPeriod === period ? "is-selected" : ""}
                aria-pressed={selectedPeriod === period}
                onClick={() => {
                  setSelectedPeriod(period);
                  setSlotKey("");
                  setAttendanceError("");
                  setAttendanceMessage("");
                }}
              >
                {period === "AM" ? "AM" : "PM"}
              </button>
            ))}
            {slots.some((slot) => slot.block === "SIN_FRANJA") && (
              <button
                type="button"
                className={selectedPeriod === "SIN_FRANJA" ? "is-selected" : ""}
                aria-pressed={selectedPeriod === "SIN_FRANJA"}
                onClick={() => {
                  setSelectedPeriod("SIN_FRANJA");
                  setSlotKey("");
                  setAttendanceError("");
                  setAttendanceMessage("");
                }}
              >
                Sin franja
              </button>
            )}
          </div>
        </div>
        <div className="attendance-filter-group">
          <span className="attendance-filter-label">Tipo de sesión</span>
          <div className="attendance-filter-options" role="group" aria-label="Tipo de sesión">
            {SESSION_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={selectedSessionType === value ? "is-selected" : ""}
                aria-pressed={selectedSessionType === value}
                onClick={() => {
                  setSelectedSessionType(value);
                  setSlotKey("");
                  setAttendanceError("");
                  setAttendanceMessage("");
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="attendance-slot-section">
          <span className="attendance-filter-label">Horarios del día</span>
          <div className="attendance-slot-list" role="group" aria-label="Horarios disponibles">
            {matchingSlots.map((slot) => (
              <button
                key={slot.key}
                type="button"
                className={`attendance-slot-card${selectedSlot?.key === slot.key ? " is-selected" : ""}`}
                aria-pressed={selectedSlot?.key === slot.key}
                onClick={() => {
                  setSlotKey(slot.key);
                  setAttendanceError("");
                  setAttendanceMessage("");
                }}
              >
                <span className="attendance-slot-time">{slot.displayTime}</span>
              </button>
            ))}
            <button
              type="button"
              className={`attendance-slot-card attendance-unscheduled-card${isUnscheduledSelected ? " is-selected" : ""}`}
              aria-pressed={isUnscheduledSelected}
              onClick={() => {
                setSlotKey(UNSCHEDULED);
                setAttendanceError("");
                setAttendanceMessage("");
              }}
            >
              <span className="attendance-slot-time">Sin horario</span>
            </button>
          </div>
        </div>
      </section>

      {attendanceError && (
        <p className="circuit-error" role="alert">{attendanceError}</p>
      )}
      {attendanceMessage && (
        <p className="attendance-status-message" role="status">
          {attendanceMessage}
        </p>
      )}

      {visibleAthletes.length ? (
        <div className="attendance-table-wrapper">
          <table className="attendance-table" aria-label="Registro de asistencia">
            <thead>
              <tr>
                <th>Deportista</th>
                <th>Plan</th>
                <th>Clases restantes</th>
                <th>Horario</th>
                <th>Estado de asistencia</th>
              </tr>
            </thead>
            <tbody>
              {visibleAthletes.map((a) => {
                const plan = state.plans[a.plan];
                const schedule = scheduleOf(a);
                const isPerSession = plan?.billingType === "per_session";

                return (
                    <tr key={a.id}>
                      <td>
                        <span className="attendance-athlete-name">
                          {a.name}
                          {ageOf(a.birth) !== "-" && ` · ${ageOf(a.birth)} años`}
                        </span>
                      </td>
                      <td>
                        <span className="attendance-plan">
                          {plan?.label ?? "Plan no disponible"}
                        </span>
                      </td>
                      <td>
                        <span className="attendance-remaining">
                          {a.remaining}
                          <span> clases</span>
                          {(a.recoveryCredits ?? 0) > 0 && (
                            <small className="attendance-recovery-credit">
                              · {a.recoveryCredits} recuperativa
                              {a.recoveryCredits === 1 ? "" : "s"}
                            </small>
                          )}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="attendance-time-trigger"
                          onClick={() =>
                            openScheduleEditor(a, plan, schedule)
                          }
                          aria-label={`Gestionar horario de ${a.name}`}
                        >
                          {isPerSession ? (
                            <>
                              <span className="attendance-time-value">
                                {schedule.time || "Definir hora"}
                              </span>
                              <span className="attendance-time-caption">
                                Hora puntual
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="attendance-time-value">
                                {schedule.startTime || schedule.endTime
                                  ? `${schedule.startTime || "—"} – ${schedule.endTime || "—"}`
                                  : "Definir horario"}
                              </span>
                              <span className="attendance-time-caption">
                                Rango horario
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                      <td>
                        <div className="attendance-status-cell">
                          {selectedSlot ? (
                            <SegmentedControl
                              options={OPTIONS}
                              value={statusOf(a)}
                              onChange={(status) =>
                                handleAttendanceChange(a, status)
                              }
                            />
                          ) : (
                            <span className="attendance-schedule-required">
                              Sin registrar
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="attendance-no-slot" role="status">
          {selectedSlot
            ? "No hay atletas agendados en este bloque horario."
            : active.length
              ? "No hay atletas sin horario para esta fecha."
              : "No hay atletas activos para registrar asistencia."}
        </div>
      )}

      {scheduleEditor && (
        <div
          className="date-picker-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setScheduleEditor(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setScheduleEditor(null);
          }}
        >
          <section
            className="date-picker-modal attendance-schedule-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-schedule-title"
          >
            <header className="date-picker-header">
              <div>
                <span className="date-picker-eyebrow"></span>
                <h2 id="attendance-schedule-title">Ajustar horario</h2>
              </div>
              <button
                type="button"
                className="date-picker-close"
                onClick={() => setScheduleEditor(null)}
                aria-label="Cerrar horario"
              >
                ×
              </button>
            </header>

            <div className="date-picker-body">
              <p className="attendance-schedule-athlete">
                {scheduleEditor.athleteName}
                <span>{scheduleEditor.planLabel}</span>
              </p>

              <div className="attendance-schedule-range-fields">
                <label className="attendance-schedule-field">
                  <span>Franja horaria</span>
                  <select
                    className="attendance-schedule-input"
                    value={scheduleEditor.block}
                    onChange={(event) =>
                      setScheduleEditor((current) => ({
                        ...current,
                        block: event.target.value,
                      }))
                    }
                  >
                    {BLOCKS.map((period) => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                </label>
                <label className="attendance-schedule-field">
                  <span>Tipo de sesión</span>
                  <select
                    className="attendance-schedule-input"
                    value={scheduleEditor.sessionType}
                    onChange={(event) =>
                      setScheduleEditor((current) => ({
                        ...current,
                        sessionType: event.target.value,
                      }))
                    }
                  >
                    {SESSION_TYPES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>

              {scheduleEditor.isPerSession ? (
                <label className="attendance-schedule-field">
                  <span>Hora de la sesión</span>
                  <input
                    autoFocus
                    type="time"
                    className="attendance-schedule-input"
                    value={scheduleEditor.time}
                    onChange={(event) =>
                      setScheduleEditor((current) => ({
                        ...current,
                        time: event.target.value,
                      }))
                    }
                  />
                </label>
              ) : (
                <div className="attendance-schedule-range-fields">
                  <label className="attendance-schedule-field">
                    <span>Desde</span>
                    <input
                      autoFocus
                      type="time"
                      className="attendance-schedule-input"
                      value={scheduleEditor.startTime}
                      onChange={(event) =>
                        setScheduleEditor((current) => ({
                          ...current,
                          startTime: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="attendance-schedule-field">
                    <span>Hasta</span>
                    <input
                      type="time"
                      className="attendance-schedule-input"
                      value={scheduleEditor.endTime}
                      onChange={(event) =>
                        setScheduleEditor((current) => ({
                          ...current,
                          endTime: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              )}

              <footer className="attendance-schedule-footer">
                <button
                  type="button"
                  className="attendance-schedule-cancel"
                  onClick={() => setScheduleEditor(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="attendance-schedule-save"
                  onClick={saveSchedule}
                >
                  Guardar
                </button>
              </footer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
