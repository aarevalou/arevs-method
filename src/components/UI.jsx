// Piezas pequeñas reutilizables en varias páginas

export const EditIcon = ({ checked = false }) =>
  checked ? (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m4 10 4 4 8-8" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m12.8 3.8 3.4 3.4M4 16l3.2-.7 9.6-9.6a1.7 1.7 0 0 0-2.4-2.4l-9.6 9.6L4 16Z" />
    </svg>
  );

export function DeleteIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.5 6h11M8 6V4h4v2m2.5 0-.6 10h-7L6.3 6m2.2 2v5m3-5v5" />
    </svg>
  );
}

export function PageHeader({ title, children }) {
  return (
    <div className="av-page-header d-flex justify-content-between align-items-center mb-3">
      <h1 className="av-title">{title}</h1>
      <div className="d-flex gap-2">{children}</div>
    </div>
  );
}

export function StatCard({ label, value }) {
  return (
    <div className="card av-stat">
      <div className="card-body">
        <div className="av-stat-value">{value}</div>
        <div className="text-secondary small">{label}</div>
      </div>
    </div>
  );
}

export function EmptyState({ children }) {
  return <p className="text-secondary text-center py-4">{children}</p>;
}

export function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          title={o.description}
          aria-label={o.description ? `${o.label}: ${o.description}` : o.label}
          className={`tone-${o.tone ?? "gold"} ${value === o.value ? "active" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
