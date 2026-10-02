import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);

const currencyCompact = (amount) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(amount);

const chartColors = {
  axis: "#9b9a92",
  fill: "#747b85",
  grid: "#30343a",
  line: "#e0b52f",
};

function ChartTooltip({ formatter, active }) {
  return (
    <Tooltip
      active={active}
      contentStyle={{
        background: "#17191d",
        border: "1px solid #3a3d42",
        borderRadius: 6,
        color: "#ecebe6",
      }}
      labelStyle={{ color: "#ecebe6" }}
      formatter={formatter}
    />
  );
}

function ChartPanel({ title, description, emptyMessage, isEmpty, children }) {
  return (
    <article className="dashboard-chart-panel">
      <div className="dashboard-section-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="dashboard-chart">
        {children}
        {isEmpty && <p className="dashboard-chart-empty">{emptyMessage}</p>}
      </div>
    </article>
  );
}

function ChartGradient({ id }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={chartColors.fill} stopOpacity={0.48} />
        <stop offset="95%" stopColor={chartColors.fill} stopOpacity={0.04} />
      </linearGradient>
    </defs>
  );
}

function ChartXAxis() {
  return (
    <XAxis
      dataKey="month"
      axisLine={false}
      tickLine={false}
      tick={{ fill: chartColors.axis, fontSize: 11 }}
    />
  );
}

function ChartGrid() {
  return (
    <CartesianGrid
      vertical={false}
      stroke={chartColors.grid}
      strokeDasharray="3 5"
    />
  );
}

export default function DashboardCharts({ data }) {
  const hasAttendanceData = data.some((month) => month.sessionCount > 0);
  const hasCollectionData = data.some((month) => month.collected > 0);

  return (
    <section className="dashboard-trends" aria-label="Tendencias de seis meses">
      <ChartPanel
        title="Asistencia"
        description="Porcentaje de sesiones marcadas como presente"
        emptyMessage="Sin sesiones registradas en estos seis meses"
        isEmpty={!hasAttendanceData}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
          >
            <ChartGradient id="attendanceFill" />
            <ChartGrid />
            <ChartXAxis />
            <YAxis
              domain={[0, 100]}
              unit="%"
              width={42}
              axisLine={false}
              tickLine={false}
              tick={{ fill: chartColors.axis, fontSize: 11 }}
            />
            <ChartTooltip
              active={hasAttendanceData}
              formatter={(value, _name, item) => [
                `${value}% · ${item.payload.sessionCount} sesiones`,
                "Asistencia",
              ]}
            />
            <Area
              type="monotone"
              dataKey="attendance"
              stroke={chartColors.line}
              strokeWidth={2.5}
              fill="url(#attendanceFill)"
              activeDot={{
                r: 4,
                fill: chartColors.line,
                stroke: "#141414",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel
        title="Recaudación"
        description="Pagos marcados como realizados por mes"
        emptyMessage="Sin pagos registrados en estos seis meses"
        isEmpty={!hasCollectionData}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
          >
            <ChartGradient id="collectionFill" />
            <ChartGrid />
            <ChartXAxis />
            <YAxis
              hide={!hasCollectionData}
              tickFormatter={currencyCompact}
              width={58}
              axisLine={false}
              tickLine={false}
              tick={{ fill: chartColors.axis, fontSize: 11 }}
            />
            <ChartTooltip
              active={hasCollectionData}
              formatter={(value) => [formatCurrency(value), "Recaudado"]}
            />
            <Area
              type="monotone"
              dataKey="collected"
              stroke={chartColors.line}
              strokeWidth={2.5}
              fill="url(#collectionFill)"
              activeDot={{
                r: 4,
                fill: chartColors.line,
                stroke: "#141414",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartPanel>
    </section>
  );
}
