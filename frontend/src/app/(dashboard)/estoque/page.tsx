"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { Card, Table, Label, Badge, KpiCard, FilterBar, Button, Modal, Input, toast, PageHeader } from "@/components/ui";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Product = {
  id: number;
  codigo: string;
  nome: string;
  categoria: string | null;
  categoria_id: number | null;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number | null;
  ativo: boolean;
};
type StockEntry = { id: number; product_id: number; quantity: number; preco_custo_unitario: number | null; data_entrada: string; observacao: string | null };

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function EstoquePage() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [categories, setCategories] = useState<{ id: number; nome: string }[]>([]);
  const [filterNome, setFilterNome] = useState("");
  const [filterCodigo, setFilterCodigo] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entrySaving, setEntrySaving] = useState(false);
  const [entrySearch, setEntrySearch] = useState("");
  const [entryProduct, setEntryProduct] = useState<Product | null>(null);
  const [entryQty, setEntryQty] = useState("");
  const [entryCusto, setEntryCusto] = useState("");
  const [entryData, setEntryData] = useState(todayStr());
  const [entryObs, setEntryObs] = useState("");
  const [entryErrors, setEntryErrors] = useState<{ produto?: string; qty?: string; custo?: string }>({});

  const loadAll = () => {
    apiFetch<Product[]>("/products?active_only=false").then(setProducts).catch(() => setProducts([]));
    apiFetch<StockEntry[]>("/stock/entries?limit=100").then(setEntries).catch(() => setEntries([]));
    apiFetch<{ id: number; nome: string }[]>("/categories/all").then(setCategories).catch(() => setCategories([]));
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    loadAll();
  }, [mounted, isAuthenticated]);

  function openEntryModal() {
    setEntryProduct(null);
    setEntrySearch("");
    setEntryQty("");
    setEntryCusto("");
    setEntryData(todayStr());
    setEntryObs("");
    setEntryErrors({});
    setEntryModalOpen(true);
  }

  function pickEntryProduct(p: Product) {
    setEntryProduct(p);
    setEntrySearch(p.nome);
    // custo sugerido = custo médio atual do produto; ajuste se o lote veio diferente
    setEntryCusto(p.preco_custo > 0 ? p.preco_custo.toFixed(2) : "");
    setEntryErrors((e) => ({ ...e, produto: undefined }));
  }

  const entryMatches = useMemo(() => {
    const term = entrySearch.trim().toLowerCase();
    if (!term || (entryProduct && entryProduct.nome === entrySearch)) return [];
    return products
      .filter((p) => p.nome.toLowerCase().includes(term) || p.codigo.toLowerCase().includes(term))
      .slice(0, 8);
  }, [entrySearch, products, entryProduct]);

  async function submitEntry() {
    const errs: { produto?: string; qty?: string; custo?: string } = {};
    const qty = parseFloat(entryQty.replace(",", "."));
    const custo = entryCusto.trim() ? parseFloat(entryCusto.replace(",", ".")) : null;
    if (!entryProduct) errs.produto = "Escolha um produto da lista.";
    if (isNaN(qty) || qty <= 0) errs.qty = "Quantidade deve ser maior que zero.";
    if (custo != null && (isNaN(custo) || custo < 0)) errs.custo = "Custo inválido.";
    setEntryErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setEntrySaving(true);
    try {
      await apiFetch("/stock/entries", {
        method: "POST",
        body: JSON.stringify({
          product_id: entryProduct!.id,
          quantity: qty,
          preco_custo_unitario: custo,
          data_entrada: entryData,
          observacao: entryObs.trim() || null,
        }),
      });
      toast.success(
        custo != null
          ? "Entrada registrada. Custo médio do produto atualizado."
          : "Entrada registrada."
      );
      setEntryModalOpen(false);
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar entrada.");
    } finally {
      setEntrySaving(false);
    }
  }

  const filtered = useMemo(() => {
    let list = products;
    if (filterNome.trim()) {
      const n = filterNome.trim().toLowerCase();
      list = list.filter((p) => p.nome.toLowerCase().includes(n));
    }
    if (filterCodigo.trim()) {
      const c = filterCodigo.trim().toLowerCase();
      list = list.filter((p) => p.codigo.toLowerCase().includes(c));
    }
    if (filterCategoria) {
      const cid = parseInt(filterCategoria, 10);
      list = list.filter((p) => p.categoria_id === cid);
    }
    return list;
  }, [products, filterNome, filterCodigo, filterCategoria]);

  const totalProdutos = filtered.length;
  const baixoEstoque = filtered.filter((p) => p.estoque_minimo != null && p.estoque_atual <= p.estoque_minimo).length;
  const valorCusto = filtered.reduce((s, p) => s + p.preco_custo * p.estoque_atual, 0);
  const valorVenda = filtered.reduce((s, p) => s + p.preco_venda * p.estoque_atual, 0);
  const lucroPotencial = filtered.reduce((s, p) => s + (p.preco_venda - p.preco_custo) * p.estoque_atual, 0);

  const chartData = useMemo(() => {
    const byCat: Record<string, { custo: number; venda: number; lucro: number }> = {};
    filtered.forEach((p) => {
      const cat = p.categoria || "Sem categoria";
      if (!byCat[cat]) byCat[cat] = { custo: 0, venda: 0, lucro: 0 };
      byCat[cat].custo += p.preco_custo * p.estoque_atual;
      byCat[cat].venda += p.preco_venda * p.estoque_atual;
      byCat[cat].lucro += (p.preco_venda - p.preco_custo) * p.estoque_atual;
    });
    return Object.entries(byCat).map(([name, v]) => ({
      name: name.length > 12 ? name.slice(0, 12) + "…" : name,
      custo: Math.round(v.custo * 100) / 100,
      venda: Math.round(v.venda * 100) / 100,
      lucro: Math.round(v.lucro * 100) / 100,
    }));
  }, [filtered]);

  function exportExcel() {
    import("xlsx").then((XLSX) => {
      const data = [
        ["Produto", "Quantidade", "Custo unit.", "Preço venda", "Margem (%)", "Valor custo total", "Valor venda total", "Lucro potencial", "Status"],
        ...filtered.map((r) => {
          const valorCustoTotal = r.preco_custo * r.estoque_atual;
          const valorVendaTotal = r.preco_venda * r.estoque_atual;
          const margem = r.preco_venda > 0 ? ((r.preco_venda - r.preco_custo) / r.preco_venda) * 100 : 0;
          const status = r.estoque_minimo != null && r.estoque_atual <= r.estoque_minimo ? "Crítico" : "Ok";
          return [
            r.nome,
            r.estoque_atual,
            r.preco_custo.toFixed(2),
            r.preco_venda.toFixed(2),
            margem.toFixed(1),
            valorCustoTotal.toFixed(2),
            valorVendaTotal.toFixed(2),
            (valorVendaTotal - valorCustoTotal).toFixed(2),
            status,
          ];
        }),
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Estoque");
      XLSX.writeFile(wb, `estoque-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  }

  if (!mounted) return <div className="p-4">Carregando...</div>;

  const categoryOptions = [{ value: "", label: "Todas categorias" }, ...categories.map((c) => ({ value: String(c.id), label: c.nome }))];

  return (
    <div>
      <PageHeader
        title="Estoque"
        subtitle="Visão por produto e por categoria"
        actions={
          <Button variant="primary" onClick={openEntryModal}>
            + Nova entrada
          </Button>
        }
      />

      <FilterBar
        searchValue={filterNome}
        onSearchChange={setFilterNome}
        searchPlaceholder="Filtrar por nome"
        onClear={() => {
          setFilterNome("");
          setFilterCodigo("");
          setFilterCategoria("");
        }}
      >
        <div>
          <Label htmlFor="filtro-codigo" className="sr-only">Código</Label>
          <input
            id="filtro-codigo"
            value={filterCodigo}
            onChange={(e) => setFilterCodigo(e.target.value)}
            placeholder="Código"
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[140px]"
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
        >
          {categoryOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FilterBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard label="Total de produtos" value={String(totalProdutos)} />
        <KpiCard label="Baixo estoque" value={String(baixoEstoque)} variant={baixoEstoque > 0 ? "alert" : "default"} />
        <KpiCard label="Valor custo total" value={`R$ ${valorCusto.toFixed(2)}`} />
        <KpiCard label="Valor venda total" value={`R$ ${valorVenda.toFixed(2)}`} />
        <KpiCard label="Lucro potencial" value={`R$ ${lucroPotencial.toFixed(2)}`} />
      </div>

      {chartData.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Custo vs. venda vs. lucro por categoria</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, ""]} />
                <Legend />
                <Bar dataKey="custo" fill="#94a3b8" name="Custo total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="venda" fill="#2563eb" name="Venda total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucro" fill="#059669" name="Lucro" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="text-lg font-semibold text-gray-900">Produtos</h2>
        <Button variant="secondary" size="sm" onClick={exportExcel}>Exportar Excel</Button>
      </div>
      <div className="mb-8">
        <Table<Product>
          columns={[
            { key: "nome", label: "Produto" },
            { key: "estoque_atual", label: "Quantidade", render: (r) => <span className="text-right block">{r.estoque_atual}</span> },
            { key: "preco_custo", label: "Custo unit.", render: (r) => <span className="text-right block">R$ {r.preco_custo.toFixed(2)}</span> },
            { key: "preco_venda", label: "Preço venda", render: (r) => <span className="text-right block">R$ {r.preco_venda.toFixed(2)}</span> },
            {
              key: "margem",
              label: "Margem (%)",
              render: (r) => {
                const m = r.preco_venda > 0 ? ((r.preco_venda - r.preco_custo) / r.preco_venda) * 100 : 0;
                return <span className="text-right block">{m.toFixed(1)}%</span>;
              },
            },
            {
              key: "valor_custo",
              label: "Valor custo total",
              render: (r) => <span className="text-right block">R$ {(r.preco_custo * r.estoque_atual).toFixed(2)}</span>,
            },
            {
              key: "valor_venda",
              label: "Valor venda total",
              render: (r) => <span className="text-right block">R$ {(r.preco_venda * r.estoque_atual).toFixed(2)}</span>,
            },
            {
              key: "status",
              label: "Status",
              render: (r) =>
                r.estoque_minimo != null && r.estoque_atual <= r.estoque_minimo ? (
                  <Badge variant="danger">Crítico</Badge>
                ) : (
                  <Badge variant="success">Ok</Badge>
                ),
            },
          ]}
          data={filtered}
          keyExtractor={(r) => r.id}
        />
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-2">Últimas entradas de estoque</h2>
      <Table<StockEntry>
        columns={[
          {
            key: "product_id",
            label: "Produto",
            render: (r) => products.find((p) => p.id === r.product_id)?.nome ?? `#${r.product_id}`,
          },
          { key: "quantity", label: "Qtd", render: (r) => <span className="text-right block tabular-nums">{r.quantity}</span> },
          {
            key: "preco_custo_unitario",
            label: "Custo unit.",
            render: (r) => (
              <span className="text-right block tabular-nums">
                {r.preco_custo_unitario != null ? `R$ ${r.preco_custo_unitario.toFixed(2)}` : "—"}
              </span>
            ),
          },
          { key: "data_entrada", label: "Data" },
          { key: "observacao", label: "Obs", render: (r) => r.observacao ?? "—" },
        ]}
        data={entries.slice(0, 50)}
        keyExtractor={(r) => r.id}
      />

      <Modal open={entryModalOpen} onClose={() => setEntryModalOpen(false)} title="Nova entrada de estoque">
        <div className="space-y-3">
          <div className="relative">
            <Label htmlFor="entry-produto">Produto *</Label>
            <Input
              id="entry-produto"
              autoFocus
              placeholder="Digite nome ou código..."
              value={entrySearch}
              aria-invalid={entryErrors.produto ? true : undefined}
              className={entryErrors.produto ? "border-red-500" : ""}
              onChange={(e) => {
                setEntrySearch(e.target.value);
                setEntryProduct(null);
              }}
            />
            {entryErrors.produto && <p role="alert" className="mt-1 text-xs text-red-600">{entryErrors.produto}</p>}
            {entryMatches.length > 0 && (
              <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-auto">
                {entryMatches.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full min-h-[44px] cursor-pointer text-left px-3 py-2 text-sm hover:bg-rose-50 flex justify-between items-center"
                      onClick={() => pickEntryProduct(p)}
                    >
                      <span className="truncate">{p.nome}</span>
                      <span className="ml-2 shrink-0 text-xs text-gray-500">est: {p.estoque_atual}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="entry-qty">Quantidade *</Label>
              <Input
                id="entry-qty"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={entryQty}
                aria-invalid={entryErrors.qty ? true : undefined}
                className={entryErrors.qty ? "border-red-500" : ""}
                onChange={(e) => setEntryQty(e.target.value)}
                onBlur={() => {
                  const q = parseFloat(entryQty.replace(",", "."));
                  setEntryErrors((er) => ({ ...er, qty: isNaN(q) || q <= 0 ? "Quantidade deve ser maior que zero." : undefined }));
                }}
              />
              {entryErrors.qty && <p role="alert" className="mt-1 text-xs text-red-600">{entryErrors.qty}</p>}
            </div>
            <div>
              <Label htmlFor="entry-custo">Custo unitário (R$)</Label>
              <Input
                id="entry-custo"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="opcional"
                value={entryCusto}
                aria-invalid={entryErrors.custo ? true : undefined}
                className={entryErrors.custo ? "border-red-500" : ""}
                onChange={(e) => setEntryCusto(e.target.value)}
              />
              {entryErrors.custo ? (
                <p role="alert" className="mt-1 text-xs text-red-600">{entryErrors.custo}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">Informe para atualizar o custo médio do produto.</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="entry-data">Data</Label>
              <Input id="entry-data" type="date" value={entryData} onChange={(e) => setEntryData(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="entry-obs">Observação</Label>
              <Input id="entry-obs" value={entryObs} onChange={(e) => setEntryObs(e.target.value)} placeholder="ex.: lote fornecedor X" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEntryModalOpen(false)} disabled={entrySaving}>
              Cancelar
            </Button>
            <Button type="button" onClick={submitEntry} loading={entrySaving}>
              Registrar entrada
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
