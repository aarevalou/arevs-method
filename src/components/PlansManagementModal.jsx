import { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  normalizePhysicalMetrics,
  PHYSICAL_METRICS,
} from "../utils/physicalAssessments";
import { DeleteIcon, EditIcon } from "./UI";

const EMPTY_PLAN = {
  label: "",
  billingType: "",
  sessions: "",
  frequency: "",
  price: "",
};
const EDITABLE_FIELDS = [
  "label",
  "billingType",
  "sessions",
  "frequency",
  "price",
];
const FIELD_LABELS = {
  label: "Nombre del plan",
  billingType: "Modalidad de cobro",
  sessions: "Sesiones",
  frequency: "Frecuencia semanal",
  price: "Precio por jugador",
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);

const createPlanId = (label) =>
  `${
    label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "PLAN"
  }_${crypto.randomUUID()}`;

const CloseIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="m5 5 10 10M15 5 5 15" />
  </svg>
);

const AssessmentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4.5V3h6v1.5M8.5 10h7M8.5 14h2l1.5 2 3.5-4" />
  </svg>
);

export default function PlansManagementModal({
  onClose,
  onSignOut,
  userEmail,
}) {
  const { state, actions } = useApp();
  const [activeSection, setActiveSection] = useState("display");
  const activeAssessmentMetrics =
    state.settings?.assessmentMetrics ?? PHYSICAL_METRICS;
  const [assessmentMetrics, setAssessmentMetrics] = useState(() =>
    activeAssessmentMetrics.map((metric) => ({ ...metric })),
  );
  const [editingCell, setEditingCell] = useState(null);
  const [cellValue, setCellValue] = useState("");
  const [newPlan, setNewPlan] = useState(null);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [error, setError] = useState("");
  const [zoomError, setZoomError] = useState("");
  const [confirmingAction, setConfirmingAction] = useState(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [settingsNotice, setSettingsNotice] = useState("");
  const [assessmentError, setAssessmentError] = useState("");
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const plans = Object.entries(state.plans);
  const zoomFactor = state.settings?.zoomFactor ?? 1.1;
  const theme = state.settings?.theme === "light" ? "light" : "dark";
  const paidPaymentCount = state.athletes.reduce(
    (total, athlete) =>
      total +
      Object.values(athlete.paymentRecords ?? {}).filter(
        (record) => record.paid,
      ).length +
      (athlete.payment === "AL_DIA" &&
      !Object.keys(athlete.paymentRecords ?? {}).length
        ? 1
        : 0),
    0,
  );
  const assessmentMetricsChanged =
    JSON.stringify(assessmentMetrics) !==
    JSON.stringify(activeAssessmentMetrics);

  const updateZoom = async (nextFactor) => {
    const boundedFactor = Math.min(
      1.5,
      Math.max(0.8, Math.round(nextFactor * 10) / 10),
    );
    try {
      if (window.db?.setZoomFactor) {
        await window.db.setZoomFactor(boundedFactor);
      } else {
        document.documentElement.style.zoom = String(boundedFactor);
      }
      actions.updateSettings({ zoomFactor: boundedFactor });
      setZoomError("");
    } catch (zoomSaveError) {
      console.error(
        "No se pudo actualizar el zoom de la aplicación.",
        zoomSaveError,
      );
      setZoomError(
        "No se pudo aplicar el nivel de zoom. Inténtalo nuevamente.",
      );
    }
  };

  const confirmSettingsAction = () => {
    if (confirmingAction === "payments") {
      actions.clearPaymentHistory();
      setSettingsNotice(
        "Se borraron las marcas de pago y sus fechas. Los cobros aplicables quedaron pendientes.",
      );
    } else if (confirmingAction === "metrics") {
      const savedMetrics = normalizePhysicalMetrics(assessmentMetrics);
      actions.saveAssessmentMetrics(savedMetrics);
      setAssessmentMetrics(savedMetrics);
      setSettingsNotice(
        "Se actualizaron las pruebas. Los progresos anteriores se eliminaron.",
      );
    } else if (confirmingAction === "all" && confirmationText === "eliminar") {
      actions.resetAllData();
      onClose();
    }
    setConfirmingAction(null);
    setConfirmationText("");
  };

  const confirmSignOut = async () => {
    setSigningOut(true);
    setSignOutError("");
    try {
      await onSignOut();
      onClose();
    } catch (signOutActionError) {
      setSignOutError(
        signOutActionError.message || "No se pudo cerrar la sesión.",
      );
    } finally {
      setSigningOut(false);
    }
  };

  const updateAssessmentMetric = (key, field, value) => {
    setAssessmentMetrics((current) =>
      current.map((metric) =>
        metric.key === key ? { ...metric, [field]: value } : metric,
      ),
    );
    setAssessmentError("");
    setSettingsNotice("");
  };

  const addAssessmentMetric = () => {
    setAssessmentMetrics((current) => [
      ...current,
      {
        key: `custom_${crypto.randomUUID()}`,
        label: "",
        unit: "cm",
        direction: "higher",
        optional: true,
      },
    ]);
    setAssessmentError("");
    setSettingsNotice("");
  };

  const removeAssessmentMetric = (key) => {
    setAssessmentMetrics((current) =>
      current.filter((metric) => metric.key !== key),
    );
    setAssessmentError("");
    setSettingsNotice("");
  };

  const requestSaveAssessmentMetrics = () => {
    if (!assessmentMetrics.length) {
      setAssessmentError("Debe quedar al menos una prueba de evaluación.");
      return;
    }
    if (
      assessmentMetrics.some(
        (metric) => !metric.label.trim() || !metric.unit.trim(),
      )
    ) {
      setAssessmentError("Completa el nombre y la unidad de cada prueba.");
      return;
    }
    const labels = assessmentMetrics.map((metric) =>
      metric.label.trim().toLocaleLowerCase("es-CL"),
    );
    if (new Set(labels).size !== labels.length) {
      setAssessmentError("Cada prueba debe tener un nombre diferente.");
      return;
    }
    setAssessmentError("");
    setSettingsNotice("");
    setConfirmingAction("metrics");
  };

  const startEditing = (id, field, value) => {
    if (newPlan) return;
    if (editingCell?.id === id && editingCell.field === field) {
      saveCell(id, field);
      return;
    }
    setEditingCell({ id, field });
    setCellValue(String(value ?? ""));
    setError("");
  };

  const saveCell = (id, field) => {
    const plan = state.plans[id];
    let value = cellValue;
    if (field === "label" || field === "frequency") value = value.trim();
    if (field === "sessions" || field === "price") value = Number(value);

    if (
      ((field === "label" || field === "frequency") && !value) ||
      (field === "sessions" && (!Number.isInteger(value) || value < 1)) ||
      (field === "price" && (!Number.isInteger(value) || value < 1))
    ) {
      setError(
        `Ingresa un valor válido para ${FIELD_LABELS[field].toLocaleLowerCase("es-CL")}.`,
      );
      return;
    }

    actions.savePlan(id, { ...plan, [field]: value });
    setEditingCell(null);
    setCellValue("");
    setError("");
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
    setCellValue("");
    setError("");
  };

  const openNewPlan = () => {
    setEditingCell(null);
    setCellValue("");
    setNewPlan({ ...EMPTY_PLAN });
    setError("");
  };

  const cancelNewPlan = () => {
    setNewPlan(null);
    setError("");
  };

  const updateNewPlan = (field, value) => {
    setNewPlan((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const confirmNewPlan = () => {
    const label = newPlan.label.trim();
    const frequency = newPlan.frequency.trim();
    const sessions = Number(newPlan.sessions);
    const price = Number(newPlan.price);
    if (
      !label ||
      !newPlan.billingType ||
      !frequency ||
      !Number.isInteger(sessions) ||
      sessions < 1 ||
      !Number.isInteger(price) ||
      price < 1
    ) {
      setError(
        "Completa todos los campos con valores válidos antes de confirmar el plan.",
      );
      return;
    }
    actions.savePlan(createPlanId(label), {
      label,
      billingType: newPlan.billingType,
      sessions,
      frequency,
      price,
    });
    setNewPlan(null);
    setError("");
  };

  const requestDeletePlan = (id, label) => {
    const inUse = state.athletes.some((athlete) => athlete.plan === id);
    if (inUse) return;
    setPlanToDelete({ id, label });
  };

  const confirmDeletePlan = () => {
    if (!planToDelete) return;
    const stillInUse = state.athletes.some(
      (athlete) => athlete.plan === planToDelete.id,
    );
    if (!stillInUse) actions.deletePlan(planToDelete.id);
    setPlanToDelete(null);
  };

  const renderValue = (id, plan, field) => {
    const value = plan[field];
    const isEditing = editingCell?.id === id && editingCell.field === field;
    const displayValue =
      field === "billingType"
        ? value === "monthly"
          ? "Mensual"
          : "Por sesión"
        : field === "sessions"
          ? `${value} ${value === 1 ? "sesión" : "sesiones"}`
          : field === "price"
            ? formatCurrency(value)
            : value || (field === "frequency" ? "Sin definir" : value);

    return (
      <div className={`plans-cell-editor${isEditing ? " is-editing" : ""}`}>
        {isEditing ? (
          field === "billingType" ? (
            <select
              autoFocus
              className="plans-inline-input"
              aria-label={`Editar ${FIELD_LABELS[field]}`}
              value={cellValue}
              onChange={(event) => setCellValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveCell(id, field);
                if (event.key === "Escape") cancelCellEdit();
              }}
            >
              <option value="monthly">Mensual</option>
              <option value="per_session">Por sesión</option>
            </select>
          ) : (
            <input
              autoFocus
              className="plans-inline-input"
              aria-label={`Editar ${FIELD_LABELS[field]}`}
              type={
                field === "sessions" || field === "price" ? "number" : "text"
              }
              min={field === "sessions" || field === "price" ? "1" : undefined}
              step={field === "sessions" || field === "price" ? "1" : undefined}
              maxLength={
                field === "label" ? 60 : field === "frequency" ? 50 : undefined
              }
              value={cellValue}
              onChange={(event) => setCellValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveCell(id, field);
                if (event.key === "Escape") cancelCellEdit();
              }}
            />
          )
        ) : (
          <span className={field === "price" ? "plans-price-value" : ""}>
            {displayValue}
          </span>
        )}
        <button
          type="button"
          className={`plans-edit-button${isEditing ? " is-confirm" : ""}`}
          onClick={() => startEditing(id, field, value)}
          aria-label={`${isEditing ? "Confirmar" : "Editar"} ${FIELD_LABELS[field]}${!isEditing ? ` de ${plan.label}` : ""}`}
          title={
            isEditing ? "Confirmar cambios" : `Editar ${FIELD_LABELS[field]}`
          }
        >
          <EditIcon checked={isEditing} />
        </button>
      </div>
    );
  };

  const renderNewPlanField = (field) => {
    const label = FIELD_LABELS[field];
    const isSelect = field === "billingType";
    const type = field === "sessions" || field === "price" ? "number" : "text";
    return (
      <label className="plans-new-field">
        <span>
          {label}
          <i aria-hidden="true">*</i>
        </span>
        {isSelect ? (
          <select
            className="plans-inline-input"
            value={newPlan[field]}
            onChange={(event) => updateNewPlan(field, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") confirmNewPlan();
            }}
            required
          >
            <option value="" disabled>
              Selecciona una modalidad
            </option>
            <option value="monthly">Mensual</option>
            <option value="per_session">Por sesión</option>
          </select>
        ) : (
          <input
            className="plans-inline-input"
            type={type}
            min={type === "number" ? "1" : undefined}
            step={type === "number" ? "1" : undefined}
            maxLength={
              field === "label" ? 60 : field === "frequency" ? 50 : undefined
            }
            placeholder={
              field === "label"
                ? "Ej.: Plan mensual competitivo"
                : field === "sessions"
                  ? "Ej.: 8"
                  : field === "frequency"
                    ? "Ej.: 2 veces por semana"
                    : field === "price"
                      ? "Ej.: 50000"
                      : ""
            }
            value={newPlan[field]}
            onChange={(event) => updateNewPlan(field, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") confirmNewPlan();
            }}
            required
          />
        )}
      </label>
    );
  };

  return (
    <div
      className="athlete-modal-backdrop plans-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="athlete-modal plans-management-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plans-management-title"
      >
        <header className="plans-modal-header">
          <div className="plans-modal-title-wrap">
            <div>
              <h4 id="plans-management-title">Configuración</h4>
              <p>
                Administra los planes y ajusta la visualización de la
                aplicación.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="plans-close-button"
            onClick={onClose}
            aria-label="Cerrar configuración"
          >
            ×
          </button>
        </header>

        <div className="settings-management-layout">
          <nav className="settings-nav" aria-label="Secciones de configuración">
            <button
              type="button"
              aria-current={activeSection === "display" ? "page" : undefined}
              className={activeSection === "display" ? "is-active" : ""}
              onClick={() => setActiveSection("display")}
            >
              <span aria-hidden="true">◉</span>
              Visualización
            </button>
            <button
              type="button"
              aria-current={activeSection === "plans" ? "page" : undefined}
              className={activeSection === "plans" ? "is-active" : ""}
              onClick={() => setActiveSection("plans")}
            >
              <span aria-hidden="true">▤</span>
              Planes y precios
            </button>

            <button
              type="button"
              aria-current={
                activeSection === "evaluations" ? "page" : undefined
              }
              className={activeSection === "evaluations" ? "is-active" : ""}
              onClick={() => setActiveSection("evaluations")}
            >
              <span className="settings-nav-icon">
                <AssessmentIcon />
              </span>
              Evaluaciones
            </button>
            <button
              type="button"
              aria-current={activeSection === "rules" ? "page" : undefined}
              className={activeSection === "rules" ? "is-active" : ""}
              onClick={() => setActiveSection("rules")}
            >
              <span aria-hidden="true">✓</span>
              Reglas del sistema
            </button>
            <button
              type="button"
              className="settings-signout"
              onClick={() => {
                setSignOutError("");
                setConfirmingSignOut(true);
              }}
            >
              <span className="settings-signout-icon" aria-hidden="true">
                ↪
              </span>
              Cerrar sesión
            </button>
          </nav>

          <div className="plans-management-body">
            {activeSection === "plans" && (
              <>
                <div className="plans-section-heading">
                  <div>
                    <h5>
                      Planes disponibles <span>{plans.length}</span>
                    </h5>
                  </div>
                  {!newPlan && (
                    <button
                      type="button"
                      className="plans-add-button"
                      onClick={openNewPlan}
                    >
                      <span aria-hidden="true">+</span> Crear plan
                    </button>
                  )}
                </div>

                {error && (
                  <p className="plans-form-error" role="alert">
                    {error}
                  </p>
                )}

                <div className="plans-table-wrap">
                  <table className="plans-table">
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Modalidad</th>
                        <th>Sesiones</th>
                        <th>Frecuencia</th>
                        <th>Precio por jugador</th>
                        <th>
                          <span className="visually-hidden">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {newPlan && (
                        <tr className="plans-new-row">
                          <td>{renderNewPlanField("label")}</td>
                          <td>{renderNewPlanField("billingType")}</td>
                          <td>{renderNewPlanField("sessions")}</td>
                          <td>{renderNewPlanField("frequency")}</td>
                          <td>{renderNewPlanField("price")}</td>
                          <td>
                            <div className="plans-row-actions">
                              <button
                                type="button"
                                className="plans-confirm-button"
                                onClick={confirmNewPlan}
                                aria-label="Confirmar nuevo plan"
                                title="Confirmar plan"
                              >
                                <EditIcon checked />
                              </button>
                              <button
                                type="button"
                                className="plans-cancel-button"
                                onClick={cancelNewPlan}
                                aria-label="Cancelar nuevo plan"
                                title="Cancelar"
                              >
                                <CloseIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {plans.map(([id, plan]) => {
                        const inUse = state.athletes.some(
                          (athlete) => athlete.plan === id,
                        );
                        return (
                          <tr key={id}>
                            {EDITABLE_FIELDS.map((field) => (
                              <td key={field}>
                                {renderValue(id, plan, field)}
                              </td>
                            ))}
                            <td>
                              <div className="plans-delete-cell">
                                <button
                                  type="button"
                                  className="plans-delete-button"
                                  onClick={() =>
                                    requestDeletePlan(id, plan.label)
                                  }
                                  disabled={inUse || plans.length <= 1}
                                  title={
                                    inUse
                                      ? "Hay atletas asignados a este plan"
                                      : plans.length <= 1
                                        ? "Debe quedar al menos un plan"
                                        : "Eliminar plan"
                                  }
                                  aria-label={`Eliminar plan ${plan.label}`}
                                >
                                  <DeleteIcon />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!plans.length && !newPlan && (
                    <p className="plans-empty">
                      No hay planes todavía. Crea el primero para asignarlo a
                      tus atletas.
                    </p>
                  )}
                </div>

                {newPlan && (
                  <div className="plans-create-hint">
                    <span aria-hidden="true">i</span>
                    <p>
                      Todos los campos son obligatorios. Revisa la información y
                      confirma el registro con el check.
                    </p>
                  </div>
                )}

                <footer className="plans-modal-footer">
                  <p className="settings-range-hint">
                    Los pagos ya realizados mantienen su monto original.
                  </p>
                </footer>
              </>
            )}
            {activeSection === "display" && (
              <section
                className="settings-content-section"
                aria-label="Preferencias de visualización"
              >
                <div className="settings-section-heading">
                  <span className="settings-section-icon" aria-hidden="true">
                    ◉
                  </span>
                  <div>
                    <h5>Visualización</h5>
                    <p>Ajusta el tamaño de toda la aplicación.</p>
                  </div>
                </div>
                <div className="settings-option-card settings-theme-card">
                  <div>
                    <strong>Tema de color</strong>
                    <p>
                      Elige el aspecto de la aplicación. El modo oscuro es el
                      valor inicial.
                    </p>
                  </div>
                  <div
                    className="settings-theme-options"
                    role="group"
                    aria-label="Tema de color"
                  >
                    <button
                      type="button"
                      className={theme === "dark" ? "is-selected" : ""}
                      aria-pressed={theme === "dark"}
                      onClick={() => {
                        actions.updateSettings({ theme: "dark" });
                        setSettingsNotice("");
                      }}
                    >
                      <span aria-hidden="true">☾</span>
                      Oscuro
                    </button>
                    <button
                      type="button"
                      className={theme === "light" ? "is-selected" : ""}
                      aria-pressed={theme === "light"}
                      onClick={() => {
                        actions.updateSettings({ theme: "light" });
                        setSettingsNotice("");
                      }}
                    >
                      <span aria-hidden="true">☀</span>
                      Claro
                    </button>
                  </div>
                </div>
                <div className="settings-option-card">
                  <div>
                    <strong>Zoom de la aplicación</strong>
                    <p>
                      Cambia el tamaño de los textos y controles, igual que el
                      zoom del navegador. El ajuste se conserva al volver a
                      abrir la app.
                    </p>
                  </div>
                  <div
                    className="settings-zoom-controls"
                    aria-label="Control de zoom"
                  >
                    <button
                      type="button"
                      className="settings-zoom-step"
                      onClick={() => updateZoom(zoomFactor - 0.1)}
                      disabled={zoomFactor <= 0.8}
                      aria-label="Alejar"
                      title="Alejar"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="settings-zoom-reset"
                      onClick={() => updateZoom(1)}
                      aria-label={`Zoom actual ${Math.round(zoomFactor * 100)} por ciento. Restablecer a 100 por ciento`}
                      title="Restablecer a 100 %"
                    >
                      {Math.round(zoomFactor * 100)}%
                    </button>
                    <button
                      type="button"
                      className="settings-zoom-step"
                      onClick={() => updateZoom(zoomFactor + 0.1)}
                      disabled={zoomFactor >= 1.5}
                      aria-label="Acercar"
                      title="Acercar"
                    >
                      +
                    </button>
                  </div>
                </div>
                <p className="settings-range-hint">
                  Disponible entre 80 % y 150 %.
                </p>
                {zoomError && (
                  <p className="plans-form-error" role="alert">
                    {zoomError}
                  </p>
                )}
                {settingsNotice && (
                  <p className="settings-success-message" role="status">
                    {settingsNotice}
                  </p>
                )}
              </section>
            )}
            {activeSection === "evaluations" && (
              <section
                className="settings-content-section settings-assessments-section"
                aria-label="Configuración de evaluaciones"
              >
                <div className="settings-section-heading">
                  <span className="settings-section-icon">
                    <AssessmentIcon />
                  </span>
                  <div>
                    <h5>Evaluaciones</h5>
                    <p>
                      Define las pruebas que aparecerán al registrar
                      evaluaciones y consultar el progreso de los atletas.
                    </p>
                  </div>
                </div>
                <div className="settings-assessment-metrics">
                  {assessmentMetrics.map((metric, index) => (
                    <article
                      className="settings-assessment-metric"
                      key={metric.key}
                    >
                      <div className="settings-assessment-metric-number">
                        {index + 1}
                      </div>
                      <label>
                        <span>Nombre de la prueba</span>
                        <input
                          className="form-control"
                          value={metric.label}
                          maxLength={60}
                          onChange={(event) =>
                            updateAssessmentMetric(
                              metric.key,
                              "label",
                              event.target.value,
                            )
                          }
                          aria-label={`Nombre de la prueba ${index + 1}`}
                          placeholder="Ej.: Salto vertical"
                        />
                      </label>
                      <label>
                        <span>Unidad de medida</span>
                        <input
                          className="form-control"
                          value={metric.unit}
                          maxLength={12}
                          onChange={(event) =>
                            updateAssessmentMetric(
                              metric.key,
                              "unit",
                              event.target.value,
                            )
                          }
                          aria-label={`Unidad de medida de la prueba ${index + 1}`}
                          placeholder="cm, s, kg…"
                        />
                      </label>
                      <label>
                        <span>Registro</span>
                        <select
                          className="form-select"
                          value={metric.optional ? "optional" : "required"}
                          onChange={(event) =>
                            updateAssessmentMetric(
                              metric.key,
                              "optional",
                              event.target.value === "optional",
                            )
                          }
                          aria-label={`Obligatoriedad de la prueba ${index + 1}`}
                        >
                          <option value="optional">Opcional</option>
                          <option value="required">Obligatorio</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        className="assessment-metric-remove"
                        onClick={() => removeAssessmentMetric(metric.key)}
                        disabled={assessmentMetrics.length <= 1}
                        aria-label={`Eliminar prueba ${metric.label || index + 1}`}
                        title={
                          assessmentMetrics.length <= 1
                            ? "Debe quedar al menos una prueba"
                            : "Eliminar prueba"
                        }
                      >
                        ×
                      </button>
                    </article>
                  ))}
                </div>
                <div className="settings-assessment-actions">
                  <button
                    type="button"
                    className="circuit-icon-action"
                    onClick={addAssessmentMetric}
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                  <button
                    type="button"
                    className="settings-assessment-save"
                    onClick={requestSaveAssessmentMetrics}
                    disabled={!assessmentMetricsChanged}
                  >
                    Guardar cambios
                  </button>
                </div>
                {assessmentError && (
                  <p className="plans-form-error" role="alert">
                    {assessmentError}
                  </p>
                )}
                {settingsNotice && (
                  <p className="settings-success-message" role="status">
                    {settingsNotice}
                  </p>
                )}
              </section>
            )}
            {activeSection === "rules" && (
              <section
                className="settings-content-section"
                aria-label="Reglas del sistema"
              >
                <div className="settings-section-heading">
                  <span className="settings-section-icon" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <h5>Reglas del sistema</h5>
                    <p>
                      Estos criterios se mantienen fijos, puedes eliminar el
                      historial o restablecer todos los datos
                    </p>
                  </div>
                </div>
                <div className="settings-rules-list">
                  <article className="settings-rule-card">
                    <strong>Franjas y tipos de sesión</strong>
                    <p>
                      Las franjas AM/PM y los tipos de sesión son comunes a
                      todos los registros.
                    </p>
                  </article>
                  <article className="settings-rule-card">
                    <strong>Historial de pagos</strong>
                    <p>
                      Los pagos y cobros ya registrados conservan el monto
                      histórico asociado.
                    </p>
                  </article>
                </div>
                <div className="settings-destructive-actions">
                  <h6>Administración de datos</h6>
                  <article className="settings-destructive-card">
                    <div>
                      <strong>Eliminar historial de pagos</strong>
                      <p>
                        Borra marcas de pago y fechas. Conserva atletas,
                        sesiones y cargos aplicables, que volverán a quedar
                        pendientes.
                      </p>
                      <span>
                        {paidPaymentCount} pago(s) marcado(s) como realizado(s)
                      </span>
                    </div>
                    <button
                      type="button"
                      className="settings-danger-button"
                      onClick={() => {
                        setSettingsNotice("");
                        setConfirmingAction("payments");
                      }}
                      disabled={paidPaymentCount === 0}
                    >
                      Borrar historial
                    </button>
                  </article>
                  <article className="settings-destructive-card settings-reset-card">
                    <div>
                      <strong>Restablecer todos los datos</strong>
                      <p>
                        Elimina atletas, asistencias, horarios, evaluaciones,
                        circuitos y pagos. Recupera los planes base, tema oscuro
                        y zoom de 110 %.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="settings-danger-button"
                      onClick={() => {
                        setConfirmationText("");
                        setConfirmingAction("all");
                      }}
                    >
                      Restablecer aplicación
                    </button>
                  </article>
                </div>
              </section>
            )}
          </div>
        </div>
      </section>
      {confirmingSignOut && (
        <div
          className="athlete-modal-backdrop settings-confirm-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !signingOut) {
              setConfirmingSignOut(false);
              setSignOutError("");
            }
          }}
        >
          <section
            className="settings-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="settings-signout-title"
            aria-describedby="settings-signout-description"
          >
            <span className="settings-confirm-icon" aria-hidden="true">↪</span>
            <h4 id="settings-signout-title">¿Cerrar sesión?</h4>
            <p id="settings-signout-description">
              {userEmail
                ? `Se cerrará la sesión de ${userEmail}. Para volver a acceder tendrás que iniciar sesión nuevamente.`
                : "Para volver a acceder tendrás que iniciar sesión nuevamente."}
            </p>
            {signOutError && (
              <p className="circuit-error" role="alert">{signOutError}</p>
            )}
            <footer className="settings-confirm-actions">
              <button
                type="button"
                className="attendance-schedule-cancel"
                disabled={signingOut}
                onClick={() => {
                  setConfirmingSignOut(false);
                  setSignOutError("");
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="settings-danger-button"
                disabled={signingOut}
                onClick={confirmSignOut}
              >
                {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
              </button>
            </footer>
          </section>
        </div>
      )}
      {confirmingAction && (
        <div
          className="athlete-modal-backdrop settings-confirm-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmingAction(null);
              setConfirmationText("");
            }
          }}
        >
          <section
            className="settings-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="settings-confirm-title"
            aria-describedby="settings-confirm-description"
          >
            <span
              className={`settings-confirm-icon${confirmingAction === "metrics" ? " is-warning" : ""}`}
              aria-hidden="true"
            >
              !
            </span>
            <h4 id="settings-confirm-title">
              {confirmingAction === "metrics"
                ? "Guardar configuración de evaluaciones"
                : confirmingAction === "all"
                  ? "Restablecer toda la aplicación"
                  : "Eliminar historial de pagos"}
            </h4>
            <p id="settings-confirm-description">
              {confirmingAction === "metrics"
                ? `Al guardar se eliminarán permanentemente los progresos y resultados de evaluación de todos los atletas (${state.assessments.length} registro(s)). Esta acción no se puede deshacer.`
                : confirmingAction === "all"
                  ? "Esta acción eliminará permanentemente todos los datos guardados y restaurará los valores base. No se puede deshacer."
                  : "Se eliminarán las fechas y marcas de pago. Los cargos actuales se conservarán como pendientes; atletas y sesiones no se modificarán."}
            </p>
            {confirmingAction === "all" && (
              <label className="settings-confirm-field">
                <span>
                  Escribe <strong>eliminar</strong> para confirmar
                </span>
                <input
                  autoFocus
                  className="form-control"
                  value={confirmationText}
                  onChange={(event) => setConfirmationText(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            )}
            <footer className="settings-confirm-actions">
              <button
                type="button"
                className="attendance-schedule-cancel"
                onClick={() => {
                  setConfirmingAction(null);
                  setConfirmationText("");
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={
                  confirmingAction === "metrics"
                    ? "settings-assessment-confirm"
                    : "settings-danger-button"
                }
                disabled={
                  confirmingAction === "all" && confirmationText !== "eliminar"
                }
                onClick={confirmSettingsAction}
              >
                {confirmingAction === "metrics"
                  ? "Guardar y borrar progresos"
                  : confirmingAction === "all"
                    ? "Eliminar todo"
                    : "Borrar historial"}
              </button>
            </footer>
          </section>
        </div>
      )}
      {planToDelete && (
        <div
          className="athlete-modal-backdrop plans-delete-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPlanToDelete(null);
          }}
        >
          <div
            className="athlete-modal athlete-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-plan-title"
          >
            <div className="athlete-modal-header">
              <div>
                <h4 id="delete-plan-title">¿Estás seguro?</h4>
                <p>
                  Estás a punto de eliminar el plan{" "}
                  <strong>{planToDelete.label}</strong>.
                </p>
              </div>
              <button
                type="button"
                className="athlete-modal-close"
                onClick={() => setPlanToDelete(null)}
                aria-label="Cerrar confirmación"
              >
                ×
              </button>
            </div>
            <div className="athlete-modal-footer">
              <button
                type="button"
                className="athlete-cancel-button"
                onClick={() => setPlanToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="athlete-delete-confirm-button"
                onClick={confirmDeletePlan}
              >
                Eliminar plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
