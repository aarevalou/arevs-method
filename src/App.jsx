import { useState } from "react";
import { AppProvider } from "./context/AppContext";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import AthletesPage from "./pages/AthletesPage";
import AttendancePage from "./pages/AttendancePage";
import EvaluationsPage from "./pages/EvaluationsPage";

const PAGES = [
  { id: "dashboard", label: "Resumen", component: DashboardPage },
  { id: "athletes", label: "Atletas", component: AthletesPage },
  { id: "attendance", label: "Asistencia", component: AttendancePage },
  { id: "evaluations", label: "Evaluaciones", component: EvaluationsPage },
];

export default function App() {
  const [current, setCurrent] = useState(PAGES[0].id);
  const [athletePaymentFilter, setAthletePaymentFilter] = useState("TODOS");
  const Page = PAGES.find((p) => p.id === current).component;
  const viewPendingPayments = () => {
    setAthletePaymentFilter("PENDIENTE");
    setCurrent("athletes");
  };
  return (
    <AppProvider>
      <Layout pages={PAGES} current={current} onChange={setCurrent}>
        <Page
          onViewPendingPayments={viewPendingPayments}
          paymentFilter={athletePaymentFilter}
          onPaymentFilterChange={setAthletePaymentFilter}
        />
      </Layout>
    </AppProvider>
  );
}
