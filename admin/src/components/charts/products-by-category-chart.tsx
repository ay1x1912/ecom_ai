"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

/**
 * Distribution of products across categories.
 *
 * The API returns every category including empty ones (the query LEFT JOINs on
 * purpose), so zero-count slices are filtered out here — a pie cannot draw them
 * and they crowd the legend.
 */
const PALETTE = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#a855f7",
  "#14b8a6",
  "#f97316",
];

export function ProductsByCategoryChart({
  data,
}: {
  data: { id: number; name: string; count: number }[];
}) {
  const slices = data.filter((entry) => entry.count > 0);

  if (slices.length === 0) {
    return (
      <p className="text-muted-foreground grid h-[260px] place-items-center text-sm">
        No products are assigned to a category yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="count"
          nameKey="name"
          innerRadius={45}
          outerRadius={80}
          paddingAngle={2}
          // See the bar chart: a dashboard should be readable the instant it
          // paints, not a second and a half later.
          isAnimationActive={false}
        >
          {slices.map((entry, index) => (
            <Cell key={entry.id} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => {
            const count = Number(value ?? 0);
            return [`${count} product${count === 1 ? "" : "s"}`, ""];
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => (
            <span className="text-muted-foreground text-xs">{String(value ?? "")}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
