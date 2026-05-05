"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { SalesByDayRow } from "@/types/reports";

export interface SalesLineChartProps {
  data: SalesByDayRow[];
  className?: string;
}

export function SalesLineChart({ data, className = "" }: SalesLineChartProps) {
  const chartData = data.map((d) => ({
    date: d.date.slice(0, 10),
    total: d.total,
    vendas: d.count,
  }));

  if (chartData.length === 0) {
    return <div className={`h-64 flex items-center justify-center text-gray-500 text-sm ${className}`}>Sem dados no período</div>;
  }

  return (
    <div className={`h-64 w-full ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
          <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Total"]} labelFormatter={(l) => `Data: ${l}`} />
          <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="Faturamento" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
