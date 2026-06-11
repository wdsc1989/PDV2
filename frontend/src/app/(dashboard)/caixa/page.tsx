"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { Button, Card, Table, Input, Label, Badge, toast, KpiCard, ConfirmModal, PageHeader } from "@/components/ui";

type CashSession = {
  id: number;
  status: string;
  data_abertura: string;
  data_fechamento: string | null;
  valor_abertura: number;
  valor_fechamento: number | null;
};
type Sale = { id: number; cash_session_id: number; total_vendido: number; tipo_pagamento: string | null };

const SESSION_ALERT_HOURS = 12;

export default function CaixaPage() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<CashSession | null>(null);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"idle" | "opening" | "closing">("idle");
  const [valorAbertura, setValorAbertura] = useState("");
  const [valorFechamento, setValorFechamento] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    Promise.all([
      apiFetch<CashSession | null>("/cash/current"),
      apiFetch<CashSession[]>("/cash/sessions?limit=50"),
      apiFetch<Sale[]>("/sales?limit=500"),
    ])
      .then(([current, list, salesList]) => {
        setSession(current);
        setSessions(list);
        setSales(salesList);
      })
      .finally(() => setLoading(false));
  }, [mounted, isAuthenticated]);

  const sessionSales = session ? sales.filter((s) => s.cash_session_id === session.id) : [];
  const totalMovimentado = sessionSales.reduce((a, s) => a + s.total_vendido, 0);
  const byPayment: Record<string, number> = {};
  sessionSales.forEach((s) => {
    const t = s.tipo_pagamento || "não informado";
    byPayment[t] = (byPayment[t] || 0) + s.total_vendido;
  });

  const sessionOpenHours = session?.data_abertura
    ? Math.floor((Date.now() - new Date(session.data_abertura).getTime()) / (1000 * 60 * 60))
    : 0;
  const showLongOpenAlert = !!session && sessionOpenHours >= SESSION_ALERT_HOURS;

  async function openCash() {
    const v = valorAbertura.trim() ? parseFloat(valorAbertura.replace(",", ".")) : 0;
    if (isNaN(v) || v < 0) {
      toast.error("Valor inicial inválido.");
      return;
    }
    setAction("opening");
    try {
      await apiFetch("/cash/open", { method: "POST", body: JSON.stringify({ valor_abertura: v }) });
      toast.success("Caixa aberto.");
      setValorAbertura("");
      const [current, salesList] = await Promise.all([
        apiFetch<CashSession | null>("/cash/current"),
        apiFetch<Sale[]>("/sales?limit=500"),
      ]);
      setSession(current);
      setSales(salesList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao abrir");
    } finally {
      setAction("idle");
    }
  }

  function requestClose() {
    const v = parseFloat(valorFechamento);
    if (Number.isNaN(v)) {
      toast.error("Informe o valor de fechamento.");
      return;
    }
    setConfirmClose(true);
  }

  async function closeCash() {
    const v = parseFloat(valorFechamento);
    if (Number.isNaN(v)) return;
    setAction("closing");
    try {
      await apiFetch("/cash/close", { method: "POST", body: JSON.stringify({ valor_fechamento: v }) });
      toast.success("Caixa fechado.");
      setSession(null);
      setValorFechamento("");
      setConfirmClose(false);
      const list = await apiFetch<CashSession[]>("/cash/sessions?limit=50");
      setSessions(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao fechar");
    } finally {
      setAction("idle");
    }
  }

  function exportCaixaExcel() {
    import("xlsx").then((XLSX) => {
      const data = [
        ["ID", "Abertura", "Fechamento", "Operador", "Saldo inicial", "Saldo final", "Status"],
        ...sessions.map((s) => [
          s.id,
          s.data_abertura ? new Date(s.data_abertura).toLocaleString("pt-BR") : "",
          s.data_fechamento ? new Date(s.data_fechamento).toLocaleString("pt-BR") : "",
          "—",
          s.valor_abertura,
          s.valor_fechamento ?? "",
          s.status,
        ]),
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Sessões");
      XLSX.writeFile(wb, `caixa-sessoes-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  }

  if (!mounted || loading) return <div className="p-4">Carregando...</div>;

  const esperadoDinheiro = session ? (session.valor_abertura || 0) + (byPayment["dinheiro"] || 0) : 0;

  return (
    <div>
      <PageHeader title="Caixa" subtitle="Abertura, fechamento e histórico de sessões" />

      {showLongOpenAlert && (
        <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          Caixa aberto há mais de {SESSION_ALERT_HOURS} horas. Considere fechar.
        </div>
      )}

      {session ? (
        <div className="space-y-4 mb-8">
          <Card className="border-2 border-green-200 bg-green-50">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <Badge variant="success">Aberto</Badge>
                <p className="text-lg font-semibold text-gray-900 mt-2">Valor abertura: R$ {session.valor_abertura?.toFixed(2)}</p>
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiCard label="Total movimentado (sessão)" value={`R$ ${totalMovimentado.toFixed(2)}`} />
            <div className="rounded-lg shadow border border-gray-100 bg-white p-4">
              <p className="text-sm text-gray-600 mb-2">Vendas por forma de pagamento</p>
              <ul className="text-sm space-y-1">
                {Object.entries(byPayment).map(([tipo, val]) => (
                  <li key={tipo} className="flex justify-between">
                    <span className="capitalize">{tipo}</span>
                    <span>R$ {val.toFixed(2)}</span>
                  </li>
                ))}
                {Object.keys(byPayment).length === 0 && <li className="text-gray-500">Nenhuma venda</li>}
              </ul>
            </div>
          </div>
          <Card>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label htmlFor="valor-fech">Valor contado em caixa (R$)</Label>
                <Input
                  id="valor-fech"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0,00"
                  value={valorFechamento}
                  onChange={(e) => setValorFechamento(e.target.value)}
                  className="w-40 tabular-nums"
                />
                <p className="mt-1 text-xs text-gray-500 tabular-nums">
                  Esperado em dinheiro: R$ {esperadoDinheiro.toFixed(2)} (abertura + vendas em dinheiro)
                </p>
              </div>
              <Button variant="danger" onClick={requestClose} loading={action === "closing"}>
                Fechar caixa
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="mb-8 max-w-md">
          <p className="mb-3 text-gray-600">Nenhuma sessão aberta.</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="valor-abertura">Valor inicial (troco)</Label>
              <Input
                id="valor-abertura"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={valorAbertura}
                onChange={(e) => setValorAbertura(e.target.value)}
                className="w-40 tabular-nums"
              />
            </div>
            <Button onClick={openCash} loading={action === "opening"} className="min-h-[44px]">
              Abrir caixa
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <h2 className="text-lg font-semibold text-gray-900">Histórico de sessões</h2>
        <div className="flex gap-2 print:hidden">
          <Button variant="secondary" size="sm" onClick={exportCaixaExcel}>
            Exportar Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            Imprimir (PDF)
          </Button>
        </div>
      </div>
      <Table<CashSession>
        columns={[
          { key: "id", label: "ID" },
          { key: "data_abertura", label: "Abertura", render: (s) => (s.data_abertura ? new Date(s.data_abertura).toLocaleString("pt-BR") : "—") },
          { key: "data_fechamento", label: "Fechamento", render: (s) => (s.data_fechamento ? new Date(s.data_fechamento).toLocaleString("pt-BR") : "—") },
          { key: "operador", label: "Operador", render: () => "—" },
          { key: "valor_abertura", label: "Saldo inicial", render: (s) => <span className="text-right block">R$ {s.valor_abertura?.toFixed(2)}</span> },
          { key: "valor_fechamento", label: "Saldo final", render: (s) => <span className="text-right block">{s.valor_fechamento != null ? "R$ " + s.valor_fechamento.toFixed(2) : "—"}</span> },
          { key: "status", label: "Status", render: (s) => (s.status === "aberta" ? <Badge variant="success">Aberto</Badge> : <Badge variant="default">Fechado</Badge>) },
        ]}
        data={sessions}
        keyExtractor={(s) => s.id}
      />

      <ConfirmModal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={closeCash}
        title="Fechar caixa"
        message={`Confirma o fechamento do caixa com valor R$ ${valorFechamento || "0,00"}?`}
        confirmLabel="Fechar caixa"
        cancelLabel="Cancelar"
        variant="danger"
        loading={action === "closing"}
      />
    </div>
  );
}
