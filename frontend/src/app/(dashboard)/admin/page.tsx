"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { Button, Modal, Table, Input, Label, Select, Badge, toast, Card, EmptyState, ConfirmModal } from "@/components/ui";

type User = { id: number; username: string; name: string; role: string; active: boolean; signo: string | null };

type AIConfig = {
  provider: string;
  api_key?: string | null;
  model?: string | null;
  base_url?: string | null;
  enabled: boolean;
};

const ROLES = ["admin", "gerente", "vendedor"];

const PASSWORD_REQUIREMENTS = "Mínimo 8 caracteres, uma maiúscula, um número e um caractere especial.";
function validatePasswordStrong(p: string): boolean {
  if (p.length < 8) return false;
  if (!/[A-Z]/.test(p)) return false;
  if (!/[0-9]/.test(p)) return false;
  if (!/[^A-Za-z0-9]/.test(p)) return false;
  return true;
}

const CONFIG_KEYS = { reciboLogo: "pdv_config_recibo_logo", reciboMensagem: "pdv_config_recibo_mensagem", estoqueMinimoPadrao: "pdv_config_estoque_minimo_padrao" };

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    username: "",
    name: "",
    password: "",
    role: "vendedor",
    signo: "",
    active: true,
  });
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [resetPasswordNew, setResetPasswordNew] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [deactivateUserId, setDeactivateUserId] = useState<number | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deleteAiProvider, setDeleteAiProvider] = useState<string | null>(null);
  const [deletingAi, setDeletingAi] = useState(false);
  const [config, setConfig] = useState({
    reciboLogo: "",
    reciboMensagem: "",
    estoqueMinimoPadrao: "",
  });
  const [aiConfigs, setAiConfigs] = useState<AIConfig[]>([]);
  const [aiActive, setAiActive] = useState<any | null>(null);
  const [aiForm, setAiForm] = useState({
    provider: "openai",
    api_key: "",
    model: "",
    base_url: "",
    enabled: true,
  });
  const [aiSaving, setAiSaving] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);

  const loadUsers = () => apiFetch<User[]>("/users").then(setUsers).catch(() => setUsers([]));
  const loadAiConfigs = () => {
    apiFetch<AIConfig[]>("/ai/config").then(setAiConfigs).catch(() => setAiConfigs([]));
    apiFetch<any>("/ai/config/active").then(setAiActive).catch(() => setAiActive(null));
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    if (user?.role !== "admin") {
      router.replace("/");
      return;
    }
    loadUsers();
    loadAiConfigs();
  }, [mounted, isAuthenticated, user?.role, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setConfig({
      reciboLogo: localStorage.getItem(CONFIG_KEYS.reciboLogo) || "",
      reciboMensagem: localStorage.getItem(CONFIG_KEYS.reciboMensagem) || "",
      estoqueMinimoPadrao: localStorage.getItem(CONFIG_KEYS.estoqueMinimoPadrao) || "",
    });
  }, [mounted]);

  function saveConfig() {
    if (typeof window === "undefined") return;
    localStorage.setItem(CONFIG_KEYS.reciboLogo, config.reciboLogo);
    localStorage.setItem(CONFIG_KEYS.reciboMensagem, config.reciboMensagem);
    localStorage.setItem(CONFIG_KEYS.estoqueMinimoPadrao, config.estoqueMinimoPadrao);
    toast.success("Configurações salvas (armazenamento local).");
  }

  async function saveAiConfig(e: React.FormEvent) {
    e.preventDefault();
    setAiSaving(true);
    try {
      if (aiForm.provider !== "ollama" && !aiForm.api_key.trim()) {
        toast.error("Informe a chave de API para o provedor selecionado (exceto Ollama).");
        setAiSaving(false);
        return;
      }
      await apiFetch<AIConfig>("/ai/config", {
        method: "POST",
        body: JSON.stringify({
          provider: aiForm.provider,
          api_key: aiForm.api_key.trim() || (aiForm.provider === "ollama" ? "ollama" : ""),
          model: aiForm.model.trim() || null,
          base_url: aiForm.provider === "ollama" ? aiForm.base_url.trim() || "http://localhost:11434" : null,
          enabled: aiForm.enabled,
        }),
      });
      toast.success("Configuração de IA salva.");
      loadAiConfigs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar configuração de IA");
    } finally {
      setAiSaving(false);
    }
  }

  async function deleteAiConfig() {
    if (deleteAiProvider == null) return;
    setDeletingAi(true);
    try {
      await apiFetch(`/ai/config/${deleteAiProvider}`, { method: "DELETE" });
      toast.success("Configuração removida.");
      loadAiConfigs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover configuração");
    } finally {
      setDeletingAi(false);
      setDeleteAiProvider(null);
    }
  }

  async function testAiConnection() {
    setAiTesting(true);
    try {
      const res = await apiFetch<{ success: boolean; message: string }>("/ai/test");
      if (res.success) {
        toast.success(res.message || "Conexão realizada com sucesso.");
      } else {
        toast.error(res.message || "Falha ao testar conexão.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao testar conexão de IA");
    } finally {
      setAiTesting(false);
    }
  }

  async function submitResetPassword() {
    if (resetPasswordUserId == null) return;
    if (resetPasswordNew !== resetPasswordConfirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (!validatePasswordStrong(resetPasswordNew)) {
      toast.error(PASSWORD_REQUIREMENTS);
      return;
    }
    setResetSaving(true);
    try {
      await apiFetch(`/users/${resetPasswordUserId}`, { method: "PATCH", body: JSON.stringify({ password: resetPasswordNew }) });
      toast.success("Senha redefinida.");
      setResetPasswordUserId(null);
      setResetPasswordNew("");
      setResetPasswordConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao redefinir senha");
    } finally {
      setResetSaving(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({ username: "", name: "", password: "", role: "vendedor", signo: "", active: true });
    setShowModal(true);
    setError("");
  }

  function openEdit(u: User) {
    setEditingId(u.id);
    setForm({
      username: u.username,
      name: u.name,
      password: "",
      role: u.role,
      signo: u.signo || "",
      active: u.active,
    });
    setShowModal(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editingId !== null) {
        const body: { name?: string; role?: string; active?: boolean; signo?: string | null; password?: string } = {
          name: form.name.trim(),
          role: form.role,
          active: form.active,
          signo: form.signo.trim() || null,
        };
        if (form.password.trim()) {
          if (!validatePasswordStrong(form.password)) {
            setError(PASSWORD_REQUIREMENTS);
            setSaving(false);
            return;
          }
          body.password = form.password;
        }
        await apiFetch(`/users/${editingId}`, { method: "PATCH", body: JSON.stringify(body) });
        toast.success("Usuário atualizado.");
      } else {
        if (!form.password.trim()) {
          setError("Senha é obrigatória na criação.");
          setSaving(false);
          return;
        }
        await apiFetch("/users", {
          method: "POST",
          body: JSON.stringify({
            username: form.username.trim(),
            name: form.name.trim(),
            password: form.password,
            role: form.role,
            signo: form.signo.trim() || null,
          }),
        });
        toast.success("Usuário criado.");
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (deactivateUserId == null) return;
    setDeactivating(true);
    try {
      await apiFetch(`/users/${deactivateUserId}`, { method: "PATCH", body: JSON.stringify({ active: false }) });
      toast.success("Usuário desativado.");
      loadUsers();
      if (editingId === deactivateUserId) setShowModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desativar");
    } finally {
      setDeactivating(false);
      setDeactivateUserId(null);
    }
  }

  if (!mounted) return <div className="p-4">Carregando...</div>;
  if (user?.role !== "admin") return null;

  const roleOptions = ROLES.map((r) => ({ value: r, label: r }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Administração</h1>
      <p className="text-sm text-gray-500 mb-6">Gerencie usuários, configurações e integrações de IA.</p>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="primary" onClick={openCreate}>Novo usuário</Button>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId !== null ? "Editar usuário" : "Cadastrar usuário"}
      >
        <form onSubmit={handleSubmit}>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <div className="grid gap-3">
            {editingId === null && (
              <div>
                <Label htmlFor="admin-username">Login (username) *</Label>
                <Input id="admin-username" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required />
              </div>
            )}
            {editingId !== null && (
              <div>
                <Label>Login</Label>
                <p className="text-gray-700 py-1">{form.username}</p>
              </div>
            )}
            <div>
              <Label htmlFor="admin-name">Nome *</Label>
              <Input id="admin-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="admin-pwd">Senha {editingId === null ? "*" : "(deixe em branco para não alterar)"}</Label>
              <Input id="admin-pwd" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={editingId !== null ? "••••••••" : ""} />
              {editingId === null && <p className="text-xs text-gray-500 mt-1">{PASSWORD_REQUIREMENTS}</p>}
            </div>
            <div>
              <Label htmlFor="admin-role">Papel</Label>
              <Select id="admin-role" options={roleOptions} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="admin-signo">Signo</Label>
              <Input id="admin-signo" value={form.signo} onChange={(e) => setForm((f) => ({ ...f, signo: e.target.value }))} />
            </div>
            {editingId !== null && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="admin-active" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="rounded" />
                <Label htmlFor="admin-active">Ativo</Label>
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            </div>
          </div>
        </form>
      </Modal>

      <Card title="Usuários" className="mb-6">
        <Table<User>
          columns={[
            { key: "name", label: "Nome" },
            { key: "username", label: "Username" },
            { key: "role", label: "Papel" },
            { key: "active", label: "Status", render: (r) => (r.active ? <Badge variant="success">Ativo</Badge> : <Badge variant="default">Inativo</Badge>) },
          ]}
          data={users}
          keyExtractor={(u) => u.id}
          actions={(u) => (
            <div className="flex flex-wrap gap-1">
              <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(u)}>Editar</Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => { setResetPasswordUserId(u.id); setResetPasswordNew(""); setResetPasswordConfirm(""); }}>Redefinir senha</Button>
              {u.active && u.id !== user?.id && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setDeactivateUserId(u.id)} className="text-red-600">Desativar</Button>
              )}
            </div>
          )}
        />
      </Card>

      <Card title="Configurações" className="mt-4 max-w-xl">
        <p className="text-sm text-gray-500 mb-4">Recibo e parâmetros (armazenados localmente até integração com servidor).</p>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="config-logo">URL do logo (recibo)</Label>
            <Input id="config-logo" type="url" value={config.reciboLogo} onChange={(e) => setConfig((c) => ({ ...c, reciboLogo: e.target.value }))} placeholder="https://..." />
          </div>
          <div>
            <Label htmlFor="config-msg">Mensagem de rodapé (recibo)</Label>
            <Input id="config-msg" value={config.reciboMensagem} onChange={(e) => setConfig((c) => ({ ...c, reciboMensagem: e.target.value }))} placeholder="Obrigado pela preferência" />
          </div>
          <div>
            <Label htmlFor="config-estoque">Estoque mínimo padrão</Label>
            <Input id="config-estoque" type="number" min="0" value={config.estoqueMinimoPadrao} onChange={(e) => setConfig((c) => ({ ...c, estoqueMinimoPadrao: e.target.value }))} placeholder="Ex: 5" />
          </div>
          <Button type="button" onClick={saveConfig}>Salvar configurações</Button>
        </div>
      </Card>

      <Card title="Configuração de IA (Agentes)" className="mt-6 max-w-xl">
        <p className="text-sm text-gray-500 mb-3">
          Configure o provedor de IA usado pelo Agente de Relatórios e pelo Agente de Contas.
        </p>
        {aiActive ? (
          <p className="text-xs text-green-700 mb-3">
            IA ativa: <strong>{String(aiActive.provider).toUpperCase()}</strong>{" "}
            {aiActive.model ? `— ${aiActive.model}` : ""}
          </p>
        ) : (
          <p className="text-xs text-amber-700 mb-3">
            Nenhuma configuração ativa. Configure abaixo ou via variáveis de ambiente (AI_FIXED_PROVIDER, AI_FIXED_MODEL, AI_FIXED_API_KEY, AI_FIXED_CONFIG_ENABLED).
          </p>
        )}
        <form onSubmit={saveAiConfig} className="grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ai-provider">Provedor</Label>
              <Select
                id="ai-provider"
                value={aiForm.provider}
                onChange={(e) => setAiForm((f) => ({ ...f, provider: e.target.value }))}
                options={[
                  { value: "openai", label: "OpenAI (GPT)" },
                  { value: "gemini", label: "Google Gemini" },
                  { value: "groq", label: "Groq" },
                  { value: "ollama", label: "Ollama (local)" },
                ]}
              />
            </div>
            <div>
              <Label htmlFor="ai-model">Modelo</Label>
              <Input
                id="ai-model"
                value={aiForm.model}
                onChange={(e) => setAiForm((f) => ({ ...f, model: e.target.value }))}
                placeholder={
                  aiForm.provider === "openai"
                    ? "gpt-4o-mini"
                    : aiForm.provider === "gemini"
                    ? "gemini-1.5-flash"
                    : aiForm.provider === "groq"
                    ? "llama-3.3-70b-versatile"
                    : "llama3.2"
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ai-key">Chave de API</Label>
              <Input
                id="ai-key"
                type="password"
                value={aiForm.api_key}
                onChange={(e) => setAiForm((f) => ({ ...f, api_key: e.target.value }))}
                placeholder={aiForm.provider === "ollama" ? "Opcional para Ollama" : "Obrigatória para provedores em nuvem"}
              />
            </div>
            {aiForm.provider === "ollama" && (
              <div>
                <Label htmlFor="ai-base-url">URL base (Ollama)</Label>
                <Input
                  id="ai-base-url"
                  value={aiForm.base_url}
                  onChange={(e) => setAiForm((f) => ({ ...f, base_url: e.target.value }))}
                  placeholder="http://localhost:11434"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="ai-enabled"
              type="checkbox"
              checked={aiForm.enabled}
              onChange={(e) => setAiForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="ai-enabled">Ativar esta configuração</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={aiSaving}>
              {aiSaving ? "Salvando..." : "Salvar configuração"}
            </Button>
            <Button type="button" variant="secondary" disabled={aiTesting} onClick={testAiConnection}>
              {aiTesting ? "Testando..." : "Testar conexão"}
            </Button>
          </div>
        </form>

        <div className="mt-4">
          <p className="text-xs text-gray-600 mb-1">Configurações salvas</p>
          {aiConfigs.length === 0 && <p className="text-xs text-gray-400">Nenhuma configuração cadastrada.</p>}
          {aiConfigs.length > 0 && (
            <ul className="space-y-2 text-xs">
              {aiConfigs.map((cfg) => (
                <li key={cfg.provider} className="flex items-center justify-between border border-gray-200 rounded px-2 py-1">
                  <div>
                    <span className="font-semibold">{cfg.provider.toUpperCase()}</span>{" "}
                    <span className="text-gray-600">{cfg.model || "modelo padrão"}</span>{" "}
                    {cfg.enabled && <span className="text-green-700 font-semibold ml-1">(ativo)</span>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => setDeleteAiProvider(cfg.provider)}
                  >
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card title="Logs de auditoria" className="mt-6">
        <EmptyState
          title="Em breve"
          message="Os logs de auditoria (estornos, exclusões, alterações) estarão disponíveis quando o backend disponibilizar o recurso."
        />
      </Card>

      <Modal
        open={resetPasswordUserId != null}
        onClose={() => { setResetPasswordUserId(null); setResetPasswordNew(""); setResetPasswordConfirm(""); }}
        title="Redefinir senha"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{PASSWORD_REQUIREMENTS}</p>
          <div>
            <Label htmlFor="reset-new">Nova senha</Label>
            <Input id="reset-new" type="password" value={resetPasswordNew} onChange={(e) => setResetPasswordNew(e.target.value)} placeholder="Nova senha" />
          </div>
          <div>
            <Label htmlFor="reset-confirm">Confirmar senha</Label>
            <Input id="reset-confirm" type="password" value={resetPasswordConfirm} onChange={(e) => setResetPasswordConfirm(e.target.value)} placeholder="Repita a senha" />
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={submitResetPassword} disabled={resetSaving || !resetPasswordNew || resetPasswordNew !== resetPasswordConfirm}>
              {resetSaving ? "Salvando..." : "Redefinir"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setResetPasswordUserId(null); setResetPasswordNew(""); setResetPasswordConfirm(""); }}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={deactivateUserId != null}
        onClose={() => setDeactivateUserId(null)}
        onConfirm={handleDeactivate}
        title="Desativar usuário"
        message="Desativar este usuário? Ele não poderá mais fazer login (pode ser reativado depois pela edição)."
        confirmLabel="Desativar"
        variant="danger"
        loading={deactivating}
      />

      <ConfirmModal
        open={deleteAiProvider != null}
        onClose={() => setDeleteAiProvider(null)}
        onConfirm={deleteAiConfig}
        title="Remover configuração de IA"
        message={`Remover a configuração de IA do provedor ${deleteAiProvider ?? ""}? A chave salva será apagada.`}
        confirmLabel="Remover"
        variant="danger"
        loading={deletingAi}
      />
    </div>
  );
}
