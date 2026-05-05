"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { SalesByCategoryRow } from "@/types/reports";

export interface SalesByCategoryBarChartProps {
  data: SalesByCategoryRow[];
}

const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#65a30d", "#ca8a04"];

export function SalesByCategoryBarChart({ data }: SalesByCategoryBarChartProps) {
  const chartData = data.slice(0, 12).map((d) => ({
    name: d.category_name.length > 15 ? d.category_name.slice(0, 15) + "…" : d.category_name,
    total: d.total,
    count: d.count,
  }));

  if (chartData.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-500 text-sm">Sem dados no período</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
          <YAxis type="category" dataKey="name" width={58} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Total"]} />
          <Bar dataKey="total" fill={COLORS[0]} radius={[0, 4, 4, 0]} name="Faturamento" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
