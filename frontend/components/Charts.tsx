"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTokens } from "@/lib/useTokens";
import type { DepartmentStat, NameValue, Overview } from "@/types";

const PRIORITY_BAR: Record<string, string> = {
  Critical: "bg-[var(--crit-fg)]", High: "bg-[var(--high-fg)]", Medium: "bg-ink", Low: "bg-mute",
};

/** Plain HTML bar rows: label, trackless 2px bar, value. */
export function BarList({ data, priority = false }: { data: NameValue[]; priority?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="divide-y divide-hairline">
      {data.map((d) => (
        <li key={d.name} className="grid grid-cols-[120px_1fr_32px] items-center gap-4 py-2.5 text-[14px]">
          <span className="truncate text-body">{d.name}</span>
          <span className={`h-0.5 ${priority ? PRIORITY_BAR[d.name] ?? "bg-ink" : "bg-ink"}`} style={{ width: `${(d.value / max) * 100}%` }} />
          <span className="num text-right font-mono text-[13px]">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}

function useChartStyle() {
  const t = useTokens();
  return {
    t,
    axis: { stroke: t.mute, fontSize: 11, tickLine: false, axisLine: false },
    tooltip: {
      contentStyle: { background: "var(--surface)", border: `1px solid ${t.hairline}`, borderRadius: 6, fontSize: 12, boxShadow: "none" },
      itemStyle: { color: t.ink }, labelStyle: { color: t.mute }, cursor: { fill: t.hairline, opacity: 0.4 },
    },
    legend: { iconType: "square" as const, iconSize: 8, wrapperStyle: { fontSize: 12, color: t.body } },
  };
}

export function TrendLines({ data }: { data: Overview["trend"] }) {
  const { t, axis, tooltip, legend } = useChartStyle();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <CartesianGrid stroke={t.hairline} vertical={false} />
        <XAxis dataKey="date" {...axis} />
        <YAxis allowDecimals={false} {...axis} width={36} />
        <Tooltip {...tooltip} />
        <Legend {...legend} />
        <Line isAnimationActive={false} type="linear" dataKey="reported" name="Reported" stroke={t.ink} strokeWidth={1.5} dot={false} />
        <Line isAnimationActive={false} type="linear" dataKey="resolved" name="Resolved" stroke={t.accent} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DepartmentBars({ data }: { data: DepartmentStat[] }) {
  const { t, axis, tooltip, legend } = useChartStyle();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8 }} barSize={10}>
        <CartesianGrid stroke={t.hairline} horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...axis} />
        <YAxis type="category" dataKey="department" {...axis} width={140} />
        <Tooltip {...tooltip} />
        <Legend {...legend} />
        <Bar isAnimationActive={false} dataKey="open" name="Open" stackId="a" fill={t.ink} />
        <Bar isAnimationActive={false} dataKey="resolved" name="Resolved" stackId="a" fill={t.mute} />
      </BarChart>
    </ResponsiveContainer>
  );
}
