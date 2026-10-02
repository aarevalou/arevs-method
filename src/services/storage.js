import { EMPTY_STATE } from "../utils/constants";

// Guarda y carga los datos usando el puente de Electron (electron/preload.js)
export const loadData = async () => {
  const stored = (await window.db?.load()) ?? EMPTY_STATE;
  return {
    ...EMPTY_STATE,
    ...stored,
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
export const saveData = (state) => window.db?.save(state);
