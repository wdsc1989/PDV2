"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { Card, Table, Label, Badge, KpiCard, FilterBar, Button } from "@/components/ui";
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
type StockEntry = { id: number; product_id: number; quantity: number; data_entrada: string; observacao: string | null };

export default function EstoquePage() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [categories, setCategories] = useState<{ id: number; nome: string }[]>([]);
  const [filterNome, setFilterNome] = useState("");
  const [filterCodigo, setFilterCodigo] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    apiFetch<Product[]>("/products?active_only=false").then(setProducts).catch(() => setProducts([]));
    apiFetch<StockEntry[]>("/stock/entries?limit=100").then(setEntries).catch(() => setEntries([]));
    apiFetch<{ id: number; nome: string }[]>("/categories/all").then(setCategories).catch(() => setCategories([]));
  }, [mounted, isAuthenticated]);

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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Estoque</h1>
      <p className="text-sm text-gray-500 mb-6">Visão por produto e por categoria.</p>

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
          { key: "id", label: "ID" },
          { key: "product_id", label: "Produto ID" },
          { key: "quantity", label: "Qtd", render: (r) => <span className="text-right block">{r.quantity}</span> },
          { key: "data_entrada", label: "Data" },
          { key: "observacao", label: "Obs", render: (r) => r.observacao ?? "—" },
        ]}
        data={entries.slice(0, 50)}
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}
