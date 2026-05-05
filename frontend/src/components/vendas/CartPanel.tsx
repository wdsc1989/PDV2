"use client";

import { Button } from "@/components/ui";

export type CartItemForPanel = {
  product_id: number;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
};

export interface CartPanelProps {
  items: CartItemForPanel[];
  onQtyChange: (productId: number, newQty: number) => void;
  onRemove: (productId: number) => void;
  total: number;
}

export function CartPanel({ items, onQtyChange, onRemove, total }: CartPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-900">Carrinho</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Carrinho vazio</p>
        ) : (
          items.map((item) => (
            <div
              key={item.product_id}
              className="flex flex-col gap-1 p-2 rounded border border-gray-100 bg-gray-50 text-sm"
            >
              <div className="flex justify-between items-start">
                <p className="font-medium text-gray-900 line-clamp-2 flex-1">{item.nome}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 shrink-0"
                  onClick={() => onRemove(item.product_id)}
                >
                  Remover
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="!px-2 !py-1 min-w-0"
                    onClick={() => onQtyChange(item.product_id, Math.max(0, item.quantidade - 1))}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-medium">{item.quantidade}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="!px-2 !py-1 min-w-0"
                    onClick={() => onQtyChange(item.product_id, item.quantidade + 1)}
                  >
                    +
                  </Button>
                </div>
                <span className="text-gray-600">R$ {item.subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500">R$ {item.preco_unitario.toFixed(2)} un.</p>
            </div>
          ))
        )}
      </div>
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-right font-bold text-lg text-gray-900">Total: R$ {total.toFixed(2)}</p>
      </div>
    </div>
  );
}
