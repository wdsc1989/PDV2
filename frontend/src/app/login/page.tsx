"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { loginJson } from "@/api/client";
import { apiFetch } from "@/api/client";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && auth.isAuthenticated()) router.replace("/");
  }, [mounted, auth.isAuthenticated(), router]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Carregando...</p>
      </div>
    );
  }

  if (auth.isAuthenticated()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Redirecionando...</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const tokens = await loginJson(username, password);
      auth.setTokens(tokens.access_token, tokens.refresh_token);
      const user = await apiFetch<{ id: number; username: string; name: string; role: string }>("/auth/me");
      auth.setUser(user);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow">
        <h1 className="text-xl font-bold text-center mb-4">PDV2 - Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Usuario</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" required />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-2 bg-blue-600 text-white rounded">Entrar</button>
        </form>
      </div>
    </div>
  );
}
