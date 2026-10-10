import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatValue = (value, unit) =>
  `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(value)} ${unit}`;

export default function PhysicalAssessmentChart({ data, metric, baseline }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 12, right: 18, left: 4, bottom: 4 }}
      >
        <CartesianGrid stroke="rgba(173, 173, 173, 0.15)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(date) =>
            new Date(`${date}T00:00:00`).toLocaleDateString("es-CL", {
              month: "short",
              year: "2-digit",
            })
          }
          tick={{ fill: "#adadad", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          unit={` ${metric.unit}`}
          tick={{ fill: "#adadad", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={55}
          domain={["auto", "auto"]}
        />
        <Tooltip
          labelFormatter={formatDate}
          formatter={(value) => [
            formatValue(value, metric.unit),
            metric.label,
          ]}
          contentStyle={{
            background: "#1b1b1b",
            border: "1px solid #2e2e2e",
            borderRadius: 8,
          }}
        />
        <ReferenceLine
          y={baseline}
          stroke="#e0a83a"
          strokeDasharray="4 4"
        />
        <Line
          type="monotone"
          dataKey="result"
          name={metric.label}
          stroke="#d4a72c"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#d4a72c" }}
          activeDot={{ r: 6 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
