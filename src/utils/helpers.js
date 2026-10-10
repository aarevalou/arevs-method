import { PLANS } from "./constants";

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const isActive = (a) => a.status === "ACTIVO";
export const ageOf = (birth) => {
  if (!birth) return "-";
  const birthday = new Date(`${birth}T00:00:00`);
  if (Number.isNaN(birthday.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  if (
    today.getMonth() < birthday.getMonth() ||
    (today.getMonth() === birthday.getMonth() &&
      today.getDate() < birthday.getDate())
  ) {
    age -= 1;
  }
  return age < 0 ? "-" : age;
};

const optionalNumber = (value) => {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

export const createAthlete = (form, id, plans = PLANS) => {
  const n = plans[form.plan].sessions;
  return {
    id,
    name: form.name.trim(),
    birth: form.birth,
    heightCm: optionalNumber(form.heightCm),
    weightKg: optionalNumber(form.weightKg),
    club: form.club?.trim() ?? "",
    courtPosition: form.courtPosition?.trim() ?? "",
    dominantFoot: form.dominantFoot ?? "",
    guardian: form.guardian,
    guardianNotApplicable: Boolean(form.guardianNotApplicable),
    phone: form.phone,
    plan: form.plan,
    status: "ACTIVO",
    payment: "PENDIENTE",
    paymentRecords: {},
    recoveryCredits: 0,
    allocated: n,
    remaining: n,
  };
};

// Regla: presente o ausente sin aviso consume la clase; con aviso (24h) se puede reagendar
export const consumesClass = (status) =>
  status === "PRESENTE" || status === "AUSENTE_SIN_AVISO";
export const remainingAfter = (athlete, oldStatus, newStatus) => {
  const delta =
    (consumesClass(newStatus) ? 1 : 0) -
    (oldStatus && consumesClass(oldStatus) ? 1 : 0);
  return Math.min(athlete.allocated, Math.max(0, athlete.remaining - delta));
};

const num = (v) => (v === "" ? null : parseFloat(v));
export const createEvaluation = (athleteId, form, id) => {
  const laps = form.laps
    .split(/[;\s]+/)
    .map((x) => parseFloat(x.replace(",", ".")))
    .filter((x) => !isNaN(x));
  return {
    id,
    athleteId,
    date: form.date,
    circuit: form.circuit,
    laps,
    best: laps.length ? Math.min(...laps) : null,
    longJump: num(form.longJump),
    highJump: num(form.highJump),
    speed: num(form.speed),
  };
};
// Mejora (%) respecto a la marca inicial del MISMO atleta (menos segundos = mejor)
export const improvementVsFirst = (first, current) =>
  first && current ? ((first - current) / first) * 100 : null;

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
export const dashboardMetrics = ({ athletes, sessions, plans = PLANS }, month) => {
  const active = athletes.filter(isActive);
  const monthly = active.filter(
    (athlete) => plans[athlete.plan]?.billingType === "monthly",
  );
  const monthSessions = sessions.filter((s) => s.date.startsWith(month));
  const consumed = monthly.reduce((t, a) => t + a.allocated - a.remaining, 0);
  return {
    active: active.length,
    paidPct: pct(
      active.filter((a) => a.payment === "AL_DIA").length,
      active.length,
    ),
    attendancePct: pct(
      monthSessions.filter((s) => s.status === "PRESENTE").length,
      monthSessions.length,
    ),
    avgConsumed: monthly.length ? (consumed / monthly.length).toFixed(1) : "0",
    pending: active.filter((a) => a.payment !== "AL_DIA"),
  };
};
