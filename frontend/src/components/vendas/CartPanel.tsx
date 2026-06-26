"use client";

import { Button } from "@/components/ui";

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4" aria-hidden="true">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className="w-10 h-10 text-rose-200" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

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
  onClear?: () => void;
  total: number;
}

export function CartPanel({ items, onQtyChange, onRemove, onClear }: CartPanelProps) {
  const count = items.reduce((s, i) => s + i.quantidade, 0);
  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-rose-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-rose-100 bg-rose-50">
        <h2 className="font-heading font-semibold text-gray-900 flex items-center gap-2">
          Sacola
          {count > 0 && (
            <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary-700 px-1.5 text-xs font-semibold text-white tabular-nums">
              {count}
            </span>
          )}
        </h2>
        {items.length > 0 && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
          >
            Limpar
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <CartIcon />
            <p className="text-gray-500 text-sm font-medium">Sacola vazia</p>
            <p className="text-gray-400 text-xs max-w-[16rem]">Busque um produto (F2) ou toque na grade para adicionar.</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.product_id}
              className="p-2 rounded-lg border border-gray-100 bg-gray-50 text-sm"
            >
              <div className="flex items-start gap-2">
                <p className="flex-1 min-w-0 font-medium text-gray-900 leading-snug line-clamp-2">{item.nome}</p>
                <button
                  type="button"
                  className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors touch-manipulation"
                  onClick={() => onRemove(item.product_id)}
                  aria-label={`Remover ${item.nome} da sacola`}
                  title="Remover da sacola"
                >
                  <XIcon />
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="!px-0 min-h-[40px] min-w-[40px] touch-manipulation"
                    onClick={() => onQtyChange(item.product_id, Math.max(0, item.quantidade - 1))}
                    aria-label="Diminuir quantidade"
                  >
                    -
                  </Button>
                  <span className="w-7 text-center font-semibold tabular-nums">{item.quantidade}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="!px-0 min-h-[40px] min-w-[40px] touch-manipulation"
                    onClick={() => onQtyChange(item.product_id, item.quantidade + 1)}
                    aria-label="Aumentar quantidade"
                  >
                    +
                  </Button>
                </div>
                <div className="text-right leading-tight">
                  <p className="font-semibold text-gray-900 tabular-nums">R$ {item.subtotal.toFixed(2)}</p>
                  <p className="text-[11px] text-gray-500 tabular-nums">R$ {item.preco_unitario.toFixed(2)} un.</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
