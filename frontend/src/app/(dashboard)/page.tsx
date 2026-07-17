"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { KpiCard, Button, toast } from "@/components/ui";
import { SalesLineChart } from "@/components/reports/SalesLineChart";
import type { ReportSummary, SalesByDayRow, TopProductRow } from "@/types/reports";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const SAZONALIDADE_MERCADO: Record<number, string> = {
  1: "Pós-Natal, liquidação de fim de ano, férias; consumo tende a normalizar.",
  2: "Volta às aulas, Carnaval, pré-páscoa; demanda por roupas e acessórios de festa.",
  3: "Dia da Mulher, volta à rotina; campanhas promocionais no varejo.",
  4: "Páscoa, dias mais frios no Sul/Sudeste; aquecimento em chocolates e vestuário.",
  5: "Dia das Mães, um dos picos de vendas do primeiro semestre.",
  6: "Festas Juninas, Dia dos Namorados; forte movimento em vestuário e presentes.",
  7: "Férias escolares, liquidação de meio de ano; demanda variável por região.",
  8: "Dia dos Pais, preparação para primavera; segundo pico do semestre.",
  9: "Volta às aulas, Dia da Independência; recuperação de estoques.",
  10: "Dia das Crianças, pré-Black Friday; aquecimento para fim de ano.",
  11: "Black Friday e campanhas; um dos maiores meses de vendas do ano.",
  12: "Natal e Réveillon; pico de consumo no varejo.",
};

const SAZONALIDADE_ROUPAS_FEMININAS: Record<number, string> = {
  1: "Liquidação de verão; peças de festa pós-Réveillon; moda praia em promoção.",
  2: "Carnaval: vestidos, looks festa, acessórios. Volta às aulas: uniforme e casual.",
  3: "Dia da Mulher: pico em moda feminina, promoções e presentes. Entrada de outono.",
  4: "Páscoa: looks leves, casacos leves no Sul. Transição outono/inverno.",
  5: "Dia das Mães: um dos melhores meses; presentes, moda festa e casual.",
  6: "Festas juninas: moda casual e térmica. Dia dos Namorados: vestidos e lingerie.",
  7: "Liquidação de inverno. Férias: moda casual e conforto.",
  8: "Dia dos Pais (presentes). Pré-primavera: novidades e cores.",
  9: "Volta às aulas: moda jovem e casual. Dia da Independência; primavera.",
  10: "Primavera/verão: vestidos, shorts, moda praia. Dia das Crianças (maternidade).",
  11: "Black Friday: um dos picos do ano em moda feminina. Réveillon e festas.",
  12: "Natal e Réveillon: vestidos de festa, moda noite; pico de vendas.",
};

type AlertRow = { product_id: number; nome: string; tipo: string; estoque_atual: number; estoque_minimo: number | null };

type Lead = {
  id: number;
  nome: string | null;
  email: string;
  whatsapp: string;
  consent: boolean;
  look_id: number | null;
  product_id: number | null;
  product_nome: string | null;
  look_nome: string | null;
  tipo: "novidades" | "look" | "produto";
  created_at: string;
};

function formatWhatsappLink(phone: string, clientName: string, interestName: string | null, interestType: string) {
  const cleaned = phone.replace(/\D/g, "");
  const number = cleaned.startsWith("55") ? cleaned : (cleaned.length >= 10 ? "55" + cleaned : cleaned);
  
  let text = `Olá${clientName ? ' ' + clientName : ''}! `;
  if (interestType === "produto" && interestName) {
    text += `Vimos no catálogo da Vieira Closet Boutique que você se interessou pelo produto "${interestName}". Como posso te ajudar hoje?`;
  } else if (interestType === "look" && interestName) {
    text += `Vimos no catálogo da Vieira Closet Boutique que você se interessou pela composição de look "${interestName}". Como posso te ajudar hoje?`;
  } else {
    text += `Olá, obrigado por se cadastrar para receber novidades da Vieira Closet Boutique! Como posso te ajudar hoje?`;
  }
  
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export default function Home() {
  const { isAuthenticated } = useAuthStore();
  
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const currentMonthName = MONTH_NAMES[currentMonth - 1];
  const nextMonthName = MONTH_NAMES[nextMonth - 1];
  const [mounted, setMounted] = useState(false);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [salesByDay, setSalesByDay] = useState<SalesByDayRow[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showStockAlerts, setShowStockAlerts] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("pdv2_show_stock_alerts");
    if (saved !== null) {
      setShowStockAlerts(saved === "true");
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    apiFetch<SalesByDayRow[]>("/reports/sales-by-day?days=7")
      .then(setSalesByDay)
      .catch(() => setSalesByDay([]));
    apiFetch<TopProductRow[]>("/reports/top-products?days=7&limit=5")
      .then(setTopProducts)
      .catch(() => setTopProducts([]));
  }, [mounted, isAuthenticated]);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;

    function fetchLiveData() {
      apiFetch<ReportSummary>("/reports/summary?days=1")
        .then(setSummary)
        .catch(() => setSummary(null));
      apiFetch<AlertRow[]>("/reports/alerts")
        .then(setAlerts)
        .catch(() => setAlerts([]));
      apiFetch<Lead[]>("/catalog/leads?nao_atendidos_only=true")
        .then(setLeads)
        .catch(() => setLeads([]));
    }

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 30000); // Polling a cada 30 segundos
    return () => clearInterval(interval);
  }, [mounted, isAuthenticated]);

  async function handleStartContact(lead: Lead) {
    try {
      await apiFetch("/catalog/leads/contact", {
        method: "POST",
        body: JSON.stringify({
          whatsapp: lead.whatsapp,
          mensagem: `Primeiro contato iniciado via Dashboard (WhatsApp) para o interesse no ${
            lead.tipo === "look"
              ? `Look: ${lead.look_nome ?? `#${lead.look_id}`}`
              : lead.tipo === "produto"
              ? `Produto: ${lead.product_nome ?? `#${lead.product_id}`}`
              : "Lançamentos/Novidades"
          }`,
        }),
      });
      // Filtra localmente o lead com o mesmo telefone para sumir imediatamente
      setLeads((prev) => prev.filter((l) => l.whatsapp !== lead.whatsapp));
    } catch (err) {
      console.error("Erro ao marcar lead como contatado:", err);
    }
    
    // Abre o WhatsApp na nova aba
    const url = formatWhatsappLink(lead.whatsapp, lead.nome || "", lead.tipo === "look" ? lead.look_nome : lead.product_nome, lead.tipo);
    window.open(url, "_blank");
  }

  if (!mounted) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Início</h1>
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  const showAlertStock = (summary?.produtos_estoque_critico_count ?? 0) > 0;
  const showAlertContas = (summary?.contas_vencidas_count ?? 0) > 0;

  const stockAlerts = alerts.filter((a) => a.tipo === "estoque_baixo");
  const photoAlerts = alerts.filter((a) => a.tipo === "sem_foto");
  const panelAlerts = [...stockAlerts, ...photoAlerts];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Início</h1>
          <p className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
            <span>Bem-vindo. Use o menu para navegar.</span>
            {panelAlerts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const nextVal = !showStockAlerts;
                  setShowStockAlerts(nextVal);
                  localStorage.setItem("pdv2_show_stock_alerts", String(nextVal));
                }}
                className="text-xs text-primary-700 hover:text-primary-800 font-bold underline transition-colors cursor-pointer"
              >
                {showStockAlerts ? "Ocultar alertas" : `Exibir alertas (${stockAlerts.length} estoque, ${photoAlerts.length} sem foto)`}
              </button>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vendas">
            <Button>+ Nova Venda</Button>
          </Link>
          <Link href="/produtos">
            <Button variant="secondary">+ Novo Produto</Button>
          </Link>
          <Link href="/categorias">
            <Button variant="secondary">+ Nova Categoria</Button>
          </Link>
          <a href="/catalogo" target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">Catálogo público</Button>
          </a>
        </div>
      </div>

      {showStockAlerts && panelAlerts.length > 0 && (
        <section className="mb-8 animate-fade-in space-y-3">
          {stockAlerts.length > 0 && (
            <div className="relative rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
              <button
                type="button"
                onClick={() => {
                  setShowStockAlerts(false);
                  localStorage.setItem("pdv2_show_stock_alerts", "false");
                  toast.success("Alertas ocultados. Você pode reativá-los no link do topo.");
                }}
                className="absolute top-3 right-3 text-amber-700 hover:text-amber-900 p-1 rounded-full hover:bg-amber-100/50 transition-colors cursor-pointer"
                title="Ocultar alertas permanentemente"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
                <span aria-hidden>⚠️</span> Estoque baixo ({stockAlerts.length})
              </h2>
              <ul className="space-y-1 text-sm text-amber-900 pr-6">
                {stockAlerts.slice(0, 8).map((a) => (
                  <li key={`estoque_baixo-${a.product_id}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{a.nome}</span>
                    <span className="shrink-0 text-xs font-medium">
                      Estoque {a.estoque_atual} (mín. {a.estoque_minimo ?? "—"})
                    </span>
                  </li>
                ))}
              </ul>
              {stockAlerts.length > 8 && (
                <p className="mt-2 text-xs text-amber-700">+{stockAlerts.length - 8} outros produtos com estoque baixo</p>
              )}
            </div>
          )}

          {photoAlerts.length > 0 && (
            <div className="relative rounded-lg border-2 border-sky-200 bg-sky-50 p-4">
              <button
                type="button"
                onClick={() => {
                  setShowStockAlerts(false);
                  localStorage.setItem("pdv2_show_stock_alerts", "false");
                  toast.success("Alertas ocultados. Você pode reativá-los no link do topo.");
                }}
                className="absolute top-3 right-3 text-sky-700 hover:text-sky-900 p-1 rounded-full hover:bg-sky-100/50 transition-colors cursor-pointer"
                title="Ocultar alertas permanentemente"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-800">
                <span aria-hidden>🖼️</span> Sem foto no catálogo ({photoAlerts.length})
              </h2>
              <ul className="space-y-1 text-sm text-sky-900 pr-6">
                {photoAlerts.slice(0, 8).map((a) => (
                  <li key={`sem_foto-${a.product_id}`} className="truncate">
                    {a.nome}
                  </li>
                ))}
              </ul>
              {photoAlerts.length > 8 && (
                <p className="mt-2 text-xs text-sky-700">+{photoAlerts.length - 8} outros produtos sem foto</p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Vendas do dia"
            value={summary != null ? `R$ ${summary.total_vendas_hoje.toFixed(2)}` : "—"}
            subtitle={summary != null ? `${summary.vendas_count_hoje} vendas` : undefined}
            href="/vendas"
            linkLabel="Ver vendas"
          />
          <KpiCard
            label="Estoque baixo"
            value={summary?.produtos_estoque_critico_count ?? "—"}
            variant={showAlertStock ? "alert" : "default"}
            href="/estoque"
            linkLabel="Ver estoque"
          />
          <KpiCard
            label="Contas vencidas"
            value={summary?.contas_vencidas_count ?? "—"}
            variant={showAlertContas ? "alert" : "default"}
            href="/contas"
            linkLabel="Ver contas"
          />
          <KpiCard
            label="Ticket médio (hoje)"
            value={summary != null ? `R$ ${summary.ticket_medio_periodo.toFixed(2)}` : "—"}
          />
          <KpiCard
            label="Caixa"
            value={summary != null ? (summary.caixa_aberto ? "Aberto" : "Fechado") : "—"}
            variant={summary?.caixa_aberto ? "success" : "default"}
            href="/caixa"
            linkLabel="Ir ao caixa"
          />
        </div>
      </section>

      {/* Interesses Recentes dos Clientes no Catálogo */}
      <section className="mb-8 bg-white rounded-2xl border border-rose-100/50 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>✨</span> Interesses Recentes (Catálogo)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Clientes que demonstraram interesse em produtos ou looks. Clique para iniciar o atendimento no WhatsApp.</p>
          </div>
          <Link href="/clientes">
            <Button variant="secondary" size="sm">Ver todos contatos</Button>
          </Link>
        </div>

        {leads.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center bg-rose-50/10 rounded-xl border border-dashed border-rose-100">
            Nenhum interesse registrado no catálogo público até o momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.slice(0, 3).map((l) => (
              <div key={l.id} className="relative overflow-hidden rounded-2xl border border-rose-100/40 bg-rose-50/5 p-4 flex flex-col justify-between hover:shadow-md transition-all duration-300">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] text-gray-400 font-semibold">
                      {new Date(l.created_at).toLocaleDateString("pt-BR")} às {new Date(l.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                      l.tipo === "look"
                        ? "bg-purple-100 text-purple-800"
                        : l.tipo === "produto"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {l.tipo === "look" ? "Look (IA)" : l.tipo === "produto" ? "Produto" : "Novidades"}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-gray-900 truncate">{l.nome || "Cliente sem nome"}</h4>
                  <p className="text-xs text-gray-400 truncate mb-3">{l.email}</p>

                  <div className="text-xs border-t border-rose-100/30 pt-3 mt-1 bg-white/40 p-2 rounded-lg border border-rose-50">
                    <span className="text-gray-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Item de Interesse:</span>
                    <span className="font-bold text-rose-600 truncate block">
                      {l.tipo === "look"
                        ? (l.look_nome ? `${l.look_nome} (#${l.look_id})` : `Look #${l.look_id}`)
                        : l.tipo === "produto"
                        ? (l.product_nome ? `${l.product_nome} (#${l.product_id})` : `Produto #${l.product_id}`)
                        : "Novidades e lançamentos"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-rose-100/30 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleStartContact(l)}
                    className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-bold text-xs bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-100/50 transition-all active:scale-95 shadow-sm group cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.59 1.966 14.12 .943 11.998.943c-5.442 0-9.867 4.371-9.87 9.8.001 1.73.473 3.41 1.37 4.912l-.997 3.634 3.75-.973zm12.18-5.926c-.328-.163-1.942-.945-2.242-1.054-.3-.109-.519-.163-.737.163-.218.327-.843 1.054-1.033 1.27-.19.218-.382.245-.71.082-.328-.163-1.385-.503-2.637-1.606-.975-.86-1.632-1.923-1.823-2.25-.19-.327-.02-.504.144-.666.148-.146.328-.382.492-.573.164-.19.219-.327.328-.545.109-.218.055-.409-.027-.573-.082-.164-.737-1.745-1.01-2.4-.266-.641-.532-.553-.732-.563-.19-.01-.409-.01-.628-.01-.218 0-.573.082-.873.409-.3.327-1.147 1.118-1.147 2.727 0 1.609 1.182 3.163 1.346 3.381.164.218 2.325 3.51 5.632 4.912.785.33 1.4.528 1.88.681.79.248 1.5.213 2.065.13.63-.092 1.942-.785 2.215-1.545.273-.76.273-1.409.19-1.545-.082-.136-.3-.218-.628-.382z" />
                    </svg>
                    WhatsApp
                  </button>
                  <span className="text-[10px] text-gray-500 font-medium">{l.whatsapp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Planejamento e Sazonalidades */}
      <section className="mb-8 bg-gradient-to-r from-rose-50/50 to-amber-50/40 rounded-2xl border border-rose-100/40 p-5 shadow-xs">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
          <span className="text-xl">📅</span> Planejamento e Sazonalidades
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Mês Atual */}
          <div className="bg-white/80 rounded-xl border border-rose-100/50 p-4 shadow-2xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Mês Atual: {currentMonthName}
            </span>
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-0.5">Mercado Geral</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{SAZONALIDADE_MERCADO[currentMonth]}</p>
              </div>
              <div className="border-t border-rose-50/60 pt-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-0.5">Moda Feminina</h4>
                <p className="text-sm text-gray-800 font-medium leading-relaxed">{SAZONALIDADE_ROUPAS_FEMININAS[currentMonth]}</p>
              </div>
            </div>
          </div>

          {/* Próximo Mês */}
          <div className="bg-white/80 rounded-xl border border-amber-100/50 p-4 shadow-2xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Próximo Mês: {nextMonthName} (Seja Precavido!)
            </span>
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-0.5">Mercado Geral</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{SAZONALIDADE_MERCADO[nextMonth]}</p>
              </div>
              <div className="border-t border-amber-50/60 pt-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-0.5">Moda Feminina</h4>
                <p className="text-sm text-gray-800 font-medium leading-relaxed">{SAZONALIDADE_ROUPAS_FEMININAS[nextMonth]}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Visão geral</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg shadow border border-rose-100 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Vendas (últimos 7 dias)</h3>
            <div className="h-48">
              <SalesLineChart data={salesByDay} className="h-48" />
            </div>
          </div>
          <div className="rounded-lg shadow border border-rose-100 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Top 5 produtos (7 dias)</h3>
            {topProducts.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Sem vendas no período ainda.</p>
            ) : (
              <ul className="space-y-2">
                {topProducts.map((p) => (
                  <li key={p.product_id} className="flex justify-between text-sm">
                    <span className="truncate pr-2">{p.nome}</span>
                    <span className="font-medium shrink-0">R$ {p.valor_total.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
