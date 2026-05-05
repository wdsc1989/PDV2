"use client";

import { Button, Badge } from "@/components/ui";

export type ProductForGrid = {
  id: number;
  codigo: string;
  nome: string;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number | null;
  imagem_path: string | null;
  categoria: string | null;
  categoria_id?: number | null;
};

const LOW_STOCK_THRESHOLD = 5;

export interface ProductGridProps {
  products: ProductForGrid[];
  onAdd: (product: ProductForGrid, qty: number) => void;
  loading?: boolean;
}

export function ProductGrid({ products, onAdd, loading }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-3 animate-pulse h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {products.map((p) => {
        const lowStock = p.estoque_minimo != null ? p.estoque_atual <= p.estoque_minimo : p.estoque_atual < LOW_STOCK_THRESHOLD;
        return (
          <div
            key={p.id}
            className={`rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col ${lowStock ? "border-amber-400 border-2" : "border-gray-200"}`}
          >
            <button
              type="button"
              className="flex-1 flex flex-col text-left p-3 w-full"
              onClick={() => p.estoque_atual >= 1 && onAdd(p, 1)}
              disabled={p.estoque_atual < 1}
            >
              <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                {p.imagem_path ? (
                  <img src={p.imagem_path} alt={p.nome} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-2xl">📦</span>
                )}
              </div>
              <p className="font-medium text-gray-900 text-sm line-clamp-2">{p.nome}</p>
              <p className="text-blue-600 font-semibold text-sm mt-1">R$ {p.preco_venda.toFixed(2)}</p>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-xs text-gray-500">Est: {p.estoque_atual}</span>
                {lowStock && <Badge variant="danger">Baixo estoque</Badge>}
              </div>
            </button>
            <div className="p-2 border-t border-gray-100">
              <Button
                type="button"
                size="sm"
                className="w-full"
                onClick={(e) => { e.stopPropagation(); p.estoque_atual >= 1 && onAdd(p, 1); }}
                disabled={p.estoque_atual < 1}
              >
                + Adicionar
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
