import { useState } from "react";
import logo from '../assets/logo.png'
import settingsIcon from "../assets/ajuste2.svg";
import PlansManagementModal from "./PlansManagementModal";

export default function Layout({
  pages,
  current,
  onChange,
  children,
  userEmail,
  onSignOut,
}) {
  const [showPlans, setShowPlans] = useState(false);
  return (
    <>
      <div className={`av-shell${current === "evaluations" ? " circuit-shell" : ""}`}>
        <header className="av-header d-flex align-items-center gap-4 px-4">
          <div className="d-flex align-items-center gap-2 py-2">
            <img src={logo} alt="" className="av-logo" />
            <strong className="av-brand">Arevs Method</strong>
          </div>
          <nav className="av-nav d-flex flex-grow-1">
            {pages.map((p) => (
              <button key={p.id} className={p.id === current ? 'active' : ''} onClick={() => onChange(p.id)}>{p.label}</button>
            ))}
          </nav>
          <button
            type="button"
            className="av-settings-button"
            onClick={() => setShowPlans(true)}
            aria-label="Abrir configuración"
            title="Configuración"
          >
            <span
              className="av-settings-icon"
              style={{ "--av-settings-icon": `url("${settingsIcon}")` }}
              aria-hidden="true"
            />
          </button>
        </header>
        <main className="container-fluid p-0">
          <div className="av-view-content p-4">{children}</div>
        </main>
      </div>
      {showPlans && (
        <PlansManagementModal
          onClose={() => setShowPlans(false)}
          onSignOut={onSignOut}
          userEmail={userEmail}
        />
      )}
    </>
  )
}
