"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { IconMenu, IconBell, IconUser, IconLogOut } from "./icons";

type Summary = { produtos_estoque_critico_count: number; contas_vencidas_count: number; leads_pendentes_count?: number };
type CashSession = { data_abertura: string } | null;

interface HeaderProps {
  onMenuClick: () => void;
  onLogout: () => void;
}

export function Header({ onMenuClick, onLogout }: HeaderProps) {
  const auth = useAuthStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cashSession, setCashSession] = useState<CashSession>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Busca inicial e periódica em segundo plano (tempo real)
    function fetchNotifications() {
      apiFetch<Summary>("/reports/summary?days=1").then(setSummary).catch(() => setSummary(null));
      apiFetch<CashSession>("/cash/current").then(setCashSession).catch(() => setCashSession(null));
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling a cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Sincronização instantânea ao clicar no sino
    if (notifOpen) {
      apiFetch<Summary>("/reports/summary?days=1").then(setSummary).catch(() => setSummary(null));
      apiFetch<CashSession>("/cash/current").then(setCashSession).catch(() => setCashSession(null));
    }
  }, [notifOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    if (notifOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  const alertStock = (summary?.produtos_estoque_critico_count ?? 0) > 0;
  const alertContas = (summary?.contas_vencidas_count ?? 0) > 0;
  const alertLeads = (summary?.leads_pendentes_count ?? 0) > 0;
  const cashOpen = !!cashSession?.data_abertura;
  const cashHours = cashSession?.data_abertura
    ? Math.floor((Date.now() - new Date(cashSession.data_abertura).getTime()) / (1000 * 60 * 60))
    : 0;
  const notifCount = [alertStock, alertContas, alertLeads, cashOpen].filter(Boolean).length;

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between shrink-0">
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-600 rounded"
        aria-label="Abrir menu"
      >
        <IconMenu />
      </button>
      <div className="flex-1 lg:hidden" />
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-600 rounded"
            aria-label="Notificações"
          >
            <IconBell />
            {notifCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                {notifCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <p className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">Notificações</p>
              {!summary && !cashSession && (
                <p className="px-3 py-2 text-sm text-gray-500">Carregando...</p>
              )}
              {(summary || cashSession) && (
                <ul className="space-y-0">
                  {alertStock && summary && (
                    <li>
                      <Link
                        href="/estoque"
                        onClick={() => setNotifOpen(false)}
                        className="block px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                      >
                        {summary.produtos_estoque_critico_count} produto(s) em estoque baixo
                      </Link>
                    </li>
                  )}
                  {alertContas && summary && (
                    <li>
                      <Link
                        href="/contas"
                        onClick={() => setNotifOpen(false)}
                        className="block px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                      >
                        {summary.contas_vencidas_count} conta(s) vencida(s)
                      </Link>
                    </li>
                  )}
                  {alertLeads && summary && (
                    <li>
                      <Link
                        href="/clientes"
                        onClick={() => setNotifOpen(false)}
                        className="block px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 font-medium"
                      >
                        {summary.leads_pendentes_count} lead(s) pendente(s) no catálogo
                      </Link>
                    </li>
                  )}
                  {cashOpen && (
                    <li>
                      <Link
                        href="/caixa"
                        onClick={() => setNotifOpen(false)}
                        className={`block px-3 py-2 text-sm hover:bg-gray-50 ${
                          cashHours >= 24 ? "text-red-700 font-medium" : "text-gray-700"
                        }`}
                      >
                        Caixa aberto há {cashHours}h
                      </Link>
                    </li>
                  )}
                  {!alertStock && !alertContas && !alertLeads && !cashOpen && (
                    <li className="px-3 py-2 text-sm text-gray-500">Sem notificações</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-700">
          <IconUser />
          <span>{auth.user?.name}</span>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-600 rounded"
        >
          <IconLogOut />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
}
