"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
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
} from "./icons";

// Vendedor vê só o essencial da operação (vendas, caixa, sobre) — menos menus, menos cliques.
const navItems: { href: string; label: string; roles: string[]; Icon: React.ComponentType }[] = [
  { href: "/", label: "Início", roles: ["admin", "gerente"], Icon: IconHome },
  { href: "/vendas", label: "Vendas", roles: ["admin", "gerente", "vendedor"], Icon: IconCart },
  { href: "/caixa", label: "Caixa", roles: ["admin", "gerente", "vendedor"], Icon: IconCash },
  { href: "/produtos", label: "Produtos", roles: ["admin", "gerente"], Icon: IconPackage },
  { href: "/estoque", label: "Estoque", roles: ["admin", "gerente"], Icon: IconArchive },
  { href: "/categorias", label: "Categorias", roles: ["admin", "gerente"], Icon: IconTag },
  { href: "/contas", label: "Contas", roles: ["admin", "gerente"], Icon: IconReceipt },
  { href: "/acessorios", label: "Acessórios", roles: ["admin", "gerente"], Icon: IconPuzzle },
  { href: "/relatorios", label: "Relatórios", roles: ["admin", "gerente"], Icon: IconBarChart },
  { href: "/agente-relatorios", label: "Agente Relatórios", roles: ["admin", "gerente"], Icon: IconRobot },
  { href: "/agente-contas", label: "Agente Contas", roles: ["admin", "gerente"], Icon: IconRobot },
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

  return (
    <>
      <div className={`p-4 border-b border-rose-900 ${mobileOnly ? "lg:hidden" : ""}`}>
        <Link href="/" className="font-heading font-bold text-lg flex items-center gap-2 text-white" onClick={onNavigate}>
          PDV2
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
              className={`flex items-center gap-3 px-3 py-2 rounded mb-1 ${
                isActive ? "bg-primary-700 text-white" : "text-rose-200 hover:bg-rose-900 hover:text-white"
              }`}
            >
              <Icon />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-3 border-t border-rose-900 space-y-1">
        <p className="text-sm text-rose-200 truncate" title={auth.user?.name}>
          {auth.user?.name}
        </p>
        <p className="text-xs text-rose-400">{auth.user?.role}</p>
      </div>
    </>
  );
}

export function Sidebar({ onNavigate, isMobileOpen, mobileOnly }: SidebarProps) {
  const baseClass = "min-h-screen bg-rose-950 text-white flex flex-col shrink-0";

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
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-rose-950 text-white flex flex-col lg:hidden">
        <SidebarNav onNavigate={onClose} mobileOnly />
      </aside>
    </>
  );
}
