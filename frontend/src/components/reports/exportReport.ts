import type { ReportSummary, TopProductRow, StockRow } from "@/types/reports";

export function downloadReportExcel(
  summary: ReportSummary,
  topProducts: TopProductRow[],
  stock: StockRow[]
): void {
  import("xlsx").then((XLSX) => {
    const wb = XLSX.utils.book_new();
    const summaryData = [
      ["Indicador", "Valor"],
      ["Vendas hoje (R$)", summary.total_vendas_hoje],
      ["Vendas período (R$)", summary.total_vendas_periodo],
      ["Lucro período (R$)", summary.total_lucro_periodo],
      ["Vendas count hoje", summary.vendas_count_hoje],
      ["Vendas count período", summary.vendas_count_periodo],
      ["Ticket médio (R$)", summary.ticket_medio_periodo],
      ["Contas vencidas", summary.contas_vencidas_count],
      ["Valor estoque custo (R$)", summary.valor_estoque_custo],
      ["Valor estoque venda (R$)", summary.valor_estoque_venda],
      ["Produtos estoque crítico", summary.produtos_estoque_critico_count],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Resumo");

    const topData = [
      ["Produto", "Qtd. vendida", "Valor total", "Lucro"],
      ...topProducts.map((p) => [p.nome, p.quantidade_vendida, p.valor_total, p.lucro_total]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(topData), "Top produtos");

    const stockData = [
      ["Produto", "Qtd.", "Valor custo", "Valor venda", "Lucro potencial", "Abaixo mínimo"],
      ...stock.map((s) => [s.nome, s.quantidade, s.valor_custo_total, s.valor_venda_total, s.lucro_potencial, s.abaixo_minimo ? "Sim" : "Não"]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stockData), "Estoque");

    const filename = `relatorio-pdv-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  });
}

export function printReport(): void {
  window.print();
}
