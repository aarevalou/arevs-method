import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useForm } from "../hooks/useForm";
import {
  DeleteIcon,
  EditIcon,
  EmptyState,
  PageHeader,
} from "../components/UI";
import DatePicker from "../components/DatePicker";
import PaymentDetailsModal from "../components/PaymentDetailsModal";
import { PAYMENT } from "../utils/constants";
import { ageOf } from "../utils/helpers";

const BLANK = {
  name: "",
  birth: "",
  heightCm: "",
  weightKg: "",
  club: "",
  courtPosition: "",
  dominantFoot: "",
  guardian: "",
  guardianNotApplicable: false,
  phone: "",
  plan: "",
};

const formatChileanWhatsApp = (phone) => {
  const numbers = phone.replace(/\D/g, "");

  if (numbers.length !== 9 || !numbers.startsWith("9")) {
    return phone;
  }

  return `+56 9 ${numbers.slice(1, 5)} ${numbers.slice(5)}`;
};

export default function AthletesPage({
  paymentFilter = "TODOS",
  onPaymentFilterChange,
}) {
  const { state, actions } = useApp();
  const { values, bind, reset, setField } = useForm(BLANK);

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [athleteToDelete, setAthleteToDelete] = useState(null);
  const [editingAthleteId, setEditingAthleteId] = useState(null);
  const [editValues, setEditValues] = useState(BLANK);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [paymentAthleteId, setPaymentAthleteId] = useState(null);
  const paymentAthlete = state.athletes.find(
    (athlete) => athlete.id === paymentAthleteId,
  );
  const normalizedSearch = athleteSearch.trim().toLocaleLowerCase("es-CL");
  const visibleAthletes = state.athletes.filter((athlete) => {
    const isArchived = Boolean(athlete.archivedAt);
    const matchesPayment =
      paymentFilter === "ARCHIVADOS"
        ? isArchived
        : !isArchived &&
          (paymentFilter === "TODOS" || athlete.payment === paymentFilter);
    return (
      matchesPayment &&
      athlete.name.toLocaleLowerCase("es-CL").includes(normalizedSearch)
    );
  });
  const editingAthlete = state.athletes.find(
    (athlete) => athlete.id === editingAthleteId,
  );

  const openModal = () => {
    reset({ plan: Object.keys(state.plans)[0] ?? "" });
    setShowModal(true);
  };

  const closeModal = () => {
    reset();
    setShowModal(false);
  };

  const openDeleteModal = (athlete) => {
    setAthleteToDelete(athlete);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setAthleteToDelete(null);
    setShowDeleteModal(false);
  };

  const confirmDelete = () => {
    if (!athleteToDelete) return;

    actions.deleteAthlete(athleteToDelete.id);
    closeDeleteModal();
  };

  const openEditModal = (athlete) => {
    setEditingAthleteId(athlete.id);
    setShowModal(true);
    setEditValues({
      name: athlete.name ?? "",
      birth: athlete.birth ?? "",
      heightCm: athlete.heightCm ?? "",
      weightKg: athlete.weightKg ?? "",
      club: athlete.club ?? "",
      courtPosition: athlete.courtPosition ?? "",
      dominantFoot: athlete.dominantFoot ?? "",
      guardian: athlete.guardian ?? "",
      guardianNotApplicable: Boolean(athlete.guardianNotApplicable),
      phone: athlete.phone ?? "",
      plan: athlete.plan,
      status: athlete.archivedAt
        ? (athlete.statusBeforeArchive ?? "ACTIVO")
        : athlete.status,
    });
  };

  const closeEditModal = () => {
    setEditingAthleteId(null);
    setShowModal(false);
    setEditValues(BLANK);
  };

  const updateEditField = (field, value) => {
    setEditValues((current) => ({ ...current, [field]: value }));
  };

  const submitEdit = (event) => {
    event.preventDefault();
    if (!editingAthlete || !editValues.name.trim()) return;
    if (!editValues.guardianNotApplicable && !editValues.guardian.trim())
      return;

    const sessionsUsed = Math.max(
      0,
      editingAthlete.allocated - editingAthlete.remaining,
    );
    const allocated = state.plans[editValues.plan].sessions;
    actions.updateAthlete(editingAthlete.id, {
      name: editValues.name.trim(),
      birth: editValues.birth,
      heightCm: editValues.heightCm === "" ? null : Number(editValues.heightCm),
      weightKg: editValues.weightKg === "" ? null : Number(editValues.weightKg),
      club: editValues.club.trim(),
      courtPosition: editValues.courtPosition.trim(),
      dominantFoot: editValues.dominantFoot,
      guardian: editValues.guardianNotApplicable
        ? ""
        : editValues.guardian.trim(),
      guardianNotApplicable: editValues.guardianNotApplicable,
      phone: editValues.phone,
      plan: editValues.plan,
      ...(editingAthlete.archivedAt
        ? {
            status: "INACTIVO",
            statusBeforeArchive: editValues.status,
          }
        : { status: editValues.status }),
      allocated,
      remaining: Math.max(0, allocated - sessionsUsed),
    });
    closeEditModal();
  };

  const archiveEditingAthlete = () => {
    if (!editingAthlete) return;
    if (editingAthlete.archivedAt) {
      actions.restoreAthlete(editingAthlete.id);
    } else {
      actions.archiveAthlete(editingAthlete.id);
    }
    closeEditModal();
  };

  const submit = (e) => {
    e.preventDefault();

    console.log("SUBMIT EJECUTADO");
    console.log("VALUES:", values);

    if (!values.name.trim()) {
      console.log("Falta nombre");
      return;
    }

    if (!values.guardianNotApplicable && !values.guardian.trim()) {
      console.log("Falta apoderado");
      return;
    }

    const athlete = {
      ...values,
      guardian: values.guardianNotApplicable ? "" : values.guardian.trim(),
    };

    console.log("ATLETA A AGREGAR:", athlete);

    actions.addAthlete(athlete);

    console.log("addAthlete ejecutado");

    closeModal();

    console.log("closeModal ejecutado");
  };

  return (
    <>
      <PageHeader title="Atletas" />

      {/* ENCABEZADO DE ACCIONES */}
      <div className="athletes-toolbar">
        <div>
          <h5 className="athletes-toolbar-title">Gestión de atletas</h5>

          <p className="athletes-toolbar-description">
            Administra los atletas registrados y sus planes.
          </p>
        </div>

        <div className="athletes-table-tools">
          <input
            type="search"
            className="form-control athlete-search"
            placeholder="Buscar atleta"
            aria-label="Buscar atleta por nombre"
            value={athleteSearch}
            onChange={(event) => setAthleteSearch(event.target.value)}
          />
          <select
            className="form-select athlete-payment-filter"
            aria-label="Filtrar atletas por estado de pago"
            value={paymentFilter}
            onChange={(event) => onPaymentFilterChange(event.target.value)}
          >
            <option value="TODOS">Todos</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="AL_DIA">Al día</option>
            <option value="ARCHIVADOS">Archivados</option>
          </select>
        </div>

        <button
          type="button"
          className="btn btn-primary athlete-add-button"
          onClick={openModal}
        >
          <span className="athlete-add-icon">+</span>
          Agregar atleta
        </button>
      </div>

      {/* TABLA */}
      {state.athletes.length ? (
        <div className="athletes-table-wrapper">
          <table className="table align-middle athletes-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Edad</th>
                <th>Apoderado</th>
                <th>Plan</th>
                <th>Clases usadas</th>
                <th>Pago</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {visibleAthletes.length ? (
                visibleAthletes.map((a) => (
                  <tr
                    key={a.id}
                    className={a.status === "ACTIVO" ? "" : "athlete-inactive"}
                  >
                    <td>
                      <span className="athlete-table-name">{a.name}</span>
                      {(a.recoveryCredits ?? 0) > 0 && (
                        <span className="athlete-recovery-credit">
                          {a.recoveryCredits} clase{a.recoveryCredits === 1 ? "" : "s"} recuperativa
                          {a.recoveryCredits === 1 ? "" : "s"}
                        </span>
                      )}
                    </td>

                    <td>
                      <span className="athlete-table-data">
                        {ageOf(a.birth)}
                      </span>
                    </td>

                    <td>
                      <div className="athlete-guardian">
                        <span
                          className={
                            a.guardianNotApplicable
                              ? "athlete-table-data guardian-na"
                              : "athlete-table-data"
                          }
                        >
                          {a.guardianNotApplicable
                            ? "No aplica"
                            : a.guardian || "—"}
                        </span>

                        {a.phone && (
                          <span className="athlete-phone">
                            {formatChileanWhatsApp(a.phone)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className="athlete-plan">
                        {state.plans[a.plan]?.label ?? "Plan no disponible"}
                      </span>
                    </td>

                    <td>
                      <span className="athlete-table-data">
                        {a.allocated - a.remaining}
                        <span className="classes-total"> de {a.allocated}</span>
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className={`payment-attendance athlete-payment-tag payment-attendance-${a.payment.toLowerCase()}`}
                        onClick={() => setPaymentAthleteId(a.id)}
                        aria-label={`Ver detalle de pagos de ${a.name}: ${PAYMENT[a.payment]}`}
                        title="Ver detalle de pagos"
                      >
                        {PAYMENT[a.payment]}
                      </button>
                    </td>

                    <td className="athletes-actions-cell">
                      <div className="plans-row-actions">
                        <button
                          type="button"
                          className="plans-edit-button"
                          onClick={() => openEditModal(a)}
                          aria-label={`Editar a ${a.name}`}
                          title="Editar atleta"
                        >
                          <EditIcon />
                        </button>

                        <button
                          type="button"
                          className="plans-delete-button"
                          onClick={() => openDeleteModal(a)}
                          aria-label={`Eliminar a ${a.name}`}
                          title="Eliminar atleta"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="athletes-filter-empty">
                    No hay atletas que coincidan con la búsqueda y el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>
          Aún no hay atletas. Presiona "Agregar atleta" para registrar el
          primero.
        </EmptyState>
      )}

      {/* =====================================================
          MODAL AGREGAR ATLETA
          ===================================================== */}

      {showModal && (
        <div
          className="athlete-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              if (editingAthlete) closeEditModal();
              else closeModal();
            }
          }}
        >
          {editingAthlete && (
            <div
              className="athlete-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-athlete-title"
            >
              <div className="athlete-modal-header">
                <div>
                  <h4 id="edit-athlete-title">Editar atleta</h4>
                  <p>Actualiza sus datos y plan.</p>
                </div>
                <button
                  type="button"
                  className="athlete-modal-close"
                  onClick={closeEditModal}
                  aria-label="Cerrar edición"
                >
                  ×
                </button>
              </div>

              <form onSubmit={submitEdit}>
                <div className="athlete-modal-body">
                  <div className="athlete-form-section">
                    <div className="athlete-form-section-title">
                      Información del atleta
                    </div>
                    <div className="row g-3">
                      <div className="col-12">
                        <label
                          className="form-label"
                          htmlFor="edit-athlete-name"
                        >
                          Nombre completo
                        </label>
                        <input
                          id="edit-athlete-name"
                          className="form-control"
                          value={editValues.name}
                          onChange={(event) =>
                            updateEditField("name", event.target.value)
                          }
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label
                          className="form-label"
                          htmlFor="edit-athlete-birth"
                        >
                          Fecha de nacimiento
                        </label>
                        <DatePicker
                          id="edit-athlete-birth"
                          value={editValues.birth}
                          onChange={(birth) => updateEditField("birth", birth)}
                        />
                        <div className="athlete-age-preview">
                          Edad actual: {ageOf(editValues.birth)}
                          {editValues.birth && ageOf(editValues.birth) !== "-" ? " años" : ""}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="edit-athlete-height">
                          Estatura (cm)
                        </label>
                        <input
                          id="edit-athlete-height"
                          className="form-control"
                          type="number"
                          min="1"
                          step="any"
                          value={editValues.heightCm}
                          onChange={(event) => updateEditField("heightCm", event.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="edit-athlete-weight">
                          Peso (kg)
                        </label>
                        <input
                          id="edit-athlete-weight"
                          className="form-control"
                          type="number"
                          min="1"
                          step="any"
                          value={editValues.weightKg}
                          onChange={(event) => updateEditField("weightKg", event.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="edit-athlete-club">
                          Club o equipo actual
                        </label>
                        <input
                          id="edit-athlete-club"
                          className="form-control"
                          maxLength={80}
                          value={editValues.club}
                          onChange={(event) => updateEditField("club", event.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="edit-athlete-position">
                          Posición en cancha
                        </label>
                        <input
                          id="edit-athlete-position"
                          className="form-control"
                          maxLength={60}
                          value={editValues.courtPosition}
                          onChange={(event) =>
                            updateEditField("courtPosition", event.target.value)
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="edit-athlete-foot">
                          Pie dominante
                        </label>
                        <select
                          id="edit-athlete-foot"
                          className="form-select"
                          value={editValues.dominantFoot}
                          onChange={(event) =>
                            updateEditField("dominantFoot", event.target.value)
                          }
                        >
                          <option value="">Sin especificar</option>
                          <option value="Diestro">Diestro</option>
                          <option value="Zurdo">Zurdo</option>
                          <option value="Ambidextro">Ambidextro</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label
                          className="form-label"
                          htmlFor="edit-athlete-plan"
                        >
                          Plan
                        </label>
                        <select
                          id="edit-athlete-plan"
                          className="form-select"
                          value={editValues.plan}
                          onChange={(event) =>
                            updateEditField("plan", event.target.value)
                          }
                        >
                          {Object.entries(state.plans).map(([key, plan]) => (
                            <option key={key} value={key}>
                              {plan.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="athlete-form-section">
                    <div className="athlete-form-section-title">
                      Información del apoderado
                    </div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label
                          className="form-label"
                          htmlFor="edit-athlete-guardian"
                        >
                          Nombre del apoderado
                        </label>
                        <input
                          id="edit-athlete-guardian"
                          className="form-control"
                          value={editValues.guardian}
                          disabled={editValues.guardianNotApplicable}
                          onChange={(event) =>
                            updateEditField("guardian", event.target.value)
                          }
                          required={!editValues.guardianNotApplicable}
                        />
                        <label className="guardian-no-applicable">
                          <input
                            type="checkbox"
                            checked={editValues.guardianNotApplicable}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setEditValues((current) => ({
                                ...current,
                                guardianNotApplicable: checked,
                                guardian: checked ? "" : current.guardian,
                              }));
                            }}
                          />
                          <span>No aplica</span>
                        </label>
                      </div>
                      <div className="col-md-6">
                        <label
                          className="form-label"
                          htmlFor="edit-athlete-phone"
                        >
                          WhatsApp
                        </label>
                        <input
                          id="edit-athlete-phone"
                          type="tel"
                          inputMode="numeric"
                          className="form-control"
                          placeholder="912345678"
                          maxLength={9}
                          value={editValues.phone}
                          onChange={(event) =>
                            updateEditField(
                              "phone",
                              event.target.value.replace(/\D/g, "").slice(0, 9),
                            )
                          }
                        />
                        <div className="whatsapp-help">
                          9 dígitos · Ej. 912345678
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="athlete-form-section">
                    <label className="guardian-no-applicable">
                      <input
                        type="checkbox"
                        checked={editValues.status === "ACTIVO"}
                        onChange={(event) =>
                          updateEditField(
                            "status",
                            event.target.checked ? "ACTIVO" : "INACTIVO",
                          )
                        }
                      />
                      <span>Atleta activo</span>
                    </label>
                  </div>
                </div>

                <div className="athlete-modal-footer athlete-edit-footer">
                  <button
                    type="button"
                    className="athlete-cancel-button"
                    onClick={archiveEditingAthlete}
                  >
                    {editingAthlete.archivedAt
                      ? "Restaurar atleta"
                      : "Archivar atleta"}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary athlete-save-button"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </div>
          )}
          {!editingAthlete && (
            <div
              className="athlete-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-athlete-title"
            >
              {/* HEADER */}

              <div className="athlete-modal-header">
                <div>
                  <h4 id="add-athlete-title">Agregar atleta</h4>

                  <p>Ingresa la información del nuevo atleta.</p>
                </div>

                <button
                  type="button"
                  className="athlete-modal-close"
                  onClick={closeModal}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              {/* FORMULARIO */}

              <form onSubmit={submit}>
                <div className="athlete-modal-body">
                  <div className="athlete-form-section">
                    <div className="athlete-form-section-title">
                      Información del atleta
                    </div>

                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label">Nombre completo</label>

                        <input
                          className="form-control"
                          placeholder="Ej. Daniel González"
                          autoFocus
                          {...bind("name")}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Fecha de nacimiento
                        </label>

                        <DatePicker
                          id="new-athlete-birth"
                          value={values.birth}
                          onChange={(birth) => setField("birth", birth)}
                        />
                        <div className="athlete-age-preview">
                          Edad actual: {ageOf(values.birth)}
                          {values.birth && ageOf(values.birth) !== "-" ? " años" : ""}
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Estatura (cm)</label>
                        <input
                          className="form-control"
                          type="number"
                          min="1"
                          step="any"
                          {...bind("heightCm")}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Peso (kg)</label>
                        <input
                          className="form-control"
                          type="number"
                          min="1"
                          step="any"
                          {...bind("weightKg")}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Club o equipo actual</label>
                        <input
                          className="form-control"
                          maxLength={80}
                          {...bind("club")}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Posición en cancha</label>
                        <input
                          className="form-control"
                          maxLength={60}
                          {...bind("courtPosition")}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Pie dominante</label>
                        <select className="form-select" {...bind("dominantFoot")}>
                          <option value="">Sin especificar</option>
                          <option value="Diestro">Diestro</option>
                          <option value="Zurdo">Zurdo</option>
                          <option value="Ambidextro">Ambidextro</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Plan</label>

                        <select className="form-select" {...bind("plan")}>
                          {Object.entries(state.plans).map(([k, p]) => (
                            <option key={k} value={k}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="athlete-form-section">
                    <div className="athlete-form-section-title">
                      Información del apoderado
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Nombre del apoderado
                        </label>

                        <input
                          className="form-control"
                          placeholder="Nombre completo"
                          disabled={values.guardianNotApplicable}
                          {...bind("guardian")}
                        />

                        <label className="guardian-no-applicable">
                          <input
                            type="checkbox"
                            checked={values.guardianNotApplicable}
                            onChange={(e) => {
                              const checked = e.target.checked;

                              bind("guardian").onChange({
                                target: {
                                  name: "guardian",
                                  value: checked ? "" : values.guardian,
                                },
                              });

                              bind("guardianNotApplicable").onChange({
                                target: {
                                  name: "guardianNotApplicable",
                                  value: checked,
                                },
                              });
                            }}
                          />

                          <span>No aplica</span>
                        </label>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">WhatsApp</label>

                        <input
                          type="tel"
                          inputMode="numeric"
                          className="form-control"
                          placeholder="912345678"
                          maxLength={9}
                          value={values.phone}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 9);

                            bind("phone").onChange({
                              target: {
                                name: "phone",
                                value,
                              },
                            });
                          }}
                        />

                        <div className="whatsapp-help">
                          9 dígitos · Ej. 912345678
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FOOTER */}

                <div className="athlete-modal-footer">
                  <button
                    type="button"
                    className="athlete-cancel-button"
                    onClick={closeModal}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary athlete-save-button"
                  >
                    Agregar atleta
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
      {/* =====================================================
    MODAL ELIMINAR ATLETA
    ===================================================== */}

      {showDeleteModal && athleteToDelete && (
        <div
          className="athlete-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeDeleteModal();
            }
          }}
        >
          <div
            className="athlete-modal athlete-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-athlete-title"
          >
            {/* HEADER */}

            <div className="athlete-modal-header">
              <div>
                <h4 id="delete-athlete-title">¿Estás seguro?</h4>

                <p>
                  Estás a punto de eliminar a{" "}
                  <strong>{athleteToDelete.name}</strong>.
                </p>
              </div>

              <button
                type="button"
                className="athlete-modal-close"
                onClick={closeDeleteModal}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* FOOTER */}

            <div className="athlete-modal-footer">
              <button
                type="button"
                className="athlete-cancel-button"
                onClick={closeDeleteModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="athlete-delete-confirm-button"
                onClick={confirmDelete}
              >
                Eliminar atleta
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentAthlete && (
        <PaymentDetailsModal
          athlete={paymentAthlete}
          onClose={() => setPaymentAthleteId(null)}
        />
      )}
    </>
  );
}
