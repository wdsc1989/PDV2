"use client";

import { Button, Badge } from "@/components/ui";

export type SaleForList = {
  id: number;
  data_venda: string;
  total_vendido: number;
  status: string;
  created_at?: string;
};

export interface DailySalesListProps {
  sales: SaleForList[];
  onRecibo: (id: number) => void;
  onCancel: (id: number) => void;
  /** Estorno devolve estoque — só admin/gerente (o backend também bloqueia). */
  canCancel?: boolean;
  filterMin?: string;
  filterMax?: string;
  onFilterMinChange?: (v: string) => void;
  onFilterMaxChange?: (v: string) => void;
}

export function DailySalesList({
  sales,
  onRecibo,
  onCancel,
  canCancel = true,
  filterMin = "",
  filterMax = "",
  onFilterMinChange,
  onFilterMaxChange,
}: DailySalesListProps) {
  const minVal = parseFloat(filterMin) || 0;
  const maxVal = parseFloat(filterMax) || Infinity;
  const filtered = sales.filter((s) => s.total_vendido >= minVal && s.total_vendido <= (maxVal || Infinity));

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-gray-900">Vendas do dia</h2>
      {(onFilterMinChange || onFilterMaxChange) && (
        <div className="flex flex-wrap gap-2">
          {onFilterMinChange && (
            <div>
              <label className="text-xs text-gray-600 mr-1">Valor mín</label>
              <input
                type="number"
                step="0.01"
                placeholder="0"
                value={filterMin}
                onChange={(e) => onFilterMinChange(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
              />
            </div>
          )}
          {onFilterMaxChange && (
            <div>
              <label className="text-xs text-gray-600 mr-1">Valor máx</label>
              <input
                type="number"
                step="0.01"
                placeholder="—"
                value={filterMax}
                onChange={(e) => onFilterMaxChange(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
              />
            </div>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">ID</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Data/Hora</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Total</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2 text-sm text-gray-900">{s.id}</td>
                <td className="px-3 py-2 text-sm text-gray-700">
                  {s.created_at ? new Date(s.created_at).toLocaleString("pt-BR") : s.data_venda}
                </td>
                <td className="px-3 py-2 text-sm text-right font-medium">R$ {s.total_vendido.toFixed(2)}</td>
                <td className="px-3 py-2">
                  {s.status === "concluida" ? (
                    <Badge variant="success">Concluída</Badge>
                  ) : s.status === "cancelada" ? (
                    <Badge variant="danger">Cancelada</Badge>
                  ) : (
                    <Badge variant="default">{s.status}</Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  {s.status === "concluida" && (
                    <span className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => onRecibo(s.id)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Recibo
                      </button>
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => onCancel(s.id)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Estornar
                        </button>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
