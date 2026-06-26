"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { Card, Table, Badge, Button, Skeleton, Segmented } from "@/components/ui";
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
import { VendasHistoricoTab } from "@/components/reports/VendasHistoricoTab";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const SAZONALIDADE_MERCADO: Record<number, string> = {
  1: "Pós-Natal, liquidação de fim de ano, férias; consumo tende a normalizar.",
  2: "Volta às aulas, Carnaval, pré-páscoa; demanda por roupas e acessórios de festa.",
  3: "Dia da Mulher, volta à rotina; campanhas promocionais no varejo.",
  4: "Páscoa, dias mais frios no Sul/Sudeste; aquecimento em chocolates e vestuário.",
  5: "Dia das Mães, um dos picos de vendas do primeiro semestre.",
  6: "Festas Juninas, Dia dos Namorados; forte movimento em vestuário e presentes.",
  7: "Férias escolares, liquidação de meio de ano; demanda variável por região.",
  8: "Dia dos Pais, preparação para primavera; segundo pico do semestre.",
  9: "Volta às aulas, Dia da Independência; recuperação de estoques.",
  10: "Dia das Crianças, pré-Black Friday; aquecimento para fim de ano.",
  11: "Black Friday e campanhas; um dos maiores meses de vendas do ano.",
  12: "Natal e Réveillon; pico de consumo no varejo.",
};

const SAZONALIDADE_ROUPAS_FEMININAS: Record<number, string> = {
  1: "Liquidação de verão; peças de festa pós-Réveillon; moda praia em promoção.",
  2: "Carnaval: vestidos, looks festa, acessórios. Volta às aulas: uniforme e casual.",
  3: "Dia da Mulher: pico em moda feminina, promoções e presentes. Entrada de outono.",
  4: "Páscoa: looks leves, casacos leves no Sul. Transição outono/inverno.",
  5: "Dia das Mães: um dos melhores meses; presentes, moda festa e casual.",
  6: "Festas juninas: moda casual e térmica. Dia dos Namorados: vestidos e lingerie.",
  7: "Liquidação de inverno. Férias: moda casual e conforto.",
  8: "Dia dos Pais (presentes). Pré-primavera: novidades e cores.",
  9: "Volta às aulas: moda jovem e casual. Dia da Independência; primavera.",
  10: "Primavera/verão: vestidos, shorts, moda praia. Dia das Crianças (maternidade).",
  11: "Black Friday: um dos picos do ano em moda feminina. Réveillon e festas.",
  12: "Natal e Réveillon: vestidos de festa, moda noite; pico de vendas.",
};

type User = { id: number; username: string; name: string; role: string };

type CashSessionRow = {
  id: number;
  data_abertura: string;
  data_fechamento: string | null;
  valor_abertura: number;
  valor_fechamento: number | null;
  status: string;
};
type AccountRow = { id: number; fornecedor?: string; cliente?: string; descricao: string | null; data_vencimento: string; valor: number; status: string };
type CommissionRow = { user_id: number | null; nome: string; comissao_percentual: number; total_vendido: number; vendas_count: number; comissao_total: number };

const defaultFilters: ReportFiltersState = {
  preset: "30",
  dataInicio: "",
  dataFim: "",
  categoriaId: "",
  tipoPagamento: "",
};

export default function RelatoriosPage() {
  const { isAuthenticated, user } = useAuthStore();
  const userRole = user?.role ?? "";
  const [activeTab, setActiveTab] = useState("indicadores");
  const [vendedores, setVendedores] = useState<User[]>([]);
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
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedChart, setSelectedChart] = useState<"linha" | "categoria" | "pagamento" | "hora">("linha");

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
      apiFetch<CommissionRow[]>(`/reports/commissions?${params}`).catch(() => []),
    ])
      .then(([s, top, st, sess, pay, rec, byDay, byCat, byPay, byHour, comm]) => {
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
        setCommissions(comm || []);
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
    apiFetch<User[]>("/users")
      .then(setVendedores)
      .catch(() => setVendedores([]));
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

      {/* Abas */}
      <div className="flex border-b border-rose-100 mb-6 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("indicadores")}
          className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "indicadores"
              ? "border-primary-700 text-primary-700"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Métricas & Indicadores
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("historico")}
          className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "historico"
              ? "border-primary-700 text-primary-700"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Histórico de Vendas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("sazonalidade")}
          className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "sazonalidade"
              ? "border-primary-700 text-primary-700"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Sazonalidades & Planejamento
        </button>
      </div>

      {activeTab === "historico" ? (
        <VendasHistoricoTab userRole={userRole} vendedores={vendedores} />
      ) : activeTab === "sazonalidade" ? (
        <SazonalidadesTab />
      ) : (
        <>
          <ReportFilters filters={filters} onChange={setFilters} categoryOptions={categories} />

      {error && <p className="text-red-600 mb-4">{error}</p>}
      {loading && (
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4" role="status" aria-label="Carregando relatórios...">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-rose-100 bg-white p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      )}

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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gráficos de Desempenho</h2>
            <Card>
              <div className="mb-6 max-w-2xl mx-auto">
                <Segmented
                  options={[
                    { value: "linha", label: "Evolução de Vendas" },
                    { value: "categoria", label: "Categorias" },
                    { value: "pagamento", label: "Formas de Pagamento" },
                    { value: "hora", label: "Vendas por Hora" },
                  ]}
                  value={selectedChart}
                  onChange={setSelectedChart}
                />
              </div>
              <div className="min-h-[320px] flex items-center justify-center w-full">
                {selectedChart === "linha" && (
                  <div className="w-full h-80">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">Vendas por Dia</h3>
                    <SalesLineChart data={salesByDay} />
                  </div>
                )}
                {selectedChart === "categoria" && (
                  <div className="w-full h-80">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">Vendas por Categoria</h3>
                    <SalesByCategoryBarChart data={salesByCategory} />
                  </div>
                )}
                {selectedChart === "pagamento" && (
                  <div className="w-full h-80">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">Formas de Pagamento</h3>
                    <PaymentPieChart data={salesByPayment} />
                  </div>
                )}
                {selectedChart === "hora" && (
                  <div className="w-full h-80">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">Distribuição por Horário</h3>
                    <SalesHeatmap data={salesByHour} />
                  </div>
                )}
              </div>
            </Card>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Comissões por vendedor</h2>
            <Table<CommissionRow>
              keyExtractor={(r) => `c-${r.user_id ?? "none"}`}
              data={commissions}
              columns={[
                { key: "nome", label: "Vendedor" },
                { key: "vendas_count", label: "Vendas" },
                { key: "total_vendido", label: "Total vendido", render: (r) => `R$ ${r.total_vendido.toFixed(2)}` },
                { key: "comissao_percentual", label: "%", render: (r) => `${r.comissao_percentual}%` },
                { key: "comissao_total", label: "Comissão", render: (r) => `R$ ${r.comissao_total.toFixed(2)}` },
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
        </>
      )}
    </div>
  );
}

function SazonalidadesTab() {
  const currentMonth = new Date().getMonth() + 1; // 1-12

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-rose-50/50 to-amber-50/40 rounded-2xl border border-rose-100/40 p-5 shadow-xs">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-2">
          <span>📅</span> Calendário Anual de Sazonalidades (Planejamento)
        </h2>
        <p className="text-xs text-gray-500">
          Consulte as tendências típicas de consumo do varejo geral brasileiro e o comportamento específico do mercado de moda feminina para cada mês do ano. Prepare seus estoques e campanhas com antecedência!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MONTH_NAMES.map((monthName, idx) => {
          const monthNum = idx + 1;
          const isCurrent = monthNum === currentMonth;

          return (
            <div
              key={monthNum}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all duration-300 hover:shadow-md ${
                isCurrent 
                  ? "border-primary-500 ring-2 ring-primary-100/50 bg-rose-50/5" 
                  : "border-gray-200/80"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h3 className="text-base font-extrabold text-gray-900">{monthName}</h3>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-100 text-primary-800 uppercase tracking-wider animate-pulse">
                      Mês Atual
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Mercado Geral</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {SAZONALIDADE_MERCADO[monthNum]}
                    </p>
                  </div>
                  <div className="border-t border-rose-100/30 pt-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary-500 mb-1">Moda Feminina</h4>
                    <p className="text-xs text-gray-800 font-medium leading-relaxed">
                      {SAZONALIDADE_ROUPAS_FEMININAS[monthNum]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
