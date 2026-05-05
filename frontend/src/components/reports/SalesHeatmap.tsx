"use client";

import type { SalesByHourRow } from "@/types/reports";

export interface SalesHeatmapProps {
  data: SalesByHourRow[];
}

export function SalesHeatmap({ data }: SalesHeatmapProps) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const byHour: Record<number, SalesByHourRow> = {};
  for (let h = 0; h < 24; h++) byHour[h] = { hour: h, count: 0, total: 0 };
  data.forEach((d) => {
    byHour[d.hour] = d;
  });
  const rows = Array.from({ length: 24 }, (_, i) => byHour[i] ?? { hour: i, count: 0, total: 0 });

  const intensity = (count: number) => {
    if (maxCount === 0) return "bg-gray-100";
    const p = count / maxCount;
    if (p <= 0) return "bg-gray-100";
    if (p < 0.25) return "bg-blue-200";
    if (p < 0.5) return "bg-blue-400";
    if (p < 0.75) return "bg-blue-600 text-white";
    return "bg-blue-800 text-white";
  };

  return (
    <div className="overflow-x-auto">
      <div className="text-xs font-medium text-gray-500 mb-2">Vendas por hora (0–23h)</div>
      <div className="grid grid-cols-12 gap-1 min-w-[280px]">
        {rows.map((r) => (
          <div
            key={r.hour}
            className={`rounded p-2 text-center ${intensity(r.count)}`}
            title={`${r.hour}h: ${r.count} vendas, R$ ${r.total.toFixed(2)}`}
          >
            <span className="font-medium">{r.hour}h</span>
            <span className="block text-[10px] opacity-90">{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
