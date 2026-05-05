"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/api/client";
import { Button, Card, Input, Label, toast } from "@/components/ui";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ParsedResponse = {
  status: "need_info" | "confirm" | "error";
  message: string;
  questions: string[];
  records: any[];
};

type ConfirmResult = {
  success: boolean;
  count: number;
  message: string;
};

export default function AgenteContasPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Descreva a conta a cadastrar (a pagar ou a receber). Ex.: \"Conta de energia 120 reais para 10/02/2026\" ou \"Aluguel 800 todo dia 5 de 2026\".",
        },
      ]);
    }
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setLoading(true);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    try {
      const res = await apiFetch<ParsedResponse>("/ai/accounts-agent/parse", {
        method: "POST",
        body: JSON.stringify({ query: q, history }),
      });
      setMessages((prev) => [...prev, { role: "user", content: q }, { role: "assistant", content: res.message }]);
      if (res.status === "confirm" && res.records && res.records.length > 0) {
        setPendingRecords(res.records);
      } else {
        setPendingRecords([]);
      }
      setInput("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao interpretar pedido.";
      setMessages((prev) => [
        ...prev,
        { role: "user", content: q },
        { role: "assistant", content: `Erro: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!pendingRecords.length || loading) return;
    setLoading(true);
    try {
      const res = await apiFetch<ConfirmResult>("/ai/accounts-agent/confirm", {
        method: "POST",
        body: JSON.stringify({ records: pendingRecords }),
      });
      toast.success(res.message || "Contas cadastradas.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `✅ ${res.message || `Cadastro realizado: ${res.count} conta(s).`}` },
      ]);
      setPendingRecords([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar.";
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleCancelPending() {
    setPendingRecords([]);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Cadastro cancelado. Você pode enviar um novo pedido." },
    ]);
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-2rem)]">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Agente de Contas</h1>
      <p className="text-sm text-gray-500 mb-4">
        Cadastre contas a pagar e a receber em linguagem natural. O agente pergunta o que faltar e confirma antes de cadastrar.
      </p>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        <Card className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSend} className="mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3">
            <div>
              <Label htmlFor="msg" className="sr-only">
                Mensagem
              </Label>
              <Input
                id="msg"
                type="text"
                placeholder="Descreva a conta a cadastrar (a pagar ou a receber)..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="submit" disabled={loading || !input.trim()}>
                {loading ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </form>
        </Card>

        {pendingRecords.length > 0 && (
          <Card className="w-full lg:w-80 shrink-0 flex flex-col">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Registros a confirmar</h2>
            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {pendingRecords.map((r, idx) => (
                <div key={idx} className="border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-800">
                  <p className="font-semibold mb-1">
                    {r.tipo === "pagar" ? "Conta a pagar" : "Conta a receber"}
                  </p>
                  {r.fornecedor && <p>Fornecedor: {r.fornecedor}</p>}
                  {r.cliente && <p>Cliente: {r.cliente}</p>}
                  {r.descricao && <p>Descrição: {r.descricao}</p>}
                  <p>Valor: R$ {Number(r.valor || 0).toFixed(2)}</p>
                  <p>Vencimento: {r.data_vencimento}</p>
                  {r.observacao && <p>Obs.: {r.observacao}</p>}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-auto">
              <Button type="button" className="flex-1" onClick={handleConfirm} disabled={loading}>
                {loading ? "Salvando..." : "Sim, cadastrar"}
              </Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={handleCancelPending} disabled={loading}>
                Não, cancelar
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

