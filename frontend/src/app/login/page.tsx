"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { loginJson, apiFetch, assetUrl } from "@/api/client";
import { Button, Input, Label } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<{
    store_name: string;
    logo_path: string | null;
    logo_box_height_login: number | null;
    logo_size_login: number | null;
    logo_width_login: number | null;
    logo_position_login: string | null;
    logo_fit_login: string | null;
  } | null>(null);

  useEffect(() => {
    apiFetch<{
      store_name: string;
      logo_path: string | null;
      logo_box_height_login: number | null;
      logo_size_login: number | null;
      logo_width_login: number | null;
      logo_position_login: string | null;
      logo_fit_login: string | null;
    }>("/settings")
      .then(setSettings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && auth.isAuthenticated()) {
      router.replace(auth.user?.role === "vendedor" ? "/vendas" : "/");
    }
  }, [mounted, auth.isAuthenticated(), auth.user?.role, router]);

  if (!mounted) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-rose-50">
        <p>Carregando...</p>
      </div>
    );
  }

  if (auth.isAuthenticated()) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-rose-50">
        <p>Redirecionando...</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const userErr = username.trim() ? "" : "Informe o usuário.";
    const passErr = password ? "" : "Informe a senha.";
    setUsernameError(userErr);
    setPasswordError(passErr);
    if (userErr || passErr) return;
    setError("");
    setLoading(true);
    try {
      const tokens = await loginJson(username, password);
      auth.setTokens(tokens.access_token, tokens.refresh_token);
      const user = await apiFetch<{ id: number; username: string; name: string; role: string }>("/auth/me");
      auth.setUser(user);
      // vendedor trabalha na venda — vai direto para a tela principal dele
      router.replace(user.role === "vendedor" ? "/vendas" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-rose-50 to-white p-4">
      <div className="w-full max-w-sm rounded-xl border border-rose-100 bg-white p-6 shadow-sm">
        <div className={`flex flex-col mb-6 w-full ${settings?.logo_box_height_login ? "justify-center" : ""} ${
          settings?.logo_position_login === "left"
            ? "items-start"
            : settings?.logo_position_login === "right"
            ? "items-end"
            : "items-center"
        }`}
        style={{ height: settings?.logo_box_height_login ? `${settings.logo_box_height_login}px` : "auto" }}
        >
          {settings?.logo_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(settings.logo_path) ?? undefined}
              alt={settings.store_name}
              style={{
                height: settings?.logo_size_login ? `${settings.logo_size_login}px` : "100%",
                width: settings?.logo_width_login ? `${settings.logo_width_login}px` : "auto",
                objectFit: (settings?.logo_fit_login || "contain") as any,
              }}
              className="mb-4 hover:scale-102 transition-transform duration-300 drop-shadow-md"
            />
          ) : (
            <>
              <h1 className="font-heading text-2xl font-bold text-primary-700 mb-1">PDVCloset</h1>
              <h2 className="font-heading text-lg font-black text-gray-800 text-center leading-snug">
                {settings?.store_name || "Vieira Closet Boutique"}
              </h2>
              <p className="text-xs text-gray-400 mt-1">Painel de Vendas e Controle</p>
            </>
          )}
        </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <Label htmlFor="login-user">Usuário</Label>
            <Input
              id="login-user"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              aria-invalid={usernameError ? true : undefined}
              className={`min-h-[48px] ${usernameError ? "border-red-500" : ""}`}
              onChange={(e) => {
                setUsername(e.target.value);
                if (usernameError && e.target.value.trim()) setUsernameError("");
              }}
            />
            {usernameError && <p role="alert" className="mt-1 text-xs text-red-600">{usernameError}</p>}
          </div>
          <div>
            <Label htmlFor="login-pass">Senha</Label>
            <div className="relative">
              <Input
                id="login-pass"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                aria-invalid={passwordError ? true : undefined}
                className={`min-h-[48px] pr-12 ${passwordError ? "border-red-500" : ""}`}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError && e.target.value) setPasswordError("");
                }}
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-400 rounded-r-lg"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {passwordError && <p role="alert" className="mt-1 text-xs text-red-600">{passwordError}</p>}
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={loading} className="min-h-[48px] w-full">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
