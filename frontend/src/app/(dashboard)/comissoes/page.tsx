"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import {
  Card,
  Table,
  Badge,
  Button,
  Select,
  KpiCard,
  FilterBar,
  toast,
  Skeleton,
  Label,
} from "@/components/ui";

type CommissionSummary = {
  user_id: number | null;
  nome: string;
  comissao_percentual: number;
  total_vendido: number;
  vendas_count: number;
  comissao_total: number;
};

type DetailedCommission = {
  sale_id: number;
  data_venda: string;
  subtotal_bruto: number;
  desconto_valor: number;
  total_vendido: number;
  comissao_percentual: number;
  comissao_valor: number;
  comissao_paga: boolean;
  vendedor_nome: string;
};

type VendedorOption = {
  value: string;
  label: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayMonthISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function ComissoesPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [dataInicio, setDataInicio] = useState(firstDayMonthISO());
  const [dataFim, setDataFim] = useState(todayISO());
  const [statusFiltro, setStatusFiltro] = useState<"todas" | "paga" | "pendente">("todas");
  const [selectedVendedorId, setSelectedVendedorId] = useState<string>("");

  // Dados do backend
  const [summaries, setSummaries] = useState<CommissionSummary[]>([]);
  const [detailed, setDetailed] = useState<DetailedCommission[]>([]);
  const [selectedSaleIds, setSelectedSaleIds] = useState<number[]>([]);
  const [actionSaving, setActionSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdminOrGerente = useMemo(() => {
    return user?.role === "admin" || user?.role === "gerente";
  }, [user]);

  // Lista de vendedores para o select do administrador
  const vendedorOptions = useMemo<VendedorOption[]>(() => {
    const options = summaries.map((s) => ({
      value: s.user_id ? String(s.user_id) : "none",
      label: s.nome,
    }));
    return [{ value: "", label: "Todos os Vendedores" }, ...options];
  }, [summaries]);

  const loadData = useCallback(() => {
    if (!isAuthenticated()) return;
    setLoading(true);

    const queryParams = new URLSearchParams();
    if (dataInicio) queryParams.set("data_inicio", dataInicio);
    if (dataFim) queryParams.set("data_fim", dataFim);

    // Endpoint resumido
    const summaryUrl = `/reports/commissions?${queryParams.toString()}`;

    // Endpoint detalhado
    const detailedParams = new URLSearchParams(queryParams);
    detailedParams.set("status", statusFiltro);
    if (selectedVendedorId) {
      if (selectedVendedorId === "none") {
        detailedParams.set("user_id", "");
      } else {
        detailedParams.set("user_id", selectedVendedorId);
      }
    }
    const detailedUrl = `/reports/commissions/detailed?${detailedParams.toString()}`;

    Promise.all([
      apiFetch<CommissionSummary[]>(summaryUrl).catch(() => []),
      apiFetch<DetailedCommission[]>(detailedUrl).catch(() => []),
    ])
      .then(([summList, detList]) => {
        setSummaries(summList || []);
        setDetailed(detList || []);
        setSelectedSaleIds([]);
      })
      .catch((err) => {
        toast.error("Erro ao carregar comissões: " + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated, dataInicio, dataFim, statusFiltro, selectedVendedorId]);

  useEffect(() => {
    if (!mounted) return;
    loadData();
  }, [mounted, loadData]);

  // KPIs calculados
  const kpis = useMemo(() => {
    let totalComissao = 0;
    let pagaComissao = 0;
    let pendenteComissao = 0;
    let totalVendido = 0;

    detailed.forEach((d) => {
      totalComissao += d.comissao_valor;
      totalVendido += d.total_vendido;
      if (d.comissao_paga) {
        pagaComissao += d.comissao_valor;
      } else {
        pendenteComissao += d.comissao_valor;
      }
    });

    return {
      totalVendido,
      totalComissao,
      pagaComissao,
      pendenteComissao,
    };
  }, [detailed]);

  // Ação de dar baixa nas selecionadas
  async function handleDarBaixa() {
    if (selectedSaleIds.length === 0) {
      toast.error("Nenhuma comissão selecionada.");
      return;
    }
    setActionSaving(true);
    try {
      await apiFetch("/reports/commissions/pay", {
        method: "POST",
        body: JSON.stringify({ sale_ids: selectedSaleIds }),
      });
      toast.success("Baixa realizada com sucesso!");
      loadData();
    } catch (err: any) {
      toast.error("Erro ao realizar baixa: " + err.message);
    } finally {
      setActionSaving(false);
    }
  }

  // Alternar seleção de venda
  function toggleSaleSelection(id: number) {
    setSelectedSaleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Selecionar/Deselecionar todas as pendentes visíveis
  const pendingVisiveis = useMemo(() => {
    return detailed.filter((d) => !d.comissao_paga);
  }, [detailed]);

  function toggleAllSelection() {
    if (selectedSaleIds.length === pendingVisiveis.length) {
      setSelectedSaleIds([]);
    } else {
      setSelectedSaleIds(pendingVisiveis.map((d) => d.sale_id));
    }
  }

  if (!mounted) return <div className="p-4">Carregando...</div>;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comissões</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdminOrGerente
              ? "Controle de pagamento e evolução de comissões da equipe"
              : "Acompanhe seus rendimentos e histórico de comissão"}
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <FilterBar
        onClear={() => {
          setDataInicio(firstDayMonthISO());
          setDataFim(todayISO());
          setStatusFiltro("todas");
          setSelectedVendedorId("");
        }}
      >
        <div className="flex flex-wrap items-end gap-3 w-full">
          <div className="w-40">
            <Label htmlFor="data-inicio" className="text-xs text-gray-500 font-bold mb-1">Data início</Label>
            <input
              id="data-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div className="w-40">
            <Label htmlFor="data-fim" className="text-xs text-gray-500 font-bold mb-1">Data fim</Label>
            <input
              id="data-fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div className="w-36">
            <Label htmlFor="status-comissao" className="text-xs text-gray-500 font-bold mb-1">Status</Label>
            <Select
              id="status-comissao"
              options={[
                { value: "todas", label: "Todas" },
                { value: "paga", label: "Pagas" },
                { value: "pendente", label: "Pendentes" },
              ]}
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as any)}
              className="w-full text-sm"
            />
          </div>
          {isAdminOrGerente && (
            <div className="w-52">
              <Label htmlFor="filtro-vendedor" className="text-xs text-gray-500 font-bold mb-1">Vendedor</Label>
              <Select
                id="filtro-vendedor"
                options={vendedorOptions}
                value={selectedVendedorId}
                onChange={(e) => setSelectedVendedorId(e.target.value)}
                className="w-full text-sm"
              />
            </div>
          )}
        </div>
      </FilterBar>

      {/* Cards de KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" role="status">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-rose-100 bg-white p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-7 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Total Vendido"
            value={`R$ ${kpis.totalVendido.toFixed(2)}`}
          />
          <KpiCard
            label="Comissão Gerada"
            value={`R$ ${kpis.totalComissao.toFixed(2)}`}
            variant="default"
          />
          <KpiCard
            label="Comissão Paga"
            value={`R$ ${kpis.pagaComissao.toFixed(2)}`}
            variant="success"
          />
          <KpiCard
            label="Comissão Pendente"
            value={`R$ ${kpis.pendenteComissao.toFixed(2)}`}
            variant={kpis.pendenteComissao > 0 ? "alert" : "default"}
          />
        </div>
      )}

      {/* Layout de Conteúdo */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Seção Resumida (Apenas para Admin) */}
          {isAdminOrGerente && summaries.length > 0 && !selectedVendedorId && (
            <Card title="Resumo de Comissões por Vendedor">
              <Table<CommissionSummary>
                keyExtractor={(s) => `summ-${s.user_id ?? "none"}`}
                data={summaries}
                columns={[
                  { key: "nome", label: "Vendedor" },
                  { key: "comissao_percentual", label: "Taxa Padrão", render: (r) => `${r.comissao_percentual}%` },
                  { key: "vendas_count", label: "Vendas Concluídas", render: (r) => `${r.vendas_count} vendas` },
                  { key: "total_vendido", label: "Total Vendido", render: (r) => `R$ ${r.total_vendido.toFixed(2)}` },
                  { key: "comissao_total", label: "Comissão Total", render: (r) => `R$ ${r.comissao_total.toFixed(2)}` },
                  {
                    key: "detalhes",
                    label: "Ação",
                    render: (r) => (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedVendedorId(r.user_id ? String(r.user_id) : "none")}
                      >
                        Ver Detalhado
                      </Button>
                    ),
                  },
                ]}
              />
            </Card>
          )}

          {/* Gráfico de Evolução de Comissão (Visão de Vendedor) */}
          {!isAdminOrGerente && detailed.length > 0 && (
            <Card title="Evolução Recente de Comissões">
              <div className="flex h-36 items-end gap-2 px-4 pt-6 border-b border-gray-100 overflow-x-auto">
                {detailed.slice(0, 15).reverse().map((d) => {
                  const percent = Math.min(100, Math.max(8, (d.comissao_valor / (kpis.totalComissao || 1)) * 100));
                  return (
                    <div key={d.sale_id} className="flex flex-col items-center flex-1 min-w-[32px] group relative">
                      <div
                        style={{ height: `${percent}%` }}
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          d.comissao_paga ? "bg-green-500 hover:bg-green-600" : "bg-rose-500 hover:bg-rose-600"
                        }`}
                      />
                      <div className="absolute bottom-full mb-1 scale-0 group-hover:scale-100 bg-gray-900 text-white text-[10px] rounded px-1.5 py-1 whitespace-nowrap z-10 transition-transform">
                        R$ {d.comissao_valor.toFixed(2)} ({d.comissao_paga ? "Paga" : "Pendente"})
                      </div>
                      <span className="text-[9px] text-gray-400 mt-1 block truncate w-full text-center">
                        {d.data_venda.slice(8, 10)}/{d.data_venda.slice(5, 7)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-gray-500 justify-center">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded" /> Comissões Pagas</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-rose-500 rounded" /> Comissões Pendentes</span>
              </div>
            </Card>
          )}

          {/* Detalhado de Vendas e Comissões */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4 w-full mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Histórico Detalhado</h3>
              {isAdminOrGerente && pendingVisiveis.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={toggleAllSelection}
                  >
                    {selectedSaleIds.length === pendingVisiveis.length
                      ? "Deselecionar Todas"
                      : "Selecionar Todas Pendentes"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={handleDarBaixa}
                    disabled={selectedSaleIds.length === 0 || actionSaving}
                    loading={actionSaving}
                  >
                    Dar Baixa nas Selecionadas ({selectedSaleIds.length})
                  </Button>
                </div>
              )}
            </div>
            {detailed.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Nenhuma venda no período com os filtros selecionados.</p>
            ) : (
              <Table<DetailedCommission>
                keyExtractor={(d) => `sale-comm-${d.sale_id}`}
                data={detailed}
                columns={[
                  ...(isAdminOrGerente
                    ? [
                        {
                          key: "select",
                          label: "Selecionar",
                          render: (r: DetailedCommission) => (
                            <div className="flex justify-center">
                              {!r.comissao_paga ? (
                                <input
                                  type="checkbox"
                                  checked={selectedSaleIds.includes(r.sale_id)}
                                  onChange={() => toggleSaleSelection(r.sale_id)}
                                  className="rounded text-rose-600 focus:ring-rose-400 h-4 w-4 cursor-pointer"
                                />
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </div>
                          ),
                        },
                      ]
                    : []),
                  { key: "sale_id", label: "Venda ID", render: (r) => `#${r.sale_id}` },
                  { key: "vendedor_nome", label: "Vendedor" },
                  { key: "data_venda", label: "Data" },
                  { key: "total_vendido", label: "Valor Líquido", render: (r) => `R$ ${r.total_vendido.toFixed(2)}` },
                  { key: "comissao_percentual", label: "%", render: (r) => `${r.comissao_percentual}%` },
                  { key: "comissao_valor", label: "Comissão", render: (r) => `R$ ${r.comissao_valor.toFixed(2)}` },
                  {
                    key: "comissao_paga",
                    label: "Status",
                    render: (r) => (
                      <Badge variant={r.comissao_paga ? "success" : "danger"}>
                        {r.comissao_paga ? "Paga" : "Pendente"}
                      </Badge>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
