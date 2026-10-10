import { useState } from "react";
import { AppProvider } from "./context/AppContext";
import { useApp } from "./context/AppContext";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import AthletesPage from "./pages/AthletesPage";
import AttendancePage from "./pages/AttendancePage";
import EvaluationsPage from "./pages/EvaluationsPage";
import PhysicalAssessmentsPage from "./pages/PhysicalAssessmentsPage";

const PAGES = [
  { id: "dashboard", label: "Resumen", component: DashboardPage },
  { id: "athletes", label: "Atletas", component: AthletesPage },
  { id: "attendance", label: "Asistencia", component: AttendancePage },
  { id: "evaluations", label: "Circuitos", component: EvaluationsPage },
  {
    id: "physical-assessments",
    label: "Evaluaciones",
    component: PhysicalAssessmentsPage,
  },
];

function AppContent() {
  const { user, signOut } = useApp();
  const [current, setCurrent] = useState(PAGES[0].id);
  const [athletePaymentFilter, setAthletePaymentFilter] = useState("TODOS");
  const Page = PAGES.find((p) => p.id === current).component;
  const viewPendingPayments = () => {
    setAthletePaymentFilter("PENDIENTE");
    setCurrent("athletes");
  };
  return (
    <Layout
      pages={PAGES}
      current={current}
      onChange={setCurrent}
      userEmail={user.email}
      onSignOut={signOut}
    >
      <Page
        onViewPendingPayments={viewPendingPayments}
        paymentFilter={athletePaymentFilter}
        onPaymentFilterChange={setAthletePaymentFilter}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
