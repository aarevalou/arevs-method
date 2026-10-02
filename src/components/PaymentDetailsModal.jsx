import { useApp } from "../context/AppContext";
import { ATTENDANCE, PAYMENT, PLANS } from "../utils/constants";
import { todayISO } from "../utils/helpers";
import { getPaymentDetails } from "../utils/payments";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export default function PaymentDetailsModal({ athlete, onClose }) {
  const { state, actions } = useApp();
  const details = getPaymentDetails(
    athlete,
    state.sessions,
    todayISO().slice(0, 7),
  );
  const totalDue = details.charges.reduce(
    (total, charge) => total + (charge.paid ? 0 : charge.amount),
    0,
  );
  const allPaid =
    details.charges.length > 0 &&
    details.charges.every((charge) => charge.paid);

  return (
    <div
      className="athlete-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="athlete-modal payment-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-detail-title"
      >
        <div className="payment-modal-header">
          <div className="payment-modal-heading">
            <div className="payment-modal-icon">$</div>
            <div>
              <h4 id="payment-detail-title">Detalle de pagos</h4>
              <div className="payment-modal-athlete">{athlete.name}</div>
              <div className="payment-modal-meta">
                <span>{PLANS[athlete.plan].label}</span>
                <span className="payment-modal-divider">·</span>
                <span>{PAYMENT[athlete.payment]}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="athlete-modal-close"
            onClick={onClose}
            aria-label="Cerrar detalle de pagos"
          >
            ×
          </button>
        </div>

        <div className="athlete-modal-body payment-detail-body">
          <div className="payment-summary-card">
            <div className="payment-summary-info">
              <span className="payment-summary-label">
                {allPaid
                  ? "Todos los pagos al día"
                  : "Total pendiente estimado"}
              </span>
              <span className="payment-summary-description">
                El total considera únicamente los pagos pendientes.
              </span>
            </div>
            <strong className="payment-summary-total">
              {formatCurrency(totalDue)}
            </strong>
          </div>

          <section className="payment-section">
            <div className="payment-table-container">
              <table className="payment-detail-table">
                <thead>
                  <tr>
                    <th>Periodo / sesión</th>
                    <th>Asistencia</th>
                    <th className="payment-detail-amount">Monto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {details.charges.map((charge) => (
                    <tr
                      key={charge.key}
                      className={charge.paid ? "payment-charge-paid" : ""}
                    >
                      <td>
                        <div className="payment-period">
                          <div>
                            <strong>{charge.title}</strong>
                            {charge.block && (
                              <span className="payment-session-block">
                                {charge.block}
                              </span>
                            )}
                          </div>
                          <span>{PLANS[athlete.plan].label}</span>
                        </div>
                      </td>
                      <td>
                        {charge.sessions.length ? (
                          <div className="payment-sessions">
                            {charge.sessions.map((session) => (
                              <div className="payment-session" key={session.id}>
                                <span
                                  className={`payment-attendance payment-attendance-${session.status.toLowerCase()}`}
                                >
                                  {ATTENDANCE[session.status]?.label ??
                                    session.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="payment-detail-empty">
                            Sin asistencias registradas
                          </span>
                        )}
                      </td>
                      <td className="payment-detail-amount">
                        <strong>{formatCurrency(charge.amount)}</strong>
                      </td>
                      <td className="payment-charge-status">
                        <label className="payment-paid-control">
                          <input
                            type="checkbox"
                            className="payment-paid-checkbox"
                            checked={charge.paid}
                            onChange={(event) =>
                              actions.updatePaymentRecord(
                                athlete.id,
                                charge.key,
                                event.target.checked,
                              )
                            }
                            aria-label={`${charge.paid ? "Marcar pendiente" : "Marcar pagado"}: ${charge.title}`}
                          />
                          <span>{charge.paid ? "Pagado" : "Pendiente"}</span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3">
                      {allPaid ? "Todos los pagos al día" : "Total pendiente"}
                    </td>
                    <td className="payment-detail-amount">
                      {formatCurrency(totalDue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>

        <div className="payment-modal-footer">
          <p className="payment-payment-scope">
            Cada casilla actualiza solo ese pago. El estado del atleta será Al
            día cuando todos estén pagados.
          </p>
          <button
            type="button"
            className="btn btn-primary payment-paid-button"
            onClick={() => actions.markAllPaymentsPaid(athlete.id)}
            disabled={allPaid}
          >
            Marcar todo al día
          </button>
        </div>
      </div>
    </div>
  );
}
