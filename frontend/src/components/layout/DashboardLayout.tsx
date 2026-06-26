"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Sidebar, SidebarDrawer } from "./Sidebar";
import { Header } from "./Header";
import { ToastContainer } from "@/components/ui";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    auth.logout();
    router.replace("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <SidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} onLogout={handleLogout} />
        <div className="p-4 sm:p-6 flex-1 overflow-auto">{children}</div>
      </main>
      <ToastContainer />
    </div>
  );
}
