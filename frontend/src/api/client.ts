// Chamar o backend diretamente para o header Authorization ser enviado (rewrites do Next não repassam).
const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000") + "/api/v1"
    : "/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getApiBaseForMessage(): string {
  if (typeof window === "undefined") return "backend";
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

// renovação de token com "single-flight": chamadas concorrentes compartilham 1 refresh
let _refreshing: Promise<boolean> | null = null;

async function tentarRefresh(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    try {
      const { useAuthStore } = await import("@/store/auth");
      const rt = useAuthStore.getState().refreshToken || localStorage.getItem("refresh_token");
      if (!rt) return false;
      // fetch cru (fora do apiFetch) p/ não recursar no tratamento de 401
      const res = await fetch(API_BASE + "/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) return false;
      const data = await res.json().catch(() => null);
      if (!data?.access_token || !data?.refresh_token) return false;
      useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    }
  })();
  try {
    return await _refreshing;
  } finally {
    _refreshing = null;
  }
}

const AUTH_PATHS = ["/auth/login", "/auth/login/json", "/auth/refresh"];

export async function apiFetch<T>(path: string, options: RequestInit = {}, _retry = false): Promise<T> {
  const token = getToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  // Em FormData o browser define o Content-Type (com boundary) automaticamente.
  const headers: Record<string, string> = isFormData
    ? { ...(options.headers as Record<string, string>) }
    : { "Content-Type": "application/json", ...(options.headers as Record<string, string>) };
  if (token) headers["Authorization"] = "Bearer " + token;

  let res: Response;
  try {
    res = await fetch(API_BASE + path, { ...options, headers });
  } catch (e) {
    const msg =
      e instanceof TypeError && /fetch/.test(e.message)
        ? `Não foi possível conectar ao servidor. Verifique se o backend está rodando em ${getApiBaseForMessage()}`
        : e instanceof Error ? e.message : "Erro de conexão.";
    throw new Error(msg);
  }

  if (!res.ok) {
    // sessão expirada: tenta renovar o token UMA vez e repetir a requisição antes de desistir
    if (res.status === 401 && !_retry && !AUTH_PATHS.includes(path) && (await tentarRefresh())) {
      return apiFetch<T>(path, options, true);
    }

    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err.detail;
    const msg = Array.isArray(detail)
      ? detail.map((d: { msg?: string }) => d.msg).join("; ")
      : detail || String(res.status);
    if (
      typeof window !== "undefined" &&
      res.status === 401 &&
      !AUTH_PATHS.includes(path) // numa tentativa de login, deixa o formulário mostrar o erro
    ) {
      const { useAuthStore } = await import("@/store/auth");
      useAuthStore.getState().logout();
      window.location.replace("/login");
    }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Baixa um arquivo do backend (com auth) e dispara o download no browser. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(API_BASE + path, { headers });
  if (!res.ok) throw new Error("Falha ao exportar arquivo.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** URL absoluta para arquivos servidos pelo backend (ex.: /uploads/products/x.jpg). */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:/.test(path)) return path;
  const base =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
      : "";
  return base + path;
}

export async function loginJson(username: string, password: string) {
  return apiFetch<{ access_token: string; refresh_token: string }>("/auth/login/json", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}
