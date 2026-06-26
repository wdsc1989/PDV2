"use client";

import { Button, Input, Label, Segmented } from "@/components/ui";

const PAYMENT_OPTIONS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão" },
  { value: "outro", label: "Outro" },
] as const;

export type PaymentType = (typeof PAYMENT_OPTIONS)[number]["value"];

const QUICK_VALUES = [20, 50, 100, 200];

export interface PaymentPanelProps {
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
  /** Quando definido, o botão fica desabilitado e o motivo aparece abaixo dele. */
  disabledReason?: string | null;
}

export function PaymentPanel({
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
}: PaymentPanelProps) {
  const received = parseFloat(valueReceived) || 0;
  const troco = paymentType === "dinheiro" ? received - total : 0;
  const canFinish =
    total > 0 && !disabledReason && (paymentType !== "dinheiro" || received >= total);

  return (
    <div className="space-y-3 rounded-lg border border-rose-100 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between border-b border-rose-50 pb-2">
        <h2 className="font-heading font-semibold text-gray-900">Pagamento</h2>
        <p className="font-heading text-2xl font-bold tabular-nums text-primary-700">
          R$ {total.toFixed(2)}
        </p>
      </div>

      {/* Desconto no total da venda: % (padrão) ou valor em R$ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="desconto-input">Desconto</Label>
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
        </div>
        <Input
          id="desconto-input"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder={descontoTipo === "percentual" ? "0 %" : "0,00"}
          className="min-h-[44px] tabular-nums"
          value={descontoInput}
          onChange={(e) => onDescontoInputChange(e.target.value)}
        />
        {descontoValor > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 tabular-nums">Subtotal: R$ {subtotalBruto.toFixed(2)}</span>
            <span className="font-medium text-green-700 tabular-nums">− R$ {descontoValor.toFixed(2)}</span>
          </div>
        )}
      </div>

      <Segmented
        ariaLabel="Forma de pagamento"
        options={PAYMENT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        value={paymentType}
        onChange={onPaymentTypeChange}
        columns={2}
      />

      {paymentType === "dinheiro" && (
        <div className="space-y-2">
          <Label htmlFor="valor-recebido">Valor recebido (R$)</Label>
          <Input
            id="valor-recebido"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0,00"
            className="min-h-[48px] text-lg tabular-nums"
            value={valueReceived}
            onChange={(e) => onValueReceivedChange(e.target.value)}
          />
          <div className="grid grid-cols-5 gap-1.5">
            {QUICK_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onValueReceivedChange(String(v))}
                className="min-h-[44px] cursor-pointer rounded-lg border border-rose-200 bg-rose-50 text-sm font-medium tabular-nums text-gray-900 transition-colors duration-150 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                {v}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onValueReceivedChange(total > 0 ? total.toFixed(2) : "")}
              className="min-h-[44px] cursor-pointer rounded-lg border border-rose-200 bg-rose-50 text-sm font-medium text-gray-900 transition-colors duration-150 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              Exato
            </button>
          </div>
          {valueReceived && (
            <p
              role="status"
              className={`text-2xl font-bold tabular-nums ${troco >= 0 ? "text-green-700" : "text-red-600"}`}
            >
              {troco >= 0 ? `Troco: R$ ${troco.toFixed(2)}` : "Valor insuficiente"}
            </p>
          )}
        </div>
      )}

      <Button
        type="button"
        className="min-h-[56px] w-full text-base"
        onClick={onFinish}
        disabled={!canFinish}
        loading={submitting}
      >
        Finalizar venda (F5)
      </Button>
      {disabledReason && (
        <p role="status" className="text-center text-sm font-medium text-amber-700">
          {disabledReason}
        </p>
      )}
    </div>
  );
}
