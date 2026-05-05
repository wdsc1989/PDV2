"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { Card, Table, Badge, Button } from "@/components/ui";
import { ReportFilters } from "@/components/reports/ReportFilters";
import type {
  ReportSummary,
  ReportFiltersState,
  TopProductRow,
  StockRow,
  SalesByDayRow,
  SalesByCategoryRow,
  SalesByPaymentRow,
  SalesByHourRow,
} from "@/types/reports";
import { buildReportParams } from "@/types/reports";
import { SalesLineChart } from "@/components/reports/SalesLineChart";
import { SalesByCategoryBarChart } from "@/components/reports/SalesByCategoryBarChart";
import { PaymentPieChart } from "@/components/reports/PaymentPieChart";
import { SalesHeatmap } from "@/components/reports/SalesHeatmap";
import { downloadReportExcel, printReport } from "@/components/reports/exportReport";

type CashSessionRow = {
  id: number;
  data_abertura: string;
  data_fechamento: string | null;
  valor_abertura: number;
  valor_fechamento: number | null;
  status: string;
};
type AccountRow = { id: number; fornecedor?: string; cliente?: string; descricao: string | null; data_vencimento: string; valor: number; status: string };

const defaultFilters: ReportFiltersState = {
  preset: "30",
  dataInicio: "",
  dataFim: "",
  categoriaId: "",
  tipoPagamento: "",
};

export default function RelatoriosPage() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState<ReportFiltersState>(defaultFilters);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductRow[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [sessions, setSessions] = useState<CashSessionRow[]>([]);
  const [payables, setPayables] = useState<AccountRow[]>([]);
  const [receivables, setReceivables] = useState<AccountRow[]>([]);
  const [salesByDay, setSalesByDay] = useState<SalesByDayRow[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<SalesByCategoryRow[]>([]);
  const [salesByPayment, setSalesByPayment] = useState<SalesByPaymentRow[]>([]);
  const [salesByHour, setSalesByHour] = useState<SalesByHourRow[]>([]);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = buildReportParams(filters);
  const summaryParams = filters.preset === "hoje" && filters.dataInicio
    ? `data_inicio=${filters.dataInicio}&data_fim=${filters.dataFim}`
    : filters.preset === "7" ? "days=7" : filters.preset === "90" || filters.preset === "trimestre" ? "days=90" : filters.preset === "ano" ? "days=365" : "days=30";

  const loadAll = useCallback(() => {
    if (!isAuthenticated()) return;
    setLoading(true);
    setError("");
    Promise.all([
      apiFetch<ReportSummary>(`/reports/summary?${summaryParams}`).catch((e) => { setError(e.message); return null; }),
      apiFetch<TopProductRow[]>(`/reports/top-products?${params}&limit=10`).catch(() => []),
      apiFetch<StockRow[]>(`/reports/stock-summary${filters.categoriaId ? `?categoria_id=${filters.categoriaId}` : ""}`).catch(() => []),
      apiFetch<CashSessionRow[]>("/cash/sessions?limit=50").catch(() => []),
      apiFetch<AccountRow[]>("/accounts-payable").catch(() => []),
      apiFetch<AccountRow[]>("/accounts-receivable").catch(() => []),
      apiFetch<SalesByDayRow[]>(`/reports/sales-by-day?${params}`).catch(() => []),
      apiFetch<SalesByCategoryRow[]>(`/reports/sales-by-category?${params}`).catch(() => []),
      apiFetch<SalesByPaymentRow[]>(`/reports/sales-by-payment?${params}`).catch(() => []),
      apiFetch<SalesByHourRow[]>(`/reports/sales-by-hour?${params}`).catch(() => []),
    ])
      .then(([s, top, st, sess, pay, rec, byDay, byCat, byPay, byHour]) => {
        if (s != null) setSummary(s);
        setTopProducts(top || []);
        setStock(st || []);
        setSessions(sess || []);
        setPayables(pay || []);
        setReceivables(rec || []);
        setSalesByDay(byDay || []);
        setSalesByCategory(byCat || []);
        setSalesByPayment(byPay || []);
        setSalesByHour(byHour || []);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, summaryParams, params, filters.categoriaId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    apiFetch<{ id: number; nome: string }[]>("/categories/all")
      .then((list) => setCategories(list.map((c) => ({ value: String(c.id), label: c.nome }))))
      .catch(() => setCategories([]));
  }, [mounted, isAuthenticated]);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    loadAll();
  }, [mounted, isAuthenticated, loadAll]);

  if (!mounted) return <div className="p-4">Carregando...</div>;

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500 mt-1">Visão geral e indicadores do período</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            type="button"
            variant="secondary"
            onClick={() => summary && downloadReportExcel(summary, topProducts, stock)}
            disabled={!summary}
          >
            Exportar Excel
          </Button>
          <Button type="button" variant="secondary" onClick={printReport}>
            Imprimir (PDF)
          </Button>
        </div>
      </div>

      <ReportFilters filters={filters} onChange={setFilters} categoryOptions={categories} />

      {error && <p className="text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-gray-500 mb-4">Carregando...</p>}

      {summary && (
        <>
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Indicadores</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <p className="text-sm text-gray-600 mb-1">Faturamento (período)</p>
                <p className="text-xl font-bold text-gray-900">R$ {summary.total_vendas_periodo.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">{summary.vendas_count_periodo} vendas</p>
              </Card>
              <Card>
                <p className="text-sm text-gray-600 mb-1">Vendas hoje</p>
                <p className="text-xl font-bold text-gray-900">R$ {summary.total_vendas_hoje.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">{summary.vendas_count_hoje} vendas</p>
              </Card>
              <Card>
                <p className="text-sm text-gray-600 mb-1">Ticket médio (período)</p>
                <p className="text-xl font-bold text-gray-900">R$ {summary.ticket_medio_periodo.toFixed(2)}</p>
              </Card>
              <div role="button" tabIndex={0} className="cursor-pointer" onClick={() => scrollToSection("secao-contas")} onKeyDown={(e) => e.key === "Enter" && scrollToSection("secao-contas")}>
                <Card className={summary.contas_vencidas_count > 0 ? "border-amber-400 border-2" : ""}>
                  <p className="text-sm text-gray-600 mb-1">Contas vencidas</p>
                  <p className="text-xl font-bold text-gray-900">{summary.contas_vencidas_count}</p>
                  {summary.contas_vencidas_count > 0 && <p className="text-xs text-amber-600 mt-1">Requer atenção (clique para ver)</p>}
                </Card>
              </div>
              <Card>
                <p className="text-sm text-gray-600 mb-1">Lucro (período)</p>
                <p className="text-xl font-bold text-green-700">R$ {summary.total_lucro_periodo.toFixed(2)}</p>
              </Card>
              <Card>
                <p className="text-sm text-gray-600 mb-1">Valor em estoque (custo)</p>
                <p className="text-xl font-bold text-gray-900">R$ {summary.valor_estoque_custo.toFixed(2)}</p>
              </Card>
              <div role="button" tabIndex={0} className="cursor-pointer" onClick={() => scrollToSection("secao-estoque")} onKeyDown={(e) => e.key === "Enter" && scrollToSection("secao-estoque")}>
                <Card className={summary.produtos_estoque_critico_count > 0 ? "border-amber-400 border-2" : ""}>
                  <p className="text-sm text-gray-600 mb-1">Estoque crítico</p>
                  <p className="text-xl font-bold text-gray-900">{summary.produtos_estoque_critico_count}</p>
                  {summary.produtos_estoque_critico_count > 0 && <p className="text-xs text-amber-600 mt-1">Abaixo do mínimo (clique para ver)</p>}
                </Card>
              </div>
              <Card>
                <p className="text-sm text-gray-600 mb-1">Caixa</p>
                <p className="text-lg font-semibold text-gray-900">{summary.caixa_aberto ? "Aberto" : "Fechado"}</p>
              </Card>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gráficos</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Vendas por dia">
                <SalesLineChart data={salesByDay} />
              </Card>
              <Card title="Vendas por categoria">
                <SalesByCategoryBarChart data={salesByCategory} />
              </Card>
              <Card title="Forma de pagamento">
                <PaymentPieChart data={salesByPayment} />
              </Card>
              <Card title="Vendas por hora">
                <SalesHeatmap data={salesByHour} />
              </Card>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 10 produtos vendidos</h2>
            <Table<TopProductRow>
              keyExtractor={(r) => r.product_id}
              data={topProducts}
              columns={[
                { key: "nome", label: "Produto" },
                { key: "quantidade_vendida", label: "Qtd.", render: (r) => r.quantidade_vendida.toFixed(1) },
                { key: "valor_total", label: "Valor total", render: (r) => `R$ ${r.valor_total.toFixed(2)}` },
                { key: "lucro_total", label: "Lucro", render: (r) => `R$ ${r.lucro_total.toFixed(2)}` },
              ]}
            />
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Estoque atual</h2>
            <Table<StockRow>
              keyExtractor={(r) => r.product_id}
              data={stock}
              columns={[
                { key: "nome", label: "Produto" },
                { key: "quantidade", label: "Qtd.", render: (r) => r.quantidade.toFixed(1) },
                { key: "valor_custo_total", label: "Valor custo", render: (r) => `R$ ${r.valor_custo_total.toFixed(2)}` },
                { key: "valor_venda_total", label: "Valor venda", render: (r) => `R$ ${r.valor_venda_total.toFixed(2)}` },
                { key: "abaixo_minimo", label: "Status", render: (r) => r.abaixo_minimo ? <Badge variant="warning">Crítico</Badge> : <Badge variant="success">Ok</Badge> },
              ]}
            />
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sessões de caixa</h2>
            <Table<CashSessionRow>
              keyExtractor={(r) => r.id}
              data={sessions}
              columns={[
                { key: "id", label: "ID" },
                { key: "data_abertura", label: "Abertura", render: (r) => r.data_abertura?.slice(0, 16).replace("T", " ") ?? "" },
                { key: "data_fechamento", label: "Fechamento", render: (r) => r.data_fechamento ? r.data_fechamento.slice(0, 16).replace("T", " ") : "—" },
                { key: "valor_abertura", label: "Abertura (R$)", render: (r) => r.valor_abertura.toFixed(2) },
                { key: "valor_fechamento", label: "Fechamento (R$)", render: (r) => r.valor_fechamento != null ? r.valor_fechamento.toFixed(2) : "—" },
                { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "aberta" ? "success" : "default"}>{r.status}</Badge> },
              ]}
            />
          </section>

          <section id="secao-contas" className="mb-8 scroll-mt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contas a pagar / receber (resumo)</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">A pagar</h3>
                <Table<AccountRow>
                  keyExtractor={(r) => `p-${r.id}`}
                  data={payables.slice(0, 10)}
                  columns={[
                    { key: "fornecedor", label: "Fornecedor" },
                    { key: "data_vencimento", label: "Vencimento" },
                    { key: "valor", label: "Valor", render: (r) => `R$ ${r.valor.toFixed(2)}` },
                    { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "atrasada" ? "danger" : "default"}>{r.status}</Badge> },
                  ]}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">A receber</h3>
                <Table<AccountRow>
                  keyExtractor={(r) => `r-${r.id}`}
                  data={receivables.slice(0, 10)}
                  columns={[
                    { key: "cliente", label: "Cliente" },
                    { key: "data_vencimento", label: "Vencimento" },
                    { key: "valor", label: "Valor", render: (r) => `R$ ${r.valor.toFixed(2)}` },
                    { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "atrasada" ? "danger" : "default"}>{r.status}</Badge> },
                  ]}
                />
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
