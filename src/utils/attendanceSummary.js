const monthLabel = (month) => {
  const [year, number] = month.split("-");
  return new Date(Number(year), Number(number) - 1, 1).toLocaleDateString(
    "es-CL",
    { month: "long", year: "numeric" },
  );
};

export const classifyAbsenceNotice = (scheduledStartAt, noticeAt) => {
  const scheduledAt = new Date(scheduledStartAt).getTime();
  const notifiedAt = new Date(noticeAt).getTime();
  if (!Number.isFinite(scheduledAt) || !Number.isFinite(notifiedAt)) {
    throw new Error("Indica una hora válida para la sesión y para el aviso.");
  }
  return scheduledAt - notifiedAt >= 24 * 60 * 60 * 1000
    ? "AUSENTE_CON_AVISO"
    : "AUSENTE_SIN_AVISO";
};

export const scheduleStartTime = (schedule) =>
  schedule?.time || schedule?.startTime || "";

const LEGACY_SESSION_TYPES = ["RECUPERACION", "DOMICILIO"];
export const schedulePeriod = (schedule) => {
  if (schedule?.period === "AM" || schedule?.period === "PM") {
    return schedule.period;
  }
  if (schedule?.block === "SIN_FRANJA") return "SIN_FRANJA";
  if (schedule?.block === "AM" || schedule?.block === "PM") {
    return schedule.block;
  }
  return LEGACY_SESSION_TYPES.includes(schedule?.block) ? "SIN_FRANJA" : "";
};

export const scheduleSessionType = (schedule) => {
  if (schedule?.sessionType) return schedule.sessionType;
  return LEGACY_SESSION_TYPES.includes(schedule?.block)
    ? schedule.block
    : "NORMAL";
};

export const scheduleSlotKey = (schedule) => {
  const start = scheduleStartTime(schedule);
  const period = schedulePeriod(schedule);
  const sessionType = scheduleSessionType(schedule);
  if (!period || !sessionType || !start) return "";
  const end = schedule.time ? "" : (schedule.endTime ?? "");
  return `${period}|${sessionType}|${start}|${end}`;
};

export const scheduleSlotLabel = (schedule) => {
  const start = scheduleStartTime(schedule);
  if (!start) return "";
  const timeRange = schedule.time
    ? `${schedule.time} (hora puntual)`
    : `${start} – ${schedule.endTime || "sin hora de término"}`;
  const period = schedulePeriod(schedule);
  const periodLabel = {
    AM: "AM",
    PM: "PM",
    SIN_FRANJA: "Franja anterior sin especificar",
  }[period] ?? period;
  const typeLabel = {
    NORMAL: "Sesión normal",
    RECUPERACION: "Recuperación",
    DOMICILIO: "Domicilio",
  }[scheduleSessionType(schedule)] ?? scheduleSessionType(schedule);
  return `${timeRange} · ${periodLabel} · ${typeLabel}`;
};

export const getClosedAbsenceNotes = (
  athlete,
  sessions,
  plans,
  currentMonth,
) => {
  const athleteSessions = sessions.filter(
    (session) => session.athleteId === athlete.id,
  );
  const defaultBillingType = plans[athlete.plan]?.billingType;
  const monthlySessions = athleteSessions.filter(
    (session) =>
      (session.billingType ?? defaultBillingType) === "monthly",
  );
  const completedMonths = new Map();
  monthlySessions
    .filter(
      (session) =>
        session.sessionType !== "RECUPERACION" &&
        session.block !== "RECUPERACION" &&
        session.status === "AUSENTE_SIN_AVISO" &&
        session.date.slice(0, 7) < currentMonth,
    )
    .forEach((session) => {
      const month = session.date.slice(0, 7);
      completedMonths.set(month, (completedMonths.get(month) ?? 0) + 1);
    });
  const monthlyNotes = [...completedMonths].map(([month, count]) => ({
      key: `${athlete.id}-${month}`,
      message: `El ciclo de ${monthLabel(month)} concluyó con ${
        count === 1 ? "una sesión menos efectuada" : `${count} sesiones menos efectuadas`
      } por inasistencia sin aviso previo.`,
  }));

  const packageNotes = athleteSessions
    .filter(
      (session) =>
        session.cycleClosedWithoutNotice ||
        (session.sessionType !== "RECUPERACION" &&
          session.block !== "RECUPERACION" &&
          (session.billingType ?? defaultBillingType) === "per_session" &&
          session.status === "AUSENTE_SIN_AVISO"),
    )
    .map((session) => ({
      key: `${athlete.id}-${session.id}`,
      message: `El ciclo concluyó con una sesión menos efectuada por inasistencia sin aviso previo (${session.date}).`,
    }));
  return [...monthlyNotes, ...packageNotes];
};
