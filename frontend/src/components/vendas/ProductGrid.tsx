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

function PackageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className="w-8 h-8 text-rose-300" aria-hidden="true">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  );
}

export function ProductGrid({ products, onAdd, loading }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-lg border border-rose-100 bg-white p-3 animate-pulse h-40" />
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
            className={`rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow duration-150 overflow-hidden flex flex-col ${lowStock ? "border-amber-400 border-2" : "border-rose-100"}`}
          >
            <button
              type="button"
              className="flex-1 flex flex-col text-left p-3 w-full min-h-[44px] touch-manipulation"
              onClick={() => p.estoque_atual >= 1 && onAdd(p, 1)}
              disabled={p.estoque_atual < 1}
              aria-label={`Adicionar ${p.nome} ao carrinho`}
            >
              <div className="aspect-square bg-rose-50 rounded mb-2 flex items-center justify-center overflow-hidden">
                {p.imagem_path ? (
                  <img src={p.imagem_path} alt={p.nome} width={120} height={120} className="w-full h-full object-cover" />
                ) : (
                  <PackageIcon />
                )}
              </div>
              <p className="font-medium text-gray-900 text-sm line-clamp-2">{p.nome}</p>
              <p className="text-primary-700 font-semibold text-sm mt-1">R$ {p.preco_venda.toFixed(2)}</p>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-xs text-gray-500">Est: {p.estoque_atual}</span>
                {lowStock && <Badge variant="danger">Baixo estoque</Badge>}
              </div>
            </button>
            <div className="p-2 border-t border-rose-50">
              <Button
                type="button"
                size="sm"
                className="w-full min-h-[44px]"
                onClick={(e) => { e.stopPropagation(); p.estoque_atual >= 1 && onAdd(p, 1); }}
                disabled={p.estoque_atual < 1}
                aria-label={`Adicionar ${p.nome}`}
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
