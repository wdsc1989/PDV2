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

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json", ...options.headers };
  if (token) (headers as Record<string, string>)["Authorization"] = "Bearer " + token;
  let res: Response;
  try {
    res = await fetch(API_BASE + path, { ...options, headers });
  } catch (e) {
    const msg =
      e instanceof TypeError && (e.message === "Failed to fetch" || e.message.includes("fetch"))
        ? `Não foi possível conectar ao servidor. Verifique se o backend está rodando em ${getApiBaseForMessage()}`
        : e instanceof Error ? e.message : "Erro de conexão.";
    throw new Error(msg);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = err.detail || String(res.status);
    if (
      typeof window !== "undefined" &&
      (res.status === 401 || /invalid|expired|token/i.test(String(msg)))
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

export async function loginJson(username: string, password: string) {
  return apiFetch<{ access_token: string; refresh_token: string }>("/auth/login/json", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}
