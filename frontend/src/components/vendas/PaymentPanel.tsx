"use client";

import { Button, Input, Label } from "@/components/ui";

const PAYMENT_OPTIONS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "pix", label: "PIX" },
  { value: "outro", label: "Outro" },
] as const;

export type PaymentType = (typeof PAYMENT_OPTIONS)[number]["value"];

export interface PaymentPanelProps {
  total: number;
  paymentType: PaymentType;
  onPaymentTypeChange: (t: PaymentType) => void;
  valueReceived: string;
  onValueReceivedChange: (v: string) => void;
  onFinish: () => void;
  submitting: boolean;
}

export function PaymentPanel({
  total,
  paymentType,
  onPaymentTypeChange,
  valueReceived,
  onValueReceivedChange,
  onFinish,
  submitting,
}: PaymentPanelProps) {
  const received = parseFloat(valueReceived) || 0;
  const troco = paymentType === "dinheiro" ? received - total : 0;
  const canFinish = total > 0 && (paymentType !== "dinheiro" || received >= total);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
      <h2 className="font-semibold text-gray-900">Pagamento</h2>
      <div className="space-y-2">
        {PAYMENT_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="payment"
              value={opt.value}
              checked={paymentType === opt.value}
              onChange={() => onPaymentTypeChange(opt.value)}
              className="rounded"
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>
      {paymentType === "dinheiro" && (
        <div className="space-y-2">
          <Label htmlFor="valor-recebido">Valor recebido (R$)</Label>
          <Input
            id="valor-recebido"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={valueReceived}
            onChange={(e) => onValueReceivedChange(e.target.value)}
          />
          {valueReceived && (
            <p className={`text-sm font-medium ${troco >= 0 ? "text-green-700" : "text-red-600"}`}>
              {troco >= 0 ? `Troco: R$ ${troco.toFixed(2)}` : "Valor insuficiente"}
            </p>
          )}
        </div>
      )}
      <Button
        type="button"
        className="w-full"
        onClick={onFinish}
        disabled={!canFinish || submitting}
      >
        {submitting ? "Finalizando..." : "Finalizar venda (F5)"}
      </Button>
    </div>
  );
}
