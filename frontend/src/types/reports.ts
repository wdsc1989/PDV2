export type ReportSummary = {
  total_vendas_hoje: number;
  total_vendas_periodo: number;
  total_lucro_periodo: number;
  caixa_aberto: boolean;
  vendas_count_hoje: number;
  vendas_count_periodo: number;
  ticket_medio_periodo: number;
  contas_vencidas_count: number;
  valor_estoque_custo: number;
  valor_estoque_venda: number;
  produtos_estoque_critico_count: number;
};

export type SalesByDayRow = { date: string; total: number; count: number };
export type SalesByCategoryRow = { category_name: string; total: number; count: number };
export type SalesByPaymentRow = { tipo_pagamento: string; total: number; count: number };
export type TopProductRow = {
  product_id: number;
  nome: string;
  quantidade_vendida: number;
  valor_total: number;
  lucro_total: number;
};
export type StockRow = {
  product_id: number;
  nome: string;
  quantidade: number;
  valor_custo_total: number;
  valor_venda_total: number;
  lucro_potencial: number;
  abaixo_minimo: boolean;
};
export type SalesByHourRow = { hour: number; count: number; total: number };

export type ReportFiltersState = {
  preset: "hoje" | "7" | "30" | "90" | "trimestre" | "ano";
  dataInicio: string;
  dataFim: string;
  categoriaId: string;
  tipoPagamento: string;
};

export function buildReportParams(f: ReportFiltersState): string {
  const params = new URLSearchParams();
  if (f.preset === "hoje" && f.dataInicio) {
    params.set("data_inicio", f.dataInicio);
    params.set("data_fim", f.dataFim);
  } else if (f.preset === "7") params.set("days", "7");
  else if (f.preset === "30") params.set("days", "30");
  else if (f.preset === "90") params.set("days", "90");
  else if (f.preset === "trimestre") params.set("days", "90");
  else if (f.preset === "ano") params.set("days", "365");
  else if (f.dataInicio && f.dataFim) {
    params.set("data_inicio", f.dataInicio);
    params.set("data_fim", f.dataFim);
  } else params.set("days", "30");
  if (f.categoriaId) params.set("categoria_id", f.categoriaId);
  if (f.tipoPagamento) params.set("tipo_pagamento", f.tipoPagamento);
  return params.toString();
}
