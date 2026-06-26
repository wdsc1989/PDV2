"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { apiFetch, assetUrl } from "@/api/client";
import {
  IconHome,
  IconCash,
  IconCart,
  IconPackage,
  IconArchive,
  IconTag,
  IconReceipt,
  IconPuzzle,
  IconBarChart,
  IconSettings,
  IconInfo,
  IconRobot,
  IconUser,
} from "./icons";

// Vendedor vê só o essencial da operação (vendas, caixa, sobre) — menos menus, menos cliques.
const navItems: { href: string; label: string; roles: string[]; Icon: React.ComponentType }[] = [
  { href: "/", label: "Início", roles: ["admin", "gerente"], Icon: IconHome },
  { href: "/vendas", label: "Vendas", roles: ["admin", "gerente", "vendedor"], Icon: IconCart },
  { href: "/caixa", label: "Caixa", roles: ["admin", "gerente", "vendedor"], Icon: IconCash },
  { href: "/produtos", label: "Produtos", roles: ["admin", "gerente"], Icon: IconPackage },
  { href: "/contas", label: "Contas", roles: ["admin", "gerente"], Icon: IconReceipt },
  { href: "/acessorios", label: "Acessórios", roles: ["admin", "gerente"], Icon: IconPuzzle },
  { href: "/relatorios", label: "Relatórios", roles: ["admin", "gerente"], Icon: IconBarChart },
  { href: "/comissoes", label: "Comissões", roles: ["admin", "gerente", "vendedor"], Icon: IconCash },
  { href: "/looks", label: "Looks (IA)", roles: ["admin", "gerente"], Icon: IconRobot },
  { href: "/clientes", label: "Clientes", roles: ["admin", "gerente"], Icon: IconUser },
  { href: "/admin", label: "Administração", roles: ["admin"], Icon: IconSettings },
  { href: "/sobre", label: "Sobre", roles: ["admin", "gerente", "vendedor"], Icon: IconInfo },
];

interface SidebarProps {
  onNavigate?: () => void;
  isMobileOpen?: boolean;
  mobileOnly?: boolean;
}

function SidebarNav({ onNavigate, mobileOnly }: { onNavigate?: () => void; mobileOnly?: boolean }) {
  const pathname = usePathname();
  const auth = useAuthStore();
  const role = auth.user?.role ?? "";
  const visible = navItems.filter((item) => item.roles.includes(role));
  const [settings, setSettings] = useState<{
    store_name: string;
    logo_path: string | null;
    logo_box_height_sidebar: number | null;
    logo_size_sidebar: number | null;
    logo_width_sidebar: number | null;
    logo_position_sidebar: string | null;
    logo_fit_sidebar: string | null;
  } | null>(null);

  useEffect(() => {
    apiFetch<{
      store_name: string;
      logo_path: string | null;
      logo_box_height_sidebar: number | null;
      logo_size_sidebar: number | null;
      logo_width_sidebar: number | null;
      logo_position_sidebar: string | null;
      logo_fit_sidebar: string | null;
    }>("/settings")
      .then(setSettings)
      .catch(() => {});
  }, []);

  const getAlignmentClass = (pos: string | null | undefined) => {
    switch (pos) {
      case "left":
        return "justify-start px-4";
      case "right":
        return "justify-end px-4";
      default:
        return "justify-center";
    }
  };

  const sidebarBoxHeight = settings?.logo_box_height_sidebar ? `${settings.logo_box_height_sidebar}px` : "176px";

  return (
    <>
      <div
        className={`p-2 border-b border-rose-200 \${mobileOnly ? "lg:hidden" : ""} flex items-center bg-rose-100 overflow-hidden`}
        style={{ height: sidebarBoxHeight }}
      >
        <Link
          href="/"
          className={`flex items-center text-gray-900 w-full h-full \${getAlignmentClass(settings?.logo_position_sidebar)}`}
          onClick={onNavigate}
        >
          {settings?.logo_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(settings.logo_path) ?? undefined}
              alt={settings.store_name}
              style={{
                height: settings.logo_size_sidebar ? `${settings.logo_size_sidebar}px` : "100%",
                width: settings.logo_width_sidebar ? `${settings.logo_width_sidebar}px` : "auto",
                objectFit: (settings.logo_fit_sidebar || "contain") as any,
              }}
              className="rounded hover:scale-102 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center gap-2 w-full px-2.5">
              <span className="w-8 h-8 rounded bg-primary-700 flex items-center justify-center font-bold text-sm shrink-0 text-white">V</span>
              <span className="font-heading font-extrabold text-sm truncate max-w-[170px]" title={settings?.store_name}>
                {settings?.store_name || "Vieira Closet"}
              </span>
            </div>
          )}
        </Link>
      </div>
      <nav className="flex-1 p-2 overflow-y-auto">
        {visible.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2 rounded mb-1 transition-all ${
                isActive
                  ? "bg-primary-700 text-white font-bold shadow-sm shadow-primary-700/25"
                  : "text-gray-600 hover:bg-rose-200/60 hover:text-gray-900"
              }`}
            >
              <Icon />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-3 border-t border-rose-200 space-y-1">
        <p className="text-sm text-gray-800 font-semibold truncate" title={auth.user?.name}>
          {auth.user?.name}
        </p>
        <p className="text-xs text-gray-500">{auth.user?.role}</p>
      </div>
    </>
  );
}

export function Sidebar({ onNavigate, isMobileOpen, mobileOnly }: SidebarProps) {
  const baseClass = "min-h-screen bg-rose-100 text-gray-800 flex flex-col shrink-0 border-r border-rose-200/50";

  if (mobileOnly) {
    return (
      <aside className={`lg:hidden ${baseClass} w-64`}>
        <SidebarNav onNavigate={onNavigate} mobileOnly />
      </aside>
    );
  }

  return (
    <aside className={`hidden lg:flex w-64 ${baseClass}`}>
      <SidebarNav />
    </aside>
  );
}

export function SidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" aria-hidden onClick={onClose} />
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-rose-100 text-gray-800 flex flex-col lg:hidden border-r border-rose-200/50">
        <SidebarNav onNavigate={onClose} mobileOnly />
      </aside>
    </>
  );
}
