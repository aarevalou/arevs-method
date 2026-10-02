// Piezas pequeñas reutilizables en varias páginas

export function PageHeader({ title, children }) {
  return (
    <div className="d-flex justify-content-between align-items-center mb-3">
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
