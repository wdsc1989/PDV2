"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { Button, Card, Table, Input, Label, Badge, toast, KpiCard } from "@/components/ui";

type Payable = { id: number; fornecedor: string; descricao: string | null; data_vencimento: string; data_pagamento: string | null; valor: number; status: string };
type Receivable = { id: number; cliente: string; descricao: string | null; data_vencimento: string; data_recebimento: string | null; valor: number; status: string };

const today = () => new Date().toISOString().slice(0, 10);

export default function ContasPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"pagar" | "receber">("pagar");
  const [payables, setPayables] = useState<Payable[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formPagar, setFormPagar] = useState({ fornecedor: "", descricao: "", data_vencimento: "", valor: "0", observacao: "" });
  const [formReceber, setFormReceber] = useState({ cliente: "", descricao: "", data_vencimento: "", valor: "0", observacao: "" });

  const loadPayables = () => apiFetch<Payable[]>("/accounts-payable").then(setPayables).catch(() => setPayables([]));
  const loadReceivables = () => apiFetch<Receivable[]>("/accounts-receivable").then(setReceivables).catch(() => setReceivables([]));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    loadPayables();
    loadReceivables();
  }, [mounted, isAuthenticated]);

  async function submitPagar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await apiFetch("/accounts-payable", {
        method: "POST",
        body: JSON.stringify({
          fornecedor: formPagar.fornecedor.trim(),
          descricao: formPagar.descricao.trim() || null,
          data_vencimento: formPagar.data_vencimento,
          valor: parseFloat(formPagar.valor) || 0,
          observacao: formPagar.observacao.trim() || null,
        }),
      });
      toast.success("Conta a pagar criada.");
      setFormPagar({ fornecedor: "", descricao: "", data_vencimento: "", valor: "0", observacao: "" });
      loadPayables();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function submitReceber(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await apiFetch("/accounts-receivable", {
        method: "POST",
        body: JSON.stringify({
          cliente: formReceber.cliente.trim(),
          descricao: formReceber.descricao.trim() || null,
          data_vencimento: formReceber.data_vencimento,
          valor: parseFloat(formReceber.valor) || 0,
          observacao: formReceber.observacao.trim() || null,
        }),
      });
      toast.success("Conta a receber criada.");
      setFormReceber({ cliente: "", descricao: "", data_vencimento: "", valor: "0", observacao: "" });
      loadReceivables();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function marcarPaga(id: number) {
    const hoje = new Date().toISOString().slice(0, 10);
    try {
      await apiFetch(`/accounts-payable/${id}`, { method: "PATCH", body: JSON.stringify({ data_pagamento: hoje }) });
      toast.success("Marcada como paga.");
      loadPayables();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  async function marcarRecebida(id: number) {
    const hoje = new Date().toISOString().slice(0, 10);
    try {
      await apiFetch(`/accounts-receivable/${id}`, { method: "PATCH", body: JSON.stringify({ data_recebimento: hoje }) });
      toast.success("Marcada como recebida.");
      loadReceivables();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  const totalAPagar = useMemo(
    () => payables.filter((p) => p.status !== "paga").reduce((s, p) => s + p.valor, 0),
    [payables]
  );
  const totalAReceber = useMemo(
    () => receivables.filter((r) => r.status !== "recebida").reduce((s, r) => s + r.valor, 0),
    [receivables]
  );
  const contasVencidas = useMemo(() => {
    const hoje = today();
    const pagarVencidas = payables.filter((p) => p.status !== "paga" && p.data_vencimento < hoje).length;
    const receberVencidas = receivables.filter((r) => r.status !== "recebida" && r.data_vencimento < hoje).length;
    return pagarVencidas + receberVencidas;
  }, [payables, receivables]);

  const isVencida = (dataVenc: string, status: string, paidStatus: string) =>
    dataVenc < today() && status !== paidStatus;

  if (!mounted) return <div className="p-4">Carregando...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Contas a Pagar e a Receber</h1>
      <p className="text-sm text-gray-500 mb-4">Controle de contas a pagar e a receber.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Total a pagar" value={`R$ ${totalAPagar.toFixed(2)}`} variant={totalAPagar > 0 ? "alert" : "default"} />
        <KpiCard label="Total a receber" value={`R$ ${totalAReceber.toFixed(2)}`} />
        <KpiCard label="Contas vencidas" value={String(contasVencidas)} variant={contasVencidas > 0 ? "alert" : "default"} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant={tab === "pagar" ? "primary" : "secondary"} onClick={() => setTab("pagar")}>
          A pagar
        </Button>
        <Button variant={tab === "receber" ? "primary" : "secondary"} onClick={() => setTab("receber")}>
          A receber
        </Button>
        <Button variant="secondary" onClick={() => router.push("/agente-contas")}>
          Usar Agente de Contas
        </Button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {tab === "pagar" && (
        <>
          <Card title="Nova conta a pagar" className="mb-6 max-w-2xl">
            <form onSubmit={submitPagar}>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="pagar-fornecedor">Fornecedor *</Label>
                  <Input id="pagar-fornecedor" value={formPagar.fornecedor} onChange={(e) => setFormPagar((f) => ({ ...f, fornecedor: e.target.value }))} required />
                </div>
                <div>
                  <Label htmlFor="pagar-venc">Vencimento *</Label>
                  <Input id="pagar-venc" type="date" value={formPagar.data_vencimento} onChange={(e) => setFormPagar((f) => ({ ...f, data_vencimento: e.target.value }))} required />
                </div>
                <div>
                  <Label htmlFor="pagar-valor">Valor (R$) *</Label>
                  <Input id="pagar-valor" type="number" step="0.01" value={formPagar.valor} onChange={(e) => setFormPagar((f) => ({ ...f, valor: e.target.value }))} required />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="pagar-desc">Descrição</Label>
                  <Input id="pagar-desc" value={formPagar.descricao} onChange={(e) => setFormPagar((f) => ({ ...f, descricao: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                </div>
              </div>
            </form>
          </Card>
          <Table<Payable>
            columns={[
              { key: "descricao", label: "Descrição", render: (r) => r.descricao || r.fornecedor || "—" },
              { key: "valor", label: "Valor", render: (r) => <span className="text-right block">R$ {r.valor.toFixed(2)}</span> },
              { key: "data_vencimento", label: "Vencimento" },
              {
                key: "status",
                label: "Status",
                render: (r) =>
                  r.status === "paga" ? (
                    <Badge variant="success">Paga</Badge>
                  ) : isVencida(r.data_vencimento, r.status, "paga") ? (
                    <Badge variant="danger">Vencida</Badge>
                  ) : (
                    <Badge variant="warning">Pendente</Badge>
                  ),
              },
            ]}
            data={payables}
            keyExtractor={(r) => r.id}
            actions={(p) =>
              p.status !== "paga" ? (
                <Button type="button" variant="primary" size="sm" onClick={() => marcarPaga(p.id)}>Marcar como paga</Button>
              ) : null
            }
            getRowClassName={(p) => (p.status !== "paga" && isVencida(p.data_vencimento, p.status, "paga") ? "bg-red-50 border-l-4 border-red-400" : "")}
          />
        </>
      )}

      {tab === "receber" && (
        <>
          <Card title="Nova conta a receber" className="mb-6 max-w-2xl">
            <form onSubmit={submitReceber}>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="rec-cliente">Cliente *</Label>
                  <Input id="rec-cliente" value={formReceber.cliente} onChange={(e) => setFormReceber((f) => ({ ...f, cliente: e.target.value }))} required />
                </div>
                <div>
                  <Label htmlFor="rec-venc">Vencimento *</Label>
                  <Input id="rec-venc" type="date" value={formReceber.data_vencimento} onChange={(e) => setFormReceber((f) => ({ ...f, data_vencimento: e.target.value }))} required />
                </div>
                <div>
                  <Label htmlFor="rec-valor">Valor (R$) *</Label>
                  <Input id="rec-valor" type="number" step="0.01" value={formReceber.valor} onChange={(e) => setFormReceber((f) => ({ ...f, valor: e.target.value }))} required />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="rec-desc">Descrição</Label>
                  <Input id="rec-desc" value={formReceber.descricao} onChange={(e) => setFormReceber((f) => ({ ...f, descricao: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                </div>
              </div>
            </form>
          </Card>
          <Table<Receivable>
            columns={[
              { key: "descricao", label: "Descrição", render: (r) => r.descricao || r.cliente || "—" },
              { key: "valor", label: "Valor", render: (r) => <span className="text-right block">R$ {r.valor.toFixed(2)}</span> },
              { key: "data_vencimento", label: "Vencimento" },
              {
                key: "status",
                label: "Status",
                render: (r) =>
                  r.status === "recebida" ? (
                    <Badge variant="success">Recebida</Badge>
                  ) : isVencida(r.data_vencimento, r.status, "recebida") ? (
                    <Badge variant="danger">Vencida</Badge>
                  ) : (
                    <Badge variant="warning">Pendente</Badge>
                  ),
              },
            ]}
            data={receivables}
            keyExtractor={(r) => r.id}
            actions={(r) =>
              r.status !== "recebida" ? (
                <Button type="button" variant="primary" size="sm" onClick={() => marcarRecebida(r.id)}>Marcar como recebida</Button>
              ) : null
            }
            getRowClassName={(r) => (r.status !== "recebida" && isVencida(r.data_vencimento, r.status, "recebida") ? "bg-red-50 border-l-4 border-red-400" : "")}
          />
        </>
      )}
    </div>
  );
}
