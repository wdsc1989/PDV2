"use client";

import { useEffect, useState, useRef } from "react";
import { apiFetch } from "@/api/client";
import { Button, Card, Input } from "@/components/ui";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type TableData = {
  columns: string[];
  rows: any[][];
} | null;

type QueryResponse = {
  messages: ChatMessage[];
  table_data: TableData;
  raw_result: any;
};

export default function AgenteRelatoriosPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [tableData, setTableData] = useState<TableData>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialLoaded) return;
    setInitialLoaded(true);
    apiFetch<string>("/ai/report-agent/initial")
      .then((text) => {
        if (text) {
          setMessages([{ role: "assistant", content: text }]);
        }
      })
      .catch(() => {
        // silencioso – agente continua utilizável
      });
  }, [initialLoaded]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, tableData]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setLoading(true);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    try {
      const res = await apiFetch<QueryResponse>("/ai/report-agent/query", {
        method: "POST",
        body: JSON.stringify({ query: q, history }),
      });
      setMessages((prev) => [...prev, ...res.messages]);
      setTableData(res.table_data ?? null);
      setInput("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao consultar o agente.";
      setMessages((prev) => [
        ...prev,
        { role: "user", content: q },
        { role: "assistant", content: `**Erro:** ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-2rem)]">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Agente de Relatórios</h1>
      <p className="text-sm text-gray-500 mb-4">
        Faça perguntas em linguagem natural sobre vendas, estoque, caixa e contas.
      </p>

      <Card className="flex-1 min-h-0 flex flex-col mb-4">
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-gray-500">
              Exemplo: &quot;Quanto vendi este mês?&quot;, &quot;Produtos mais vendidos da semana&quot;, &quot;Contas
              a pagar do próximo mês&quot;.
            </p>
          )}
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
          {tableData && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1">Dados resumidos</p>
              <div className="overflow-x-auto rounded border border-gray-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {tableData.columns.map((c) => (
                        <th
                          key={c}
                          className="px-2 py-1 text-left font-medium text-gray-600 uppercase tracking-wide"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.rows.map((row, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        {row.map((cell, j) => (
                          <td key={j} className="px-2 py-1 text-gray-800">
                            {String(cell ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={handleSend} className="mt-3 flex gap-2 border-t border-gray-200 pt-3">
          <Input
            type="text"
            placeholder="Pergunte sobre faturamento, estoque, caixa ou contas..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            {loading ? "Enviando..." : "Enviar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

