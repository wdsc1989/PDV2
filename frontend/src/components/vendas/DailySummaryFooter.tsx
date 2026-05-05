"use client";

export type SummaryData = {
  total_vendas_hoje: number;
  vendas_count_hoje: number;
};

export interface DailySummaryFooterProps {
  data: SummaryData | null;
  loading?: boolean;
}

export function DailySummaryFooter({ data, loading }: DailySummaryFooterProps) {
  if (loading) {
    return (
      <div className="mt-4 py-3 px-4 bg-gray-100 rounded-lg text-sm text-gray-500">
        Carregando resumo...
      </div>
    );
  }
  if (!data) return null;

  const ticketMedio = data.vendas_count_hoje > 0 ? data.total_vendas_hoje / data.vendas_count_hoje : 0;

  return (
    <div className="mt-4 py-3 px-4 bg-gray-100 rounded-lg text-sm text-gray-700 flex flex-wrap gap-4">
      <span><strong>Total hoje:</strong> R$ {data.total_vendas_hoje.toFixed(2)}</span>
      <span><strong>Vendas:</strong> {data.vendas_count_hoje}</span>
      <span><strong>Clientes atendidos:</strong> {data.vendas_count_hoje}</span>
      <span><strong>Ticket médio:</strong> R$ {ticketMedio.toFixed(2)}</span>
    </div>
  );
}
