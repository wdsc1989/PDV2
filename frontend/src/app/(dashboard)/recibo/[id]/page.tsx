"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { apiFetch, assetUrl } from "@/api/client";
import { Button } from "@/components/ui";

type SaleItem = { id: number; product_id: number; product_nome: string | null; quantidade: number; preco_unitario: number; subtotal: number };
type Sale = {
  id: number;
  data_venda: string;
  subtotal_bruto: number;
  desconto_tipo: string | null;
  desconto_input: number | null;
  desconto_valor: number;
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
  const [settings, setSettings] = useState<{
    logo_path: string | null;
    receipt_show_logo: boolean;
    receipt_header_text: string;
    receipt_footer_text: string;
    receipt_paper_width: number;
    receipt_font_size: number;
    receipt_margin: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated() || !id) return;
    apiFetch<Sale>(`/sales/${id}`)
      .then(setSale)
      .catch((e) => setError(e.message));
      
    apiFetch<any>("/settings")
      .then(setSettings)
      .catch(() => {});
  }, [mounted, isAuthenticated, id]);

  function handlePrint() {
    window.print();
  }

  if (!mounted) return <div className="p-4">Carregando...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!sale) return <div className="p-4">Carregando...</div>;

  const showLogo = settings?.receipt_show_logo ?? true;
  const headerText = settings?.receipt_header_text ?? "Vieira Closet Boutique";
  const footerText = settings?.receipt_footer_text ?? "Obrigado pela preferência.";
  const paperWidth = settings?.receipt_paper_width ?? 80;
  const fontSize = settings?.receipt_font_size ?? 12;
  const margin = settings?.receipt_margin ?? 16;
  const logoPath = settings?.logo_path;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #recibo {
            width: ${paperWidth}mm !important;
            box-shadow: none !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}} />
      <div className="mb-4 flex gap-2 print:hidden">
        <Link href="/vendas"><Button variant="secondary">Voltar às vendas</Button></Link>
        <Button type="button" onClick={handlePrint}>Imprimir recibo</Button>
      </div>
      <div 
        id="recibo" 
        className="bg-white shadow rounded mx-auto print:shadow-none print:max-w-none text-gray-900"
        style={{
          width: `${paperWidth}mm`,
          fontSize: `${fontSize}px`,
          padding: `${margin}px`,
          fontFamily: "Courier New, monospace",
          lineHeight: "1.3"
        }}
      >
        <div className="text-center mb-4 print:mb-2">
          {showLogo && logoPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={assetUrl(logoPath) ?? undefined} 
              alt="Logo Loja" 
              className="h-12 max-w-[80%] object-contain mx-auto mb-2" 
            />
          )}
          <h1 className="text-lg font-bold text-gray-900 uppercase leading-tight">{headerText}</h1>
        </div>
        <p className="text-center text-gray-600 text-sm mb-4">Venda #{sale.id} - {sale.data_venda}</p>
        <table className="w-full border-collapse text-[inherit] mb-4">
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
        <div className="border-t pt-2 text-right space-y-0.5 text-[inherit]">
          {sale.desconto_valor > 0 && (
            <>
              <p className="text-[inherit] text-gray-600">Subtotal: R$ {sale.subtotal_bruto.toFixed(2)}</p>
              <p className="text-[inherit] text-gray-600">
                Desconto{sale.desconto_tipo === "percentual" && sale.desconto_input ? ` (${sale.desconto_input}%)` : ""}: − R$ {sale.desconto_valor.toFixed(2)}
              </p>
            </>
          )}
          <p className="font-semibold">Total: R$ {sale.total_vendido.toFixed(2)}</p>
          {sale.tipo_pagamento && <p className="text-[inherit] text-gray-600">Pagamento: {sale.tipo_pagamento}</p>}
        </div>
        <p className="text-center text-xs text-gray-500 mt-6 italic">{footerText}</p>
      </div>
    </div>
  );
}

