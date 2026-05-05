"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { Button, Card, Table, Input, Label, Select, toast } from "@/components/ui";

type AccessoryStock = { id: number; preco: number; quantidade: number };
type AccessorySale = { id: number; data_venda: string; preco: number; quantidade: number; repasse_feito: boolean };

export default function AcessoriosPage() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"venda" | "estoque">("venda");
  const [stock, setStock] = useState<AccessoryStock[]>([]);
  const [sales, setSales] = useState<AccessorySale[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [vendaPreco, setVendaPreco] = useState("");
  const [vendaQty, setVendaQty] = useState("1");
  const [entryPreco, setEntryPreco] = useState("");
  const [entryQty, setEntryQty] = useState("");
  const [entryData, setEntryData] = useState(new Date().toISOString().slice(0, 10));

  const loadStock = () => apiFetch<AccessoryStock[]>("/accessories/stock").then(setStock).catch(() => setStock([]));
  const loadSales = () => apiFetch<AccessorySale[]>("/accessories/sales").then(setSales).catch(() => setSales([]));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    loadStock();
    loadSales();
  }, [mounted, isAuthenticated]);

  async function submitVenda(e: React.FormEvent) {
    e.preventDefault();
    const preco = parseFloat(vendaPreco);
    const qty = parseFloat(vendaQty);
    if (Number.isNaN(preco) || Number.isNaN(qty) || qty <= 0) return;
    setError("");
    setSaving(true);
    try {
      await apiFetch("/accessories/sale", { method: "POST", body: JSON.stringify({ preco, quantidade: qty }) });
      toast.success("Venda registrada.");
      setVendaPreco("");
      setVendaQty("1");
      loadStock();
      loadSales();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar venda");
      toast.error(err instanceof Error ? err.message : "Erro ao registrar venda");
    } finally {
      setSaving(false);
    }
  }

  async function submitEntrada(e: React.FormEvent) {
    e.preventDefault();
    const preco = parseFloat(entryPreco);
    const qty = parseFloat(entryQty);
    if (Number.isNaN(preco) || Number.isNaN(qty) || qty <= 0) return;
    setError("");
    setSaving(true);
    try {
      await apiFetch("/accessories/stock/entry", {
        method: "POST",
        body: JSON.stringify({ preco, quantidade: qty, data_entrada: entryData }),
      });
      toast.success("Entrada registrada.");
      setEntryPreco("");
      setEntryQty("");
      loadStock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar entrada");
      toast.error(err instanceof Error ? err.message : "Erro ao registrar entrada");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return <div className="p-4">Carregando...</div>;

  const stockOptions = stock.filter((s) => s.quantidade > 0).map((s) => ({ value: String(s.preco), label: `R$ ${s.preco.toFixed(2)} (est: ${s.quantidade})` }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Acessórios</h1>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === "venda" ? "primary" : "secondary"} onClick={() => setTab("venda")}>Venda</Button>
        <Button variant={tab === "estoque" ? "primary" : "secondary"} onClick={() => setTab("estoque")}>Estoque</Button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {tab === "venda" && (
        <>
          <Card title="Registrar venda" className="mb-6 max-w-md">
            <form onSubmit={submitVenda}>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="venda-preco">Preço (R$) *</Label>
                  <Select
                    id="venda-preco"
                    options={[{ value: "", label: "Selecione..." }, ...stockOptions]}
                    value={vendaPreco}
                    onChange={(e) => setVendaPreco(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="venda-qty">Quantidade *</Label>
                  <Input id="venda-qty" type="number" step="0.01" min="0.01" value={vendaQty} onChange={(e) => setVendaQty(e.target.value)} required />
                </div>
                <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Registrar venda"}</Button>
              </div>
            </form>
          </Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Vendas recentes</h2>
          <Table<AccessorySale>
            columns={[
              { key: "data_venda", label: "Data" },
              { key: "preco", label: "Preço", render: (r) => <span className="text-right block">R$ {r.preco.toFixed(2)}</span> },
              { key: "quantidade", label: "Qtd", render: (r) => <span className="text-right block">{r.quantidade}</span> },
              { key: "repasse_feito", label: "Repasse", render: (r) => r.repasse_feito ? "Sim" : "Não" },
            ]}
            data={sales.slice(0, 30)}
            keyExtractor={(r) => r.id}
          />
        </>
      )}

      {tab === "estoque" && (
        <>
          <Card title="Estoque por preço" className="mb-6">
            <Table<AccessoryStock>
              columns={[
                { key: "preco", label: "Preço (R$)", render: (r) => <span className="text-right block">R$ {r.preco.toFixed(2)}</span> },
                { key: "quantidade", label: "Quantidade", render: (r) => <span className="text-right block">{r.quantidade}</span> },
              ]}
              data={stock}
              keyExtractor={(r) => r.id}
            />
          </Card>
          <Card title="Entrada de estoque" className="max-w-md">
            <form onSubmit={submitEntrada}>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="ent-preco">Preço (R$) *</Label>
                  <Input id="ent-preco" type="number" step="0.01" min="0" value={entryPreco} onChange={(e) => setEntryPreco(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="ent-qty">Quantidade *</Label>
                  <Input id="ent-qty" type="number" step="0.01" min="0.01" value={entryQty} onChange={(e) => setEntryQty(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="ent-data">Data entrada *</Label>
                  <Input id="ent-data" type="date" value={entryData} onChange={(e) => setEntryData(e.target.value)} required />
                </div>
                <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Registrar entrada"}</Button>
              </div>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
