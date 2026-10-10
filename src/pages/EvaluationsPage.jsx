import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import CircuitDesigner from "../components/CircuitDesigner";
import { EmptyState, PageHeader } from "../components/UI";
import { ATTENDANCE } from "../utils/constants";

const CircuitIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6v4a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v2M18 6v2a3 3 0 0 1-3 3h-2" />
    <circle cx="6" cy="5" r="2" />
    <circle cx="18" cy="5" r="2" />
    <circle cx="18" cy="20" r="2" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

const formatDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const makeId = () => crypto.randomUUID();

export default function EvaluationsPage() {
  const { state, actions } = useApp();
  const [designerOpen, setDesignerOpen] = useState(false);
  const [editingCircuit, setEditingCircuit] = useState(null);
  const [targetSessionId, setTargetSessionId] = useState("");

  const sessions = useMemo(
    () =>
      [...state.sessions].sort(
        (first, second) =>
          second.date.localeCompare(first.date) ||
          (first.block ?? "").localeCompare(second.block ?? ""),
      ).filter((session) =>
        state.athletes.some((athlete) => athlete.id === session.athleteId),
      ),
    [state.sessions, state.athletes],
  );

  const openNewCircuit = (sessionId = "") => {
    setEditingCircuit(null);
    setTargetSessionId(sessionId);
    setDesignerOpen(true);
  };

  const handleDesignerSave = ({ type, value }) => {
    if (type === "exercise") {
      actions.saveExercise(value);
      return;
    }
    if (type === "deleteExercise") {
      actions.deleteExercise(value);
      return;
    }
    actions.saveCircuit(value);
    if (targetSessionId) {
      actions.assignCircuitToSession(targetSessionId, value.id);
    }
    setDesignerOpen(false);
    setEditingCircuit(null);
    setTargetSessionId("");
  };

  const chooseCircuit = (sessionId, selected) => {
    if (selected === "create") {
      openNewCircuit(sessionId);
      return;
    }
    actions.assignCircuitToSession(sessionId, selected);
  };

  return (
    <div className="circuit-page">
      <PageHeader title="Circuitos de entrenamiento">
        <button
          type="button"
          className="circuit-primary-button"
          onClick={() => openNewCircuit()}
        >
          <span aria-hidden="true">+</span> Diseñar circuito
        </button>
      </PageHeader>

      <section className="circuit-library-section">
        <div className="circuit-section-heading">
          <div>
            <h2>Circuitos guardados</h2>
          </div>
          <span className="circuit-library-count">
            {state.circuits.length} {state.circuits.length === 1 ? "circuito" : "circuitos"}
          </span>
        </div>
        {state.circuits.length ? (
          <div className="circuit-library-grid">
            {state.circuits.map((circuit) => (
              <article className="circuit-library-card" key={circuit.id}>
                <div className="circuit-library-icon"><CircuitIcon /></div>
                <div className="circuit-library-info">
                  <h3>{circuit.name}</h3>
                  <p>
                    {circuit.nodes.length} {circuit.nodes.length === 1 ? "ejercicio" : "ejercicios"}
                    <span>·</span>
                    Meta {circuit.finishAtStart ? "en la salida" : "al final"}
                  </p>
                </div>
                <button
                  type="button"
                  className="circuit-secondary-button"
                  onClick={() => {
                    setTargetSessionId("");
                    setEditingCircuit(circuit);
                    setDesignerOpen(true);
                  }}
                >
                  Editar
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="circuit-library-empty">
            <strong>Aún no tienes circuitos guardados</strong>
            <span>Diseña uno para asignarlo a las sesiones de tus atletas.</span>
            <button
              type="button"
              className="circuit-secondary-button"
              onClick={() => openNewCircuit()}
            >
              Crear primer circuito
            </button>
          </div>
        )}
      </section>

      <section className="circuit-sessions-section">
        <div className="circuit-section-heading">
          <div>
            <h2>Sesiones de atletas</h2>
          </div>
          <span className="circuit-library-count">
            {sessions.length} {sessions.length === 1 ? "sesión" : "sesiones"}
          </span>
        </div>

        {sessions.length ? (
          <div className="circuit-sessions-table-wrapper">
            <table className="circuit-sessions-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Atleta</th>
                  <th>Horario</th>
                  <th>Asistencia</th>
                  <th>Circuito asignado</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const athlete = state.athletes.find(
                    (item) => item.id === session.athleteId,
                  );
                  const schedule = state.schedules.find(
                    (item) =>
                      item.athleteId === session.athleteId &&
                      item.date === session.date &&
                      item.block === session.block,
                  );
                  const time = schedule?.time
                    ? schedule.time
                    : schedule?.startTime || schedule?.endTime
                      ? `${schedule.startTime || "—"}–${schedule.endTime || "—"}`
                      : session.block || "—";

                  return (
                    <tr key={session.id}>
                      <td className="circuit-session-date">
                        {formatDate(session.date)}
                      </td>
                      <td>
                        <span className="circuit-session-athlete">
                          {athlete?.name ?? "Atleta eliminado"}
                        </span>
                      </td>
                      <td>{time}</td>
                      <td>
                        <span
                          className={`circuit-session-status tone-${ATTENDANCE[session.status]?.tone ?? "gold"}`}
                        >
                          {ATTENDANCE[session.status]?.label ?? session.status}
                        </span>
                      </td>
                      <td>
                        <div className="circuit-assignment-control">
                          <select
                            className="form-select"
                            value={session.circuitId ?? ""}
                            onChange={(event) =>
                              chooseCircuit(session.id, event.target.value)
                            }
                            aria-label={`Circuito para sesión de ${athlete?.name ?? "atleta"} del ${formatDate(session.date)}`}
                          >
                            <option value="">Sin circuito asignado</option>
                            {state.circuits.map((circuit) => (
                              <option key={circuit.id} value={circuit.id}>
                                {circuit.name}
                              </option>
                            ))}
                            <option value="create">+ Crear circuito nuevo</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>
            Aún no hay sesiones registradas. Registra la asistencia para asignar circuitos.
          </EmptyState>
        )}
      </section>

      {designerOpen && (
        <div
          className="circuit-designer-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDesignerOpen(false);
              setTargetSessionId("");
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setDesignerOpen(false);
              setTargetSessionId("");
            }
          }}
        >
          <section
            className="circuit-designer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="circuit-designer-title"
          >
            <header className="circuit-modal-header">
              <div>
                <span className="date-picker-eyebrow">PLANIFICACIÓN DE SESIONES</span>
                <h2 id="circuit-designer-title">
                  {editingCircuit ? "Editar circuito" : "Diseñar circuito"}
                </h2>
              </div>
              <button
                type="button"
                className="date-picker-close"
                onClick={() => {
                  setDesignerOpen(false);
                  setTargetSessionId("");
                }}
                aria-label="Cerrar diseñador"
              >
                ×
              </button>
            </header>
            <div className="circuit-designer-modal-body">
              <CircuitDesigner
                key={editingCircuit?.id ?? "new"}
                circuit={editingCircuit}
                exercises={state.exercises}
                savedCircuits={state.circuits}
                onSave={handleDesignerSave}
                onCancel={() => {
                  setDesignerOpen(false);
                  setTargetSessionId("");
                }}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
