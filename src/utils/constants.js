export const PLANS = {
  MENSUAL_DUPLA: { label: "Mensual (dupla)", sessions: 8, price: 48000 },
  SESION_UNICA: { label: "Sesión única", sessions: 1, price: 8000 },
  DOMICILIO: { label: "Domicilio", sessions: 1, price: 15000 },
};
export const BLOCKS = ["AM", "PM", "RECUPERACION", "DOMICILIO"];
export const ATTENDANCE = {
  PRESENTE: {
    label: "Presente",
    tone: "ok",
    description: "Asistió; consume una clase del plan.",
  },
  AUSENTE_CON_AVISO: {
    label: "Aviso 24h",
    tone: "warn",
    description: "Avisó con al menos 24 horas; conserva la clase del plan.",
  },
  AUSENTE_SIN_AVISO: {
    label: "Sin aviso",
    tone: "bad",
    description: "No asistió sin aviso; consume una clase del plan.",
  },
};
export const PAYMENT = {
  AL_DIA: "Al día",
  PENDIENTE: "Pendiente",
};
export const EMPTY_STATE = { athletes: [], sessions: [], logs: [] };
