"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney } from "@/lib/format";
import type { OrderStatus } from "@/types/api";

/** Same status colours the badges use, so the chart and the tables agree. */
const COLORS: Record<OrderStatus, string> = {
  pending: "#f59e0b",
  paid: "#10b981",
  completed: "#0ea5e9",
  cancelled: "#a1a1aa",
};

type Datum = { status: OrderStatus; count: number; total: number };

const capitalise = (value: string) =>
  value ? value[0].toUpperCase() + value.slice(1) : "";

/**
 * A custom tooltip rather than a `formatter`.
 *
 * Recharts renders `name: value` around whatever a formatter returns, so a
 * combined "12 orders · $1,443.81" string comes out prefixed with a stray colon.
 * Owning the markup is both shorter than fighting that and lets the count and the
 * value sit on separate lines.
 */
function StatusTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Datum }[];
}) {
  if (!active || !payload?.length) return null;
  const { status, count, total } = payload[0].payload;

  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{capitalise(status)}</p>
      <p className="text-muted-foreground tabular-nums">
        {count} order{count === 1 ? "" : "s"} · {formatMoney(total)}
      </p>
    </div>
  );
}

export function OrdersByStatusChart({ data }: { data: Datum[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
        <XAxis
          dataKey="status"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          tickFormatter={(value) => capitalise(String(value ?? ""))}
        />
        <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
        <Tooltip cursor={{ fillOpacity: 0.08 }} content={<StatusTooltip />} />
        {/* Animation off: a dashboard is read, not watched, and an animating
            chart is blank for the first second after every navigation. */}
        <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((entry) => (
            <Cell key={entry.status} fill={COLORS[entry.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
