import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/UI";
import DatePicker from "../components/DatePicker";
import { useApp } from "../context/AppContext";
import { todayISO } from "../utils/helpers";
import {
  createPhysicalAssessment,
  getMetricTrend,
  PHYSICAL_METRICS,
} from "../utils/physicalAssessments";

const PhysicalAssessmentChart = lazy(
  () => import("../components/PhysicalAssessmentChart"),
);

const emptyResults = (metrics = PHYSICAL_METRICS) =>
  Object.fromEntries(metrics.map(({ key }) => [key, ""]));

const formatDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatValue = (value, unit) =>
  `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(value)} ${unit}`;

export default function PhysicalAssessmentsPage() {
  const { state, actions } = useApp();
  const metrics = state.settings?.assessmentMetrics ?? PHYSICAL_METRICS;
  const [athleteId, setAthleteId] = useState("");
  const [metricKey, setMetricKey] = useState(PHYSICAL_METRICS[0].key);
  const [form, setForm] = useState(() => ({
    date: todayISO(),
    ...emptyResults(),
  }));
  const [error, setError] = useState("");
  const athletes = useMemo(
    () => [...state.athletes].sort((a, b) => a.name.localeCompare(b.name)),
    [state.athletes],
  );
  const selectedAthlete =
    athletes.find((athlete) => athlete.id === athleteId) ?? athletes[0];
  useEffect(() => {
    setForm((current) => ({
      date: current.date,
      ...emptyResults(metrics),
    }));
  }, [metrics]);
  const metric =
    metrics.find((item) => item.key === metricKey) ?? metrics[0];
  const assessments = useMemo(
    () =>
      (state.assessments ?? [])
        .filter((assessment) => assessment.athleteId === selectedAthlete?.id)
        .sort(
          (first, second) =>
            first.date.localeCompare(second.date) ||
            (first.createdAt ?? "").localeCompare(second.createdAt ?? "") ||
            first.id.localeCompare(second.id),
        ),
    [state.assessments, selectedAthlete?.id],
  );
  const trend = getMetricTrend(assessments, metric);
  const chartData = assessments.map((assessment) => ({
    date: assessment.date,
    result: assessment.results?.[metric.key] ?? null,
  }));
  const trendLabel =
    trend?.history.length === 1
      ? "Línea base"
      : trend?.changePercent == null
      ? "Sin base de comparación"
      : Math.abs(trend.changePercent) < 0.01
        ? "Sin cambio"
        : `${trend.improved ? "Mejora" : "Cambio"} ${Math.abs(
            trend.changePercent,
          ).toLocaleString("es-CL", { maximumFractionDigits: 1 })}%`;

  const updateResult = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const saveAssessment = (event) => {
    event.preventDefault();
    if (!selectedAthlete) {
      setError("Agrega un atleta antes de registrar una evaluación.");
      return;
    }
    try {
      actions.addPhysicalAssessment(
        createPhysicalAssessment(
          selectedAthlete.id,
          form,
          crypto.randomUUID(),
          metrics,
        ),
      );
      setForm((current) => ({
        date: current.date,
        ...emptyResults(metrics),
      }));
      setError("");
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  return (
    <>
      <PageHeader title="Evaluaciones físicas" />
      <section className="physical-assessment-page">
        <div className="physical-assessment-entry">
          <div className="circuit-section-heading">
            <div>
              <h2>Registrar evaluación</h2>
              <p>Registra las mediciones de una sesión para seguir el progreso.</p>
            </div>
          </div>
          <form className="physical-assessment-form" onSubmit={saveAssessment}>
            <section className="physical-assessment-form-section physical-assessment-session">
              <div className="physical-assessment-session-fields">
                <label>
                  <span>Atleta</span>
                  <select
                    className="form-select"
                    value={selectedAthlete?.id ?? ""}
                    onChange={(event) => setAthleteId(event.target.value)}
                    required
                  >
                    {athletes.map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="physical-assessment-date">
                  <span>Fecha de evaluación</span>
                  <DatePicker
                    className="physical-assessment-date-picker"
                    value={form.date}
                    onChange={(date) => updateResult("date", date)}
                  />
                </label>
              </div>
            </section>
            <section className="physical-assessment-form-section physical-assessment-results">
              <div className="physical-assessment-metrics">
                {metrics.map((item) => (
                  <label className="physical-assessment-metric-field" key={item.key}>
                    <span className="physical-assessment-metric-label">
                      <span>{item.label}</span>
                      <small className={item.optional ? "" : "is-required"}>
                        {item.optional ? "Opcional" : "Obligatorio"}
                      </small>
                    </span>
                    <span className="physical-assessment-input-wrap">
                      <input
                        className="form-control"
                        type="number"
                        min="0.01"
                        step="any"
                        required={!item.optional}
                        inputMode="decimal"
                        value={form[item.key] ?? ""}
                        onChange={(event) =>
                          updateResult(item.key, event.target.value)
                        }
                        placeholder="Ingresa un valor"
                        aria-label={`${item.label} en ${item.unit}`}
                      />
                      <span>{item.unit}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
            <div className="physical-assessment-form-footer">
              {error && <p className="circuit-error" role="alert">{error}</p>}
              <button
                type="submit"
                className="circuit-primary-button"
                disabled={!selectedAthlete}
              >
                Guardar evaluación
              </button>
            </div>
          </form>
        </div>

        <div className="physical-assessment-history">
          <div className="circuit-section-heading">
            <div>
              <h2>Progreso</h2>
              <p>
                {selectedAthlete
                  ? `Historial de ${selectedAthlete.name}`
                  : "Selecciona un atleta para consultar su historial."}
              </p>
            </div>
            <select
              className="form-select physical-metric-select"
              value={metric.key}
              onChange={(event) => setMetricKey(event.target.value)}
              aria-label="Prueba física del gráfico"
            >
              {metrics.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          {trend ? (
            <>
              <div className="physical-assessment-summary">
                <div>
                  <span>Línea base · {formatDate(trend.baseline.date)}</span>
                  <strong>
                    {formatValue(trend.baseline.results[metric.key], metric.unit)}
                  </strong>
                </div>
                <div>
                  <span>Último resultado · {formatDate(trend.current.date)}</span>
                  <strong>
                    {formatValue(trend.current.results[metric.key], metric.unit)}
                  </strong>
                </div>
                <b
                  className={
                    trend.improved === true
                      ? "is-improved"
                      : trend.improved === false
                        ? "is-decreased"
                        : ""
                  }
                >
                  {trendLabel}
                </b>
              </div>
              <div className="physical-assessment-chart">
                <Suspense fallback={<span>Cargando gráfico…</span>}>
                  <PhysicalAssessmentChart
                    data={chartData}
                    metric={metric}
                    baseline={trend.baseline.results[metric.key]}
                  />
                </Suspense>
              </div>
              <div className="physical-assessment-records">
                <h3>Resultados registrados</h3>
                {trend.history.map((assessment) => (
                  <div className="physical-assessment-record" key={assessment.id}>
                    <span>{formatDate(assessment.date)}</span>
                    <strong>
                      {formatValue(assessment.results[metric.key], metric.unit)}
                    </strong>
                    <button
                      type="button"
                      className="circuit-mini-action is-danger"
                      onClick={() => actions.removePhysicalAssessment(assessment.id)}
                      aria-label={`Eliminar evaluación del ${formatDate(assessment.date)}`}
                      title="Eliminar evaluación"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="circuit-list-empty">
              Aún no hay resultados de {metric.label.toLocaleLowerCase()} para este atleta.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
