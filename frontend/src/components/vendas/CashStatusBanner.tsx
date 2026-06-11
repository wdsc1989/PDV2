"use client";

import { useState } from "react";

import { apiFetch } from "@/api/client";
import { Button, Input, Label, Modal, toast } from "@/components/ui";

export type CashSession = {
  id: number;
  status: string;
  valor_abertura: number;
  data_abertura?: string;
};

export interface CashStatusBannerProps {
  session: CashSession | null;
  loading?: boolean;
  onOpened: (session: CashSession) => void;
}

/** Banner âmbar quando o caixa está fechado, com abertura inline (sem sair da tela de venda). */
export function CashStatusBanner({ session, loading, onOpened }: CashStatusBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [valor, setValor] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading || session) return null;

  async function handleOpen() {
    const v = parseFloat(valor.replace(",", "."));
    if (isNaN(v) || v < 0) {
      setFieldError("Informe o valor inicial em reais (use 0 se não houver troco).");
      return;
    }
    setFieldError("");
    setSubmitting(true);
    try {
      const s = await apiFetch<CashSession>("/cash/open", {
        method: "POST",
        body: JSON.stringify({ valor_abertura: v }),
      });
      toast.success("Caixa aberto. Boas vendas!");
      setModalOpen(false);
      setValor("");
      onOpened(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir o caixa.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        role="status"
        className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-2 text-amber-800">
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
            />
          </svg>
          <p className="text-sm font-medium">
            O caixa está fechado — abra o caixa para registrar vendas.
          </p>
        </div>
        <Button type="button" className="min-h-[44px] shrink-0" onClick={() => setModalOpen(true)}>
          Abrir caixa
        </Button>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Abrir caixa" size="sm">
        <div className="space-y-4">
          <div>
            <Label htmlFor="valor-abertura">Valor inicial em caixa (troco)</Label>
            <Input
              id="valor-abertura"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0,00"
              autoFocus
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleOpen()}
            />
            {fieldError && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {fieldError}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleOpen} loading={submitting}>
              Abrir caixa
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
