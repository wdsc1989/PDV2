"use client";

import { Button, Input, Segmented } from "@/components/ui";
import type { PaymentType } from "./PaymentPanel";

const PAYMENT_OPTIONS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão" },
  { value: "outro", label: "Outro" },
] as const;

export interface PaymentBarProps {
  total: number;
  subtotalBruto: number;
  descontoTipo: "percentual" | "valor";
  onDescontoTipoChange: (t: "percentual" | "valor") => void;
  descontoInput: string;
  onDescontoInputChange: (v: string) => void;
  descontoValor: number;
  paymentType: PaymentType;
  onPaymentTypeChange: (t: PaymentType) => void;
  valueReceived: string;
  onValueReceivedChange: (v: string) => void;
  onFinish: () => void;
  submitting: boolean;
  disabledReason?: string | null;
}

/** Barra de pagamento horizontal, fixa no rodapé do desktop (sempre visível). */
export function PaymentBar({
  total,
  subtotalBruto,
  descontoTipo,
  onDescontoTipoChange,
  descontoInput,
  onDescontoInputChange,
  descontoValor,
  paymentType,
  onPaymentTypeChange,
  valueReceived,
  onValueReceivedChange,
  onFinish,
  submitting,
  disabledReason,
}: PaymentBarProps) {
  const received = parseFloat(valueReceived) || 0;
  const troco = paymentType === "dinheiro" ? received - total : 0;
  const canFinish = total > 0 && !disabledReason && (paymentType !== "dinheiro" || received >= total);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {/* Desconto */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Desconto</span>
        <Segmented
          ariaLabel="Tipo de desconto"
          options={[
            { value: "percentual", label: "%" },
            { value: "valor", label: "R$" },
          ]}
          value={descontoTipo}
          onChange={(v) => onDescontoTipoChange(v as "percentual" | "valor")}
          columns={2}
        />
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          aria-label="Valor do desconto"
          placeholder={descontoTipo === "percentual" ? "0 %" : "0,00"}
          className="w-24 min-h-[44px] tabular-nums"
          value={descontoInput}
          onChange={(e) => onDescontoInputChange(e.target.value)}
        />
      </div>

      {/* Forma de pagamento */}
      <div className="min-w-[260px]">
        <Segmented
          ariaLabel="Forma de pagamento"
          options={PAYMENT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={paymentType}
          onChange={onPaymentTypeChange}
          columns={4}
        />
      </div>

      {/* Valor recebido (apenas dinheiro) */}
      {paymentType === "dinheiro" && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            aria-label="Valor recebido"
            placeholder="Recebido"
            className="w-28 min-h-[44px] tabular-nums"
            value={valueReceived}
            onChange={(e) => onValueReceivedChange(e.target.value)}
          />
          {valueReceived && (
            <span className={`text-sm font-semibold tabular-nums ${troco >= 0 ? "text-green-700" : "text-red-600"}`}>
              {troco >= 0 ? `Troco R$ ${troco.toFixed(2)}` : "Insuficiente"}
            </span>
          )}
        </div>
      )}

      {/* Total + Finalizar */}
      <div className="ml-auto flex items-center gap-4">
        <div className="text-right leading-tight">
          {descontoValor > 0 && (
            <p className="text-xs text-gray-400 line-through tabular-nums">R$ {subtotalBruto.toFixed(2)}</p>
          )}
          <p className="font-heading text-2xl font-bold text-primary-700 tabular-nums">R$ {total.toFixed(2)}</p>
        </div>
        <Button
          type="button"
          className="min-h-[52px] px-8 text-base"
          onClick={onFinish}
          disabled={!canFinish}
          loading={submitting}
        >
          Finalizar venda (F5)
        </Button>
      </div>

      {disabledReason && (
        <p role="status" className="w-full text-center text-sm font-medium text-amber-700">
          {disabledReason}
        </p>
      )}
    </div>
  );
}
