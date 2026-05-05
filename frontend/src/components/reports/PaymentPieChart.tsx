"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { SalesByPaymentRow } from "@/types/reports";

export interface PaymentPieChartProps {
  data: SalesByPaymentRow[];
}

const COLORS = ["#2563eb", "#059669", "#d97706", "#94a3b8"];

export function PaymentPieChart({ data }: PaymentPieChartProps) {
  const chartData = data.map((d) => ({ name: d.tipo_pagamento, value: d.total }));

  if (chartData.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-500 text-sm">Sem dados no período</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Total"]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
