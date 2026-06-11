"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Guard de rota: a sidebar esconde, mas URL digitada também precisa respeitar o papel.
const VENDEDOR_PREFIXES = ["/vendas", "/caixa", "/recibo", "/sobre"];
const ADMIN_ONLY_PREFIXES = ["/admin"];

function allowedPath(pathname: string, role: string | undefined): boolean {
  if (role === "vendedor") {
    return VENDEDOR_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }
  if (role === "gerente") {
    return !ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }
  return true; // admin
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!auth.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    if (!allowedPath(pathname, auth.user?.role)) {
      router.replace(auth.user?.role === "vendedor" ? "/vendas" : "/");
    }
  }, [mounted, auth.isAuthenticated(), auth.user?.role, pathname, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!auth.isAuthenticated() || !allowedPath(pathname, auth.user?.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Redirecionando...</p>
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
