"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { KpiCard, Button } from "@/components/ui";
import { SalesLineChart } from "@/components/reports/SalesLineChart";
import type { ReportSummary, SalesByDayRow, TopProductRow } from "@/types/reports";

export default function Home() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [salesByDay, setSalesByDay] = useState<SalesByDayRow[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductRow[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    apiFetch<ReportSummary>("/reports/summary?days=1")
      .then(setSummary)
      .catch(() => setSummary(null));
    apiFetch<SalesByDayRow[]>("/reports/sales-by-day?days=7")
      .then(setSalesByDay)
      .catch(() => setSalesByDay([]));
    apiFetch<TopProductRow[]>("/reports/top-products?days=7&limit=5")
      .then(setTopProducts)
      .catch(() => setTopProducts([]));
  }, [mounted, isAuthenticated]);

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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Início</h1>
          <p className="text-sm text-gray-500">Bem-vindo ao PDV2. Use o menu para navegar.</p>
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
        </div>
      </div>

      <section className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
