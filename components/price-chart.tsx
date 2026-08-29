"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PriceHistoryPoint } from "@/lib/data/products";

const LINE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Recharts kræver ét datapunkt pr. x-værdi med én kolonne pr. serie, så vi
// piv­oterer den flade prishistorik (dato + forhandler + pris) om til rækker
// pr. dato med én kolonne pr. forhandler.
function buildChartData(priceHistory: PriceHistoryPoint[]) {
  const retailerNames = Array.from(
    new Set(priceHistory.map((point) => point.retailerName)),
  ).sort();

  const rowsByDate = new Map<string, Record<string, number>>();
  for (const point of priceHistory) {
    const date = point.scrapedAt.slice(0, 10);
    const row = rowsByDate.get(date) ?? {};
    row[point.retailerName] = point.price;
    rowsByDate.set(date, row);
  }

  const data = Array.from(rowsByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, prices]) => ({ date, ...prices }));

  return { data, retailerNames };
}

export function PriceChart({
  priceHistory,
}: {
  priceHistory: PriceHistoryPoint[];
}) {
  if (priceHistory.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Ingen prishistorik endnu. Grafen fyldes ud, når der er indsamlet
        priser over tid.
      </p>
    );
  }

  const { data, retailerNames } = buildChartData(priceHistory);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(value: number) => `${value} kr.`}
        />
        <Tooltip formatter={(value) => `${value} kr.`} />
        <Legend />
        {retailerNames.map((name, index) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={LINE_COLORS[index % LINE_COLORS.length]}
            connectNulls
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
