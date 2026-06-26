"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Select, toast } from "@/components/ui";
import { apiFetch } from "@/api/client";

type CashSession = {
  id: number;
  status: string;
  data_abertura: string;
  data_fechamento: string | null;
  valor_abertura: number;
  valor_fechamento: number | null;
  observacao: string | null;
};

interface EditCashModalProps {
  open: boolean;
  onClose: () => void;
  session: CashSession | null;
  onSave: () => void;
}

export function EditCashModal({ open, onClose, session, onSave }: EditCashModalProps) {
  const [valorAbertura, setValorAbertura] = useState("0");
  const [valorFechamento, setValorFechamento] = useState("");
  const [dataAbertura, setDataAbertura] = useState("");
  const [dataFechamento, setDataFechamento] = useState("");
  const [status, setStatus] = useState("aberta");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;

    setValorAbertura(String(session.valor_abertura || 0));
    setValorFechamento(session.valor_fechamento != null ? String(session.valor_fechamento) : "");
    setStatus(session.status || "aberta");
    setObservacao(session.observacao || "");

    // Formatar data_abertura para datetime-local (YYYY-MM-DDTHH:MM)
    if (session.data_abertura) {
      try {
        const d = new Date(session.data_abertura);
        const tzOffset = d.getTimezoneOffset() * 60000;
        setDataAbertura(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
      } catch (err) {
        setDataAbertura("");
      }
    } else {
      setDataAbertura("");
    }

    // Formatar data_fechamento para datetime-local
    if (session.data_fechamento) {
      try {
        const d = new Date(session.data_fechamento);
        const tzOffset = d.getTimezoneOffset() * 60000;
        setDataFechamento(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
      } catch (err) {
        setDataFechamento("");
      }
    } else {
      setDataFechamento("");
    }
  }, [session]);

  if (!open || !session) return null;

  async function handleSave() {
    const valAbert = parseFloat(valorAbertura);
    if (isNaN(valAbert) || valAbert < 0) {
      toast.error("Valor de abertura inválido.");
      return;
    }
    const valFech = valorFechamento.trim() ? parseFloat(valorFechamento) : null;
    if (valFech !== null && (isNaN(valFech) || valFech < 0)) {
      toast.error("Valor de fechamento inválido.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        valor_abertura: valAbert,
        valor_fechamento: valFech,
        status: status,
        observacao: observacao || null,
        data_abertura: dataAbertura ? new Date(dataAbertura).toISOString() : null,
        data_fechamento: dataFechamento ? new Date(dataFechamento).toISOString() : null,
      };

      await apiFetch(`/cash/sessions/${session!.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      toast.success("Sessão de caixa atualizada com sucesso.");
      onSave();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar caixa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white rounded-xl border border-rose-100 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-rose-100 bg-rose-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Editar Sessão de Caixa #{session.id}</h3>
            <p className="text-xs text-gray-500">Alterar valores, status ou datas da sessão de caixa.</p>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-abertura-val">Saldo Inicial (Abertura)</Label>
              <Input
                id="edit-abertura-val"
                type="number"
                step="0.01"
                min="0"
                value={valorAbertura}
                onChange={(e) => setValorAbertura(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="edit-fechamento-val">Saldo Final (Fechamento)</Label>
              <Input
                id="edit-fechamento-val"
                type="number"
                step="0.01"
                min="0"
                placeholder="Não fechado"
                value={valorFechamento}
                onChange={(e) => setValorFechamento(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="edit-abertura-date">Data Abertura</Label>
              <Input
                id="edit-abertura-date"
                type="datetime-local"
                value={dataAbertura}
                onChange={(e) => setDataAbertura(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="edit-fechamento-date">Data Fechamento</Label>
              <Input
                id="edit-fechamento-date"
                type="datetime-local"
                value={dataFechamento}
                onChange={(e) => setDataFechamento(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="edit-cash-status">Status</Label>
              <Select
                id="edit-cash-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: "aberta", label: "Aberto" },
                  { value: "fechada", label: "Fechado" },
                ]}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="edit-cash-obs">Observações</Label>
              <Input
                id="edit-cash-obs"
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-rose-100 bg-rose-50/30 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} loading={saving}>
            Salvar Alterações
          </Button>
        </div>
      </div>
    </div>
  );
}
