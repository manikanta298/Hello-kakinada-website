import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { Row } from "@/lib/admin/db";

const COLORS = ["var(--primary)", "var(--accent)", "var(--chart-3)", "var(--chart-4)"];
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--popover-foreground)" };

export function TrendChart({ data, series, height = 220, type = "area" }: { data: Row[]; series: { key: string; label: string }[]; height?: number; type?: "area" | "bar" }) {
  const Chart = type === "bar" ? BarChart : AreaChart;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s, i) => type === "bar"
            ? <Bar key={s.key} dataKey={s.key} name={s.label} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            : <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.12} strokeWidth={2} />)}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
