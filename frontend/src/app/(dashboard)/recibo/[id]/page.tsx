"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { Button } from "@/components/ui";

type SaleItem = { id: number; product_id: number; product_nome: string | null; quantidade: number; preco_unitario: number; subtotal: number };
type Sale = {
  id: number;
  data_venda: string;
  total_vendido: number;
  total_lucro: number;
  tipo_pagamento: string | null;
  status: string;
  itens: SaleItem[];
};

export default function ReciboPage() {
  const params = useParams();
  const id = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [sale, setSale] = useState<Sale | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated() || !id) return;
    apiFetch<Sale>(`/sales/${id}`)
      .then(setSale)
      .catch((e) => setError(e.message));
  }, [mounted, isAuthenticated, id]);

  function handlePrint() {
    window.print();
  }

  if (!mounted) return <div className="p-4">Carregando...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!sale) return <div className="p-4">Carregando...</div>;

  return (
    <div>
      <div className="mb-4 flex gap-2 print:hidden">
        <Link href="/vendas"><Button variant="secondary">Voltar às vendas</Button></Link>
        <Button type="button" onClick={handlePrint}>Imprimir recibo</Button>
      </div>
      <div id="recibo" className="bg-white p-6 shadow rounded max-w-md mx-auto print:shadow-none print:max-w-none">
        <div className="text-center mb-4 print:mb-2">
          <div className="h-12 flex items-center justify-center text-gray-400 text-sm mb-2">Logo da loja</div>
          <h1 className="text-xl font-bold text-gray-900">PDV2 - Recibo</h1>
        </div>
        <p className="text-center text-gray-600 text-sm mb-4">Venda #{sale.id} - {sale.data_venda}</p>
        <table className="w-full border-collapse text-sm mb-4">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1">Item</th>
              <th className="text-right py-1">Qtd</th>
              <th className="text-right py-1">Unit.</th>
              <th className="text-right py-1">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.itens?.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-1">{item.product_nome ?? `Produto #${item.product_id}`}</td>
                <td className="text-right py-1">{item.quantidade}</td>
                <td className="text-right py-1">R$ {item.preco_unitario.toFixed(2)}</td>
                <td className="text-right py-1">R$ {item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t pt-2 text-right">
          <p className="font-semibold">Total: R$ {sale.total_vendido.toFixed(2)}</p>
          {sale.tipo_pagamento && <p className="text-sm text-gray-600">Pagamento: {sale.tipo_pagamento}</p>}
        </div>
        <p className="text-center text-xs text-gray-500 mt-6">Obrigado pela preferência.</p>
      </div>
    </div>
  );
}
