import { lazy, Suspense, useState } from "react";
import { useApp } from "../context/AppContext";
import { PageHeader, StatCard } from "../components/UI";
import { PLANS } from "../utils/constants";
import { dashboardMetrics, isActive, todayISO } from "../utils/helpers";
import { getPaymentDetails, summarizePayments } from "../utils/payments";

const DashboardCharts = lazy(() => import("../components/DashboardCharts"));

const formatCurrency = (amount) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);

const recentMonths = (count) => {
  const today = new Date(`${todayISO()}T00:00:00`);
  return Array.from({ length: count }, (_, index) => {
    const monthDate = new Date(
      today.getFullYear(),
      today.getMonth() - count + index + 1,
      1,
    );
    const key = `${monthDate.getFullYear()}-${String(
      monthDate.getMonth() + 1,
    ).padStart(2, "0")}`;
    return {
      key,
      label: monthDate
        .toLocaleDateString("es-CL", { month: "short" })
        .replace(".", ""),
    };
  });
};

const monthlyTrends = (sessions, athletes) => {
  const months = recentMonths(6);
  const collections = new Map(months.map(({ key }) => [key, 0]));

  athletes.forEach((athlete) => {
    Object.values(athlete.paymentRecords ?? {}).forEach((record) => {
      if (!record.paid || !record.paidAt) return;
      const month = record.paidAt.slice(0, 7);
      if (collections.has(month)) {
        collections.set(
          month,
          collections.get(month) + (Number(record.amount) || 0),
        );
      }
    });
  });

  return months.map(({ key, label }) => {
    const monthSessions = sessions.filter((session) =>
      session.date.startsWith(key),
    );
    const present = monthSessions.filter(
      (session) => session.status === "PRESENTE",
    ).length;
    return {
      key,
      month: label,
      attendance: monthSessions.length
        ? Math.round((present / monthSessions.length) * 100)
        : 0,
      sessionCount: monthSessions.length,
      collected: collections.get(key) ?? 0,
    };
  });
};

export default function DashboardPage({ onViewPendingPayments }) {
  const { state } = useApp();
  const [pendingSort, setPendingSort] = useState("AMOUNT");
  const currentMonth = todayISO().slice(0, 7);
  const metrics = dashboardMetrics(state, currentMonth);
  const activeAthletes = state.athletes.filter(isActive);
  const payments = summarizePayments(
    activeAthletes,
    state.sessions,
    currentMonth,
  );
  const allCharges = activeAthletes.flatMap(
    (athlete) =>
      getPaymentDetails(athlete, state.sessions, currentMonth).charges,
  );
  const paidCharges = allCharges.filter((charge) => charge.paid).length;
  const collectionRate = allCharges.length
    ? Math.round((paidCharges / allCharges.length) * 100)
    : null;
  const monthSessionCount = state.sessions.filter((session) =>
    session.date.startsWith(currentMonth),
  ).length;
  const trends = monthlyTrends(state.sessions, state.athletes);
  const pendingAthletes = activeAthletes
    .map((athlete) => {
      const charges = getPaymentDetails(
        athlete,
        state.sessions,
        currentMonth,
      ).charges;
      const pending = charges.filter((charge) => !charge.paid);
      return {
        id: athlete.id,
        name: athlete.name,
        plan: athlete.plan,
        chargeCount: pending.length,
        amount: pending.reduce((total, charge) => total + charge.amount, 0),
      };
    })
    .filter((athlete) => athlete.chargeCount > 0)
    .sort((first, second) =>
      pendingSort === "NAME"
        ? first.name.localeCompare(second.name, "es-CL")
        : second.amount - first.amount,
    );
  const stats = [
    ["Atletas activos", metrics.active],
    [
      "Asistencia este mes",
      monthSessionCount ? `${metrics.attendancePct}%` : "—",
    ],
    ["Sesiones registradas", monthSessionCount],
    ["Saldo por cobrar", formatCurrency(payments.pendingAmount)],
  ];

  return (
    <div className="dashboard-page">
      <PageHeader title="Resumen" />
      <div className="row g-2 dashboard-stats">
        {stats.map(([label, value]) => (
          <div className="col-6 col-lg-3" key={label}>
            <StatCard label={label} value={value} />
          </div>
        ))}
      </div>

      <Suspense
        fallback={
          <div className="dashboard-charts-loading" aria-live="polite">
            Cargando tendencias…
          </div>
        }
      >
        <DashboardCharts data={trends} />
      </Suspense>

      <section
        className="dashboard-pending-section"
        aria-labelledby="dashboard-pending-title"
      >
        <div className="dashboard-section-heading dashboard-pending-heading">
          <div>
            <h2 id="dashboard-pending-title">Pagos pendientes</h2>
          </div>
          <div className="dashboard-pending-actions">
            <select
              className="form-select dashboard-sort"
              value={pendingSort}
              onChange={(event) => setPendingSort(event.target.value)}
              aria-label="Ordenar saldos pendientes"
            >
              <option value="AMOUNT">Mayor saldo</option>
              <option value="NAME">Nombre A-Z</option>
            </select>
          </div>
        </div>
        <div className="dashboard-table-wrapper">
          <table className="table align-middle dashboard-pending-table">
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Plan</th>
                <th>Cargos pendientes</th>
                <th className="text-end">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {pendingAthletes.length ? (
                pendingAthletes.slice(0, 8).map((athlete) => (
                  <tr key={athlete.id}>
                    <td>{athlete.name}</td>
                    <td>{PLANS[athlete.plan].label}</td>
                    <td>{athlete.chargeCount}</td>
                    <td className="text-end">
                      {formatCurrency(athlete.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="dashboard-empty-row">
                    No hay saldos pendientes para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pendingAthletes.length > 8 && (
          <p className="dashboard-table-note">
            Mostrando 8 de {pendingAthletes.length} atletas con saldo pendiente.
          </p>
        )}
      </section>
    </div>
  );
}
