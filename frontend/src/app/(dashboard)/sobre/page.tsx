"use client";

import { Card } from "@/components/ui";

const APP_VERSION = typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_VERSION ? process.env.NEXT_PUBLIC_APP_VERSION : "1.0.0";
const CONTATO_SUPORTE = "suporte@pdv2.local";

const ROADMAP_ITEMS = [
  { label: "Integração mobile", icon: "📱" },
  { label: "App para balança", icon: "⚖️" },
  { label: "Dashboard em tempo real", icon: "📊" },
];

export default function SobrePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Sobre o PDV2</h1>
      <p className="text-sm text-gray-500 mb-6">Versão {APP_VERSION}</p>
      <p className="text-gray-700 mb-6">PDV2 é o sistema de Ponto de Venda evoluído, com backend em FastAPI e frontend em Next.js.</p>

      <Card title="Módulos" className="mb-6">
        <ul className="list-disc pl-6 space-y-1 text-gray-700 text-sm">
          <li><strong>Caixa:</strong> abertura e fechamento de sessão de caixa.</li>
          <li><strong>Vendas:</strong> registro de vendas com sacola e histórico.</li>
          <li><strong>Produtos:</strong> cadastro de produtos e entrada de estoque.</li>
          <li><strong>Estoque:</strong> visão de produtos e entradas com métricas.</li>
          <li><strong>Categorias:</strong> cadastro de categorias de produtos.</li>
          <li><strong>Contas:</strong> contas a pagar e a receber.</li>
          <li><strong>Acessórios:</strong> vendas e estoque por preço.</li>
          <li><strong>Relatórios:</strong> resumo de vendas e lucro por período.</li>
          <li><strong>Administração:</strong> usuários (apenas admin).</li>
        </ul>
      </Card>

      <Card title="Próximos passos" className="mb-6">
        <ul className="space-y-3">
          {ROADMAP_ITEMS.map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-gray-700">
              <span className="text-xl" aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Contato">
        <p className="text-gray-700 text-sm">
          Suporte: <a href={`mailto:${CONTATO_SUPORTE}`} className="text-blue-600 hover:underline">{CONTATO_SUPORTE}</a>
        </p>
      </Card>
    </div>
  );
}
