"use client";

import { useEffect } from "react";

import { Button, Modal } from "@/components/ui";

export interface SaleSuccessModalProps {
  open: boolean;
  saleId: number | null;
  troco: number;
  onNewSale: () => void;
}

/**
 * Confirmação pós-venda: troco em destaque + imprimir recibo sob gesto do usuário
 * (window.open automático era bloqueado por popup blocker).
 */
export function SaleSuccessModal({ open, saleId, troco, onNewSale }: SaleSuccessModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        onNewSale();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onNewSale]);

  return (
    <Modal open={open} onClose={onNewSale} title="Venda concluída" size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        {troco > 0 ? (
          <div>
            <p className="text-sm text-gray-600">Troco a devolver</p>
            <p className="font-heading text-5xl font-bold tabular-nums text-green-700">
              R$ {troco.toFixed(2)}
            </p>
          </div>
        ) : (
          <p className="text-gray-700">Venda registrada com sucesso.</p>
        )}
        <div className="flex w-full flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-[48px] w-full"
            onClick={() => saleId != null && window.open(`/recibo/${saleId}`, "_blank")}
          >
            Imprimir recibo
          </Button>
          <Button type="button" className="min-h-[48px] w-full" autoFocus onClick={onNewSale}>
            Nova venda (Enter)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
