"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { apiFetch, assetUrl } from "@/api/client";
import { Button, Modal, Table, Input, Label, Select, Badge, toast, Card, EmptyState, ConfirmModal } from "@/components/ui";

type User = { id: number; username: string; name: string; role: string; active: boolean; signo: string | null; comissao_percentual: number };

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
    comissao: "",
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
  const [falConfig, setFalConfig] = useState<{ configured: boolean; has_key: boolean; model: string } | null>(null);
  const [falForm, setFalForm] = useState({ api_key: "", model: "" });
  const [falSaving, setFalSaving] = useState(false);

  const loadUsers = () => apiFetch<User[]>("/users").then(setUsers).catch(() => setUsers([]));
  
  const [storeForm, setStoreForm] = useState({
    store_name: "",
    logo_path: "",
    logo_box_height_sidebar: 176,
    logo_size_sidebar: 176,
    logo_width_sidebar: "" as string | number,
    logo_position_sidebar: "center",
    logo_fit_sidebar: "contain",
    logo_box_height_login: "" as string | number,
    logo_size_login: 320,
    logo_width_login: "" as string | number,
    logo_position_login: "center",
    logo_fit_login: "contain",
    
    // Recibo
    receipt_show_logo: true,
    receipt_header_text: "",
    receipt_footer_text: "",
    receipt_paper_width: 80,
    receipt_font_size: 12,
    receipt_margin: 16,
    
    // Etiquetas
    label_show_logo: false,
    label_show_name: true,
    label_show_price: true,
    label_width: 50,
    label_height: 30,
    label_font_size: 11,
    label_margin: 4,
    label_additional_text: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [receiptPreset, setReceiptPreset] = useState("80mm");
  const [labelPreset, setLabelPreset] = useState("50x30");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("identidade");

  const loadStoreSettings = () => {
    apiFetch<{
      store_name: string;
      logo_path: string | null;
      logo_box_height_sidebar: number | null;
      logo_size_sidebar: number | null;
      logo_width_sidebar: number | null;
      logo_position_sidebar: string | null;
      logo_fit_sidebar: string | null;
      logo_box_height_login: number | null;
      logo_size_login: number | null;
      logo_width_login: number | null;
      logo_position_login: string | null;
      logo_fit_login: string | null;
      
      // Recibos
      receipt_show_logo: boolean | null;
      receipt_header_text: string | null;
      receipt_footer_text: string | null;
      receipt_paper_width: number | null;
      receipt_font_size: number | null;
      receipt_margin: number | null;
      
      // Etiquetas
      label_show_logo: boolean | null;
      label_show_name: boolean | null;
      label_show_price: boolean | null;
      label_width: number | null;
      label_height: number | null;
      label_font_size: number | null;
      label_margin: number | null;
      label_additional_text: string | null;
    }>("/settings")
      .then((data) => {
        const showLogoRec = data.receipt_show_logo ?? true;
        const headerTextRec = data.receipt_header_text ?? "Vieira Closet Boutique";
        const footerTextRec = data.receipt_footer_text ?? "Obrigado pela preferência.";
        const paperWidthRec = data.receipt_paper_width ?? 80;
        const fontSizeRec = data.receipt_font_size ?? 12;
        const marginRec = data.receipt_margin ?? 16;
        
        const showLogoLab = data.label_show_logo ?? false;
        const showNameLab = data.label_show_name ?? true;
        const showPriceLab = data.label_show_price ?? true;
        const widthLab = data.label_width ?? 50;
        const heightLab = data.label_height ?? 30;
        const fontSizeLab = data.label_font_size ?? 11;
        const marginLab = data.label_margin ?? 4;
        const additionalTextLab = data.label_additional_text ?? "";

        // Detecta presets
        if (paperWidthRec === 80 && fontSizeRec === 12 && marginRec === 16) {
          setReceiptPreset("80mm");
        } else if (paperWidthRec === 58 && fontSizeRec === 10 && marginRec === 8) {
          setReceiptPreset("58mm");
        } else {
          setReceiptPreset("custom");
        }

        if (widthLab === 50 && heightLab === 30 && fontSizeLab === 11 && marginLab === 4) {
          setLabelPreset("50x30");
        } else if (widthLab === 40 && heightLab === 25 && fontSizeLab === 9 && marginLab === 2) {
          setLabelPreset("40x25");
        } else {
          setLabelPreset("custom");
        }

        setStoreForm({
          store_name: data.store_name,
          logo_path: data.logo_path || "",
          logo_box_height_sidebar: data.logo_box_height_sidebar ?? 176,
          logo_size_sidebar: data.logo_size_sidebar ?? 176,
          logo_width_sidebar: data.logo_width_sidebar ?? "",
          logo_position_sidebar: data.logo_position_sidebar ?? "center",
          logo_fit_sidebar: data.logo_fit_sidebar ?? "contain",
          logo_box_height_login: data.logo_box_height_login ?? "",
          logo_size_login: data.logo_size_login ?? 320,
          logo_width_login: data.logo_width_login ?? "",
          logo_position_login: data.logo_position_login ?? "center",
          logo_fit_login: data.logo_fit_login ?? "contain",
          
          // Recibo
          receipt_show_logo: showLogoRec,
          receipt_header_text: headerTextRec,
          receipt_footer_text: footerTextRec,
          receipt_paper_width: paperWidthRec,
          receipt_font_size: fontSizeRec,
          receipt_margin: marginRec,
          
          // Etiquetas
          label_show_logo: showLogoLab,
          label_show_name: showNameLab,
          label_show_price: showPriceLab,
          label_width: widthLab,
          label_height: heightLab,
          label_font_size: fontSizeLab,
          label_margin: marginLab,
          label_additional_text: additionalTextLab,
        });
      })
      .catch(() => {});
  };

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      await apiFetch("/settings", {
        method: "PUT",
        body: JSON.stringify({
          store_name: storeForm.store_name,
          logo_box_height_sidebar: Number(storeForm.logo_box_height_sidebar),
          logo_size_sidebar: Number(storeForm.logo_size_sidebar),
          logo_width_sidebar: storeForm.logo_width_sidebar !== "" ? Number(storeForm.logo_width_sidebar) : null,
          logo_position_sidebar: storeForm.logo_position_sidebar,
          logo_fit_sidebar: storeForm.logo_fit_sidebar,
          logo_box_height_login: storeForm.logo_box_height_login !== "" ? Number(storeForm.logo_box_height_login) : null,
          logo_size_login: Number(storeForm.logo_size_login),
          logo_width_login: storeForm.logo_width_login !== "" ? Number(storeForm.logo_width_login) : null,
          logo_position_login: storeForm.logo_position_login,
          logo_fit_login: storeForm.logo_fit_login,
          
          // Recibo
          receipt_show_logo: storeForm.receipt_show_logo,
          receipt_header_text: storeForm.receipt_header_text,
          receipt_footer_text: storeForm.receipt_footer_text,
          receipt_paper_width: Number(storeForm.receipt_paper_width),
          receipt_font_size: Number(storeForm.receipt_font_size),
          receipt_margin: Number(storeForm.receipt_margin),
          
          // Etiquetas
          label_show_logo: storeForm.label_show_logo,
          label_show_name: storeForm.label_show_name,
          label_show_price: storeForm.label_show_price,
          label_width: Number(storeForm.label_width),
          label_height: Number(storeForm.label_height),
          label_font_size: Number(storeForm.label_font_size),
          label_margin: Number(storeForm.label_margin),
          label_additional_text: storeForm.label_additional_text,
        }),
      });

      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        await apiFetch("/settings/logo", {
          method: "POST",
          body: fd,
        });
        setLogoFile(null);
      }

      toast.success("Identidade visual updated!");
      loadStoreSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar identidade visual.");
    } finally {
      setSettingsSaving(false);
    }
  }
  const loadAiConfigs = () => {
    apiFetch<AIConfig[]>("/ai/config").then(setAiConfigs).catch(() => setAiConfigs([]));
    apiFetch<any>("/ai/config/active").then(setAiActive).catch(() => setAiActive(null));
  };
  const loadFalConfig = () => {
    apiFetch<{ configured: boolean; has_key: boolean; model: string }>("/looks/config")
      .then((c) => {
        setFalConfig(c);
        setFalForm((f) => ({ ...f, model: c.model }));
      })
      .catch(() => setFalConfig(null));
  };

  async function saveFalConfig(e: React.FormEvent) {
    e.preventDefault();
    setFalSaving(true);
    try {
      await apiFetch("/looks/config", {
        method: "PUT",
        body: JSON.stringify({
          api_key: falForm.api_key.trim() || null,
          model: falForm.model.trim() || null,
        }),
      });
      toast.success("Configuração da fal.ai salva.");
      setFalForm((f) => ({ ...f, api_key: "" }));
      loadFalConfig();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar configuração da fal.ai");
    } finally {
      setFalSaving(false);
    }
  }

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
    loadFalConfig();
    loadStoreSettings();
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
    setForm({ username: "", name: "", password: "", role: "vendedor", signo: "", comissao: "", active: true });
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
      comissao: u.comissao_percentual ? String(u.comissao_percentual) : "",
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
        const body: { name?: string; role?: string; active?: boolean; signo?: string | null; comissao_percentual?: number; password?: string } = {
          name: form.name.trim(),
          role: form.role,
          active: form.active,
          signo: form.signo.trim() || null,
          comissao_percentual: parseFloat(form.comissao) || 0,
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
            comissao_percentual: parseFloat(form.comissao) || 0,
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
  const chatConfigs = aiConfigs.filter((c) => c.provider !== "fal");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Configurações do Painel</h1>
        <p className="text-sm text-gray-500">Gerencie a identidade visual, regras de impressão, acessos e integrações de IA do sistema.</p>
      </div>

      {/* Navegação por Abas (Tabs) Premium */}
      <div className="flex border-b border-rose-100 gap-1 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("identidade")}
          className={`pb-3 px-5 text-sm font-semibold transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === "identidade"
              ? "border-rose-600 text-rose-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Marca & Impressão
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("usuarios")}
          className={`pb-3 px-5 text-sm font-semibold transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === "usuarios"
              ? "border-rose-600 text-rose-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Usuários
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ia")}
          className={`pb-3 px-5 text-sm font-semibold transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === "ia"
              ? "border-rose-600 text-rose-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Integrações & IA
        </button>
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
              <Label htmlFor="admin-comissao">Comissão (%) sobre vendas</Label>
              <Input
                id="admin-comissao"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.comissao}
                onChange={(e) => setForm((f) => ({ ...f, comissao: e.target.value }))}
                placeholder="0"
              />
              {form.role === "vendedor" && (
                <p className="text-xs text-gray-500 mt-1">Vendedores costumam ter comissão. Deixe 0 se não houver.</p>
              )}
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

      {activeTab === "identidade" && (
        <Card title="Identidade Visual e Layout de Impressão" className="w-full shadow-md border border-rose-100/30">
          <p className="text-sm text-gray-500 mb-6 -mt-2">
            Configure o visual da loja e as dimensões físicas de recibos e etiquetas. As alterações se aplicam instantaneamente em todo o sistema.
          </p>
          
          <form onSubmit={handleSaveSettings} className="space-y-8">
            {/* Grid de Formulários de Configuração */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Coluna 1: Identidade Visual (Sidebar e Login) */}
              <div className="space-y-6">
                <div className="bg-rose-50/10 border border-rose-100/20 rounded-xl p-4 md:p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 border-b border-rose-100/50 pb-2">
                    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Identidade Básica
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="store-name">Nome da Loja</Label>
                      <Input
                        id="store-name"
                        value={storeForm.store_name}
                        onChange={(e) => setStoreForm((f) => ({ ...f, store_name: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="store-logo-file">Logotipo da Loja</Label>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="w-16 h-16 rounded-xl border border-rose-100 bg-rose-50/20 p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {logoFile ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={URL.createObjectURL(logoFile)} alt="Prévia" className="h-full w-full object-contain" />
                          ) : storeForm.logo_path ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={assetUrl(storeForm.logo_path) ?? undefined} alt="Logo Atual" className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-gray-400">Sem Logo</span>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            id="store-logo-file"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                            className="text-xs text-gray-600 file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-rose-50 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-rose-700 hover:file:bg-rose-100"
                          />
                          <p className="text-[10px] text-gray-400 leading-tight">PNG, JPG ou WebP até 5 MB.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-rose-50/10 border border-rose-100/20 rounded-xl p-4 md:p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 border-b border-rose-100/50 pb-2">
                    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Ajuste da Logo na Sidebar
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="logo-box-height-sidebar">Altura do Quadro (Box) (px)</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="logo-box-height-sidebar"
                          type="number"
                          min="30"
                          max="450"
                          value={storeForm.logo_box_height_sidebar}
                          onChange={(e) => setStoreForm((f) => ({ ...f, logo_box_height_sidebar: Number(e.target.value) }))}
                          required
                        />
                        <input
                          type="range"
                          min="30"
                          max="450"
                          value={storeForm.logo_box_height_sidebar}
                          onChange={(e) => setStoreForm((f) => ({ ...f, logo_box_height_sidebar: Number(e.target.value) }))}
                          className="w-24 accent-rose-700 font-normal h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="logo-size-sidebar">Altura da Imagem (px)</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="logo-size-sidebar"
                          type="number"
                          min="30"
                          max="400"
                          value={storeForm.logo_size_sidebar}
                          onChange={(e) => setStoreForm((f) => ({ ...f, logo_size_sidebar: Number(e.target.value) }))}
                          required
                        />
                        <input
                          type="range"
                          min="30"
                          max="400"
                          value={storeForm.logo_size_sidebar}
                          onChange={(e) => setStoreForm((f) => ({ ...f, logo_size_sidebar: Number(e.target.value) }))}
                          className="w-24 accent-rose-700 font-normal h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="logo-width-sidebar">Largura da Imagem (px)</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="logo-width-sidebar"
                          type="number"
                          min="30"
                          max="400"
                          value={storeForm.logo_width_sidebar}
                          onChange={(e) => setStoreForm((f) => ({ ...f, logo_width_sidebar: e.target.value ? Number(e.target.value) : "" }))}
                          placeholder="Automático"
                        />
                        <input
                          type="range"
                          min="30"
                          max="400"
                          value={storeForm.logo_width_sidebar || 176}
                          onChange={(e) => setStoreForm((f) => ({ ...f, logo_width_sidebar: Number(e.target.value) }))}
                          className="w-24 accent-rose-700 font-normal h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="logo-position-sidebar">Alinhamento na Sidebar</Label>
                      <Select
                        id="logo-position-sidebar"
                        options={[
                          { value: "left", label: "Esquerda" },
                          { value: "center", label: "Centro" },
                          { value: "right", label: "Direita" },
                        ]}
                        value={storeForm.logo_position_sidebar}
                        onChange={(e) => setStoreForm((f) => ({ ...f, logo_position_sidebar: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="logo-fit-sidebar">Recorte (Object Fit)</Label>
                    <Select
                      id="logo-fit-sidebar"
                      options={[
                        { value: "contain", label: "Ajustar Proporção (contain)" },
                        { value: "cover", label: "Preencher/Cortar (cover)" },
                        { value: "fill", label: "Esticar (fill)" },
                        { value: "scale-down", label: "Reduzir se Grande (scale-down)" },
                      ]}
                      value={storeForm.logo_fit_sidebar}
                      onChange={(e) => setStoreForm((f) => ({ ...f, logo_fit_sidebar: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="bg-rose-50/10 border border-rose-100/20 rounded-xl p-4 md:p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 border-b border-rose-100/50 pb-2">
                    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Ajuste da Logo no Login
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="logo-box-height-login">Altura do Quadro (Box) (px)</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="logo-box-height-login"
                          type="number"
                          min="50"
                          max="650"
                          value={storeForm.logo_box_height_login}
                          onChange={(e) => setStoreForm((f) => ({ ...f, logo_box_height_login: e.target.value ? Number(e.target.value) : "" }))}
                          placeholder="Automático"
                        />
                        <input
                          type="range"
                          min="50"
                          max="650"
                          value={storeForm.logo_box_height_login || 320}
                          onChange={(e) => setStoreForm((f) => ({ ...f, logo_box_height_login: Number(e.target.value) }))}
                          className="w-24 accent-rose-700 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="logo-size-login">Altura da Imagem (px)</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="logo-size-login"
                          type="number"
                          min="50"
                          max="600"
                          value={storeForm.logo_size_login}
                          onChange={(e) => setStoreForm((f) => ({ ...f, logo_size_login: Number(e.target.value) }))}
                          required
                        />
                        <input
                          type="range"
                          min="50"
                          max="600"
                          value={storeForm.logo_size_login}
                          onChange={(e) => setStoreForm((f) => ({ ...f, logo_size_login: Number(e.target.value) }))}
                          className="w-24 accent-rose-700 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="logo-width-login">Largura da Imagem (px)</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="logo-width-login"
                          type="number"
                          min="50"
                          max="600"
                          value={storeForm.logo_width_login}
                          onChange={(e) => setStoreForm((f) => ({ ...f, logo_width_login: e.target.value ? Number(e.target.value) : "" }))}
                          placeholder="Automático"
                        />
                        <input
                          type="range"
                          min="50"
                          max="600"
                          value={storeForm.logo_width_login || 320}
                          onChange={(e) => setStoreForm((f) => ({ ...f, logo_width_login: Number(e.target.value) }))}
                          className="w-24 accent-rose-700 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="logo-position-login">Alinhamento no Login</Label>
                      <Select
                        id="logo-position-login"
                        options={[
                          { value: "left", label: "Esquerda" },
                          { value: "center", label: "Centro" },
                          { value: "right", label: "Direita" },
                        ]}
                        value={storeForm.logo_position_login}
                        onChange={(e) => setStoreForm((f) => ({ ...f, logo_position_login: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="logo-fit-login">Recorte (Object Fit)</Label>
                    <Select
                      id="logo-fit-login"
                      options={[
                        { value: "contain", label: "Ajustar Proporção (contain)" },
                        { value: "cover", label: "Preencher/Cortar (cover)" },
                        { value: "fill", label: "Esticar (fill)" },
                        { value: "scale-down", label: "Reduzir se Grande (scale-down)" },
                      ]}
                      value={storeForm.logo_fit_login}
                      onChange={(e) => setStoreForm((f) => ({ ...f, logo_fit_login: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Coluna 2: Layout de Impressão (Recibos e Etiquetas) */}
              <div className="space-y-6">
                <div className="bg-rose-50/10 border border-rose-100/20 rounded-xl p-4 md:p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 border-b border-rose-100/50 pb-2">
                    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm5-17V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Recibo de Vendas
                  </h3>
                  
                  <div className="flex items-center gap-2 py-1">
                    <input
                      id="receipt-show-logo"
                      type="checkbox"
                      checked={storeForm.receipt_show_logo}
                      onChange={(e) => setStoreForm((f) => ({ ...f, receipt_show_logo: e.target.checked }))}
                      className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                    />
                    <Label htmlFor="receipt-show-logo" className="cursor-pointer">Exibir Logotipo no Recibo</Label>
                  </div>
                  
                  <div>
                    <Label htmlFor="receipt-header-text">Texto de Cabeçalho do Recibo</Label>
                    <Input
                      id="receipt-header-text"
                      type="text"
                      value={storeForm.receipt_header_text}
                      onChange={(e) => setStoreForm((f) => ({ ...f, receipt_header_text: e.target.value }))}
                      placeholder="Nome da loja ou título"
                    />
                  </div>

                  <div>
                    <Label htmlFor="receipt-footer-text">Texto de Rodapé (Agradecimento)</Label>
                    <Input
                      id="receipt-footer-text"
                      type="text"
                      value={storeForm.receipt_footer_text}
                      onChange={(e) => setStoreForm((f) => ({ ...f, receipt_footer_text: e.target.value }))}
                      placeholder="Ex.: Obrigado pela preferência!"
                    />
                  </div>

                  <div>
                    <Label htmlFor="receipt-preset">Preset de Bobina (Impressora)</Label>
                    <Select
                      id="receipt-preset"
                      options={[
                        { value: "80mm", label: "Bobina Térmica Padrão (80mm)" },
                        { value: "58mm", label: "Bobina Térmica Estreita (58mm)" },
                        { value: "custom", label: "Ajuste Personalizado" },
                      ]}
                      value={receiptPreset}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReceiptPreset(val);
                        if (val === "80mm") {
                          setStoreForm((f) => ({ ...f, receipt_paper_width: 80, receipt_font_size: 12, receipt_margin: 16 }));
                        } else if (val === "58mm") {
                          setStoreForm((f) => ({ ...f, receipt_paper_width: 58, receipt_font_size: 10, receipt_margin: 8 }));
                        }
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="receipt-paper-width">Largura (mm)</Label>
                      <Input
                        id="receipt-paper-width"
                        type="number"
                        min="40"
                        max="120"
                        value={storeForm.receipt_paper_width}
                        onChange={(e) => {
                          setReceiptPreset("custom");
                          setStoreForm((f) => ({ ...f, receipt_paper_width: Number(e.target.value) }));
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="receipt-font-size">Fonte (px)</Label>
                      <Input
                        id="receipt-font-size"
                        type="number"
                        min="8"
                        max="24"
                        value={storeForm.receipt_font_size}
                        onChange={(e) => {
                          setReceiptPreset("custom");
                          setStoreForm((f) => ({ ...f, receipt_font_size: Number(e.target.value) }));
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="receipt-margin">Margem (px)</Label>
                      <Input
                        id="receipt-margin"
                        type="number"
                        min="0"
                        max="50"
                        value={storeForm.receipt_margin}
                        onChange={(e) => {
                          setReceiptPreset("custom");
                          setStoreForm((f) => ({ ...f, receipt_margin: Number(e.target.value) }));
                        }}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-rose-50/10 border border-rose-100/20 rounded-xl p-4 md:p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 border-b border-rose-100/50 pb-2">
                    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Etiquetas de Produtos
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-2 py-1">
                    <div className="flex items-center gap-2">
                      <input
                        id="label-show-logo"
                        type="checkbox"
                        checked={storeForm.label_show_logo}
                        onChange={(e) => setStoreForm((f) => ({ ...f, label_show_logo: e.target.checked }))}
                        className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                      <Label htmlFor="label-show-logo" className="cursor-pointer text-xs">Exibir Logo</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="label-show-name"
                        type="checkbox"
                        checked={storeForm.label_show_name}
                        onChange={(e) => setStoreForm((f) => ({ ...f, label_show_name: e.target.checked }))}
                        className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                      <Label htmlFor="label-show-name" className="cursor-pointer text-xs">Exibir Nome</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="label-show-price"
                        type="checkbox"
                        checked={storeForm.label_show_price}
                        onChange={(e) => setStoreForm((f) => ({ ...f, label_show_price: e.target.checked }))}
                        className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                      <Label htmlFor="label-show-price" className="cursor-pointer text-xs">Exibir Preço</Label>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="label-additional-text">Texto Adicional na Etiqueta</Label>
                    <Input
                      id="label-additional-text"
                      type="text"
                      value={storeForm.label_additional_text}
                      onChange={(e) => setStoreForm((f) => ({ ...f, label_additional_text: e.target.value }))}
                      placeholder="Ex.: Trocas em até 7 dias com etiqueta"
                    />
                  </div>

                  <div>
                    <Label htmlFor="label-preset">Preset de Etiqueta (Dimensões)</Label>
                    <Select
                      id="label-preset"
                      options={[
                        { value: "50x30", label: "Etiqueta Padrão (50mm x 30mm)" },
                        { value: "40x25", label: "Etiqueta Pequena (40mm x 25mm)" },
                        { value: "custom", label: "Ajuste Personalizado" },
                      ]}
                      value={labelPreset}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLabelPreset(val);
                        if (val === "50x30") {
                          setStoreForm((f) => ({ ...f, label_width: 50, label_height: 30, label_font_size: 11, label_margin: 4 }));
                        } else if (val === "45x25" || val === "40x25") {
                          setStoreForm((f) => ({ ...f, label_width: 40, label_height: 25, label_font_size: 9, label_margin: 2 }));
                        }
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label htmlFor="label-width">Largura (mm)</Label>
                      <Input
                        id="label-width"
                        type="number"
                        min="20"
                        max="100"
                        value={storeForm.label_width}
                        onChange={(e) => {
                          setLabelPreset("custom");
                          setStoreForm((f) => ({ ...f, label_width: Number(e.target.value) }));
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="label-height">Altura (mm)</Label>
                      <Input
                        id="label-height"
                        type="number"
                        min="15"
                        max="80"
                        value={storeForm.label_height}
                        onChange={(e) => {
                          setLabelPreset("custom");
                          setStoreForm((f) => ({ ...f, label_height: Number(e.target.value) }));
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="label-font-size">Fonte (px)</Label>
                      <Input
                        id="label-font-size"
                        type="number"
                        min="6"
                        max="20"
                        value={storeForm.label_font_size}
                        onChange={(e) => {
                          setLabelPreset("custom");
                          setStoreForm((f) => ({ ...f, label_font_size: Number(e.target.value) }));
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="label-margin">Margem (px)</Label>
                      <Input
                        id="label-margin"
                        type="number"
                        min="0"
                        max="20"
                        value={storeForm.label_margin}
                        onChange={(e) => {
                          setLabelPreset("custom");
                          setStoreForm((f) => ({ ...f, label_margin: Number(e.target.value) }));
                        }}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção de Simulação em Grade 2x2 na largura total */}
            <div className="mt-8 border-t border-rose-100 pt-6">
              <h4 className="font-heading font-bold text-sm text-gray-800 mb-1">
                Simulação de Ajuste Fino (Tempo Real)
              </h4>
              <p className="text-xs text-gray-400 mb-6">Confira como suas configurações e a imagem da logotipo se comportam dinamicamente nos diferentes contextos do sistema.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. Sidebar Preview */}
                <div className="border border-rose-100/50 rounded-xl bg-gray-50/50 p-4 flex flex-col shadow-xs">
                  <span className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-1 border-b border-gray-200 pb-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Menu Lateral (Sidebar)
                  </span>
                  <div className="flex-1 flex items-center justify-center bg-gray-200/40 rounded-lg p-6 min-h-[220px]">
                    <div 
                      className="w-64 bg-rose-900 rounded-lg border border-rose-950/20 shadow-md flex items-center overflow-hidden transition-all duration-300" 
                      style={{ height: storeForm.logo_box_height_sidebar ? `${storeForm.logo_box_height_sidebar}px` : "176px" }}
                    >
                      <div className={`w-full h-full flex items-center ${
                        storeForm.logo_position_sidebar === "left"
                          ? "justify-start px-4"
                          : storeForm.logo_position_sidebar === "right"
                          ? "justify-end px-4"
                          : "justify-center"
                      }`}>
                        {logoFile ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={URL.createObjectURL(logoFile)} 
                            alt="Preview Sidebar" 
                            style={{
                              height: storeForm.logo_size_sidebar ? `${storeForm.logo_size_sidebar}px` : "100%",
                              width: storeForm.logo_width_sidebar ? `${storeForm.logo_width_sidebar}px` : "auto",
                              objectFit: (storeForm.logo_fit_sidebar || "contain") as any
                            }}
                          />
                        ) : storeForm.logo_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={assetUrl(storeForm.logo_path) ?? undefined} 
                            alt="Preview Sidebar" 
                            style={{
                              height: storeForm.logo_size_sidebar ? `${storeForm.logo_size_sidebar}px` : "100%",
                              width: storeForm.logo_width_sidebar ? `${storeForm.logo_width_sidebar}px` : "auto",
                              objectFit: (storeForm.logo_fit_sidebar || "contain") as any
                            }}
                          />
                        ) : (
                          <span className="text-xs text-rose-300 font-semibold italic">Vieira Closet</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Login Preview */}
                <div className="border border-rose-100/50 rounded-xl bg-gray-50/50 p-4 flex flex-col shadow-xs">
                  <span className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-1 border-b border-gray-200 pb-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Tela de Login (Card)
                  </span>
                  <div className="flex-1 flex items-center justify-center bg-gray-200/40 rounded-lg p-6 min-h-[220px]">
                    <div 
                      className="w-full max-w-[280px] bg-white rounded-xl border border-gray-200/80 p-4 shadow-lg flex flex-col justify-center transition-all duration-300"
                      style={{ height: storeForm.logo_box_height_login ? `${storeForm.logo_box_height_login}px` : "auto", minHeight: "160px" }}
                    >
                      <div className={`w-full flex flex-col ${
                        storeForm.logo_position_login === "left"
                          ? "items-start"
                          : storeForm.logo_position_login === "right"
                          ? "items-end"
                          : "items-center"
                      }`}>
                        {logoFile ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={URL.createObjectURL(logoFile)} 
                            alt="Preview Login" 
                            style={{
                              height: storeForm.logo_size_login ? `${storeForm.logo_size_login}px` : "100%",
                              width: storeForm.logo_width_login ? `${storeForm.logo_width_login}px` : "auto",
                              objectFit: (storeForm.logo_fit_login || "contain") as any
                            }}
                            className="drop-shadow-sm"
                          />
                        ) : storeForm.logo_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={assetUrl(storeForm.logo_path) ?? undefined} 
                            alt="Preview Login" 
                            style={{
                              height: storeForm.logo_size_login ? `${storeForm.logo_size_login}px` : "100%",
                              width: storeForm.logo_width_login ? `${storeForm.logo_width_login}px` : "auto",
                              objectFit: (storeForm.logo_fit_login || "contain") as any
                            }}
                            className="drop-shadow-sm"
                          />
                        ) : (
                          <span className="text-sm text-gray-400 font-bold uppercase tracking-widest">{storeForm.store_name || "Vieira Closet"}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Receipt Ticket Preview */}
                <div className="border border-rose-100/50 rounded-xl bg-gray-50/50 p-4 flex flex-col shadow-xs">
                  <span className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-1 border-b border-gray-200 pb-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Recibo Bobina Térmica
                  </span>
                  <div className="flex-1 flex items-center justify-center bg-gray-200/40 rounded-lg p-6 min-h-[260px]">
                    <div 
                      className="bg-white rounded border border-gray-300 shadow-md flex flex-col overflow-hidden text-gray-900 w-full transition-all duration-300"
                      style={{ 
                        width: `${storeForm.receipt_paper_width * 2.8}px`,
                        maxWidth: "100%",
                        fontSize: `${storeForm.receipt_font_size}px`,
                        padding: `${storeForm.receipt_margin}px`,
                        lineHeight: "1.2",
                        fontFamily: "Courier New, monospace"
                      }}
                    >
                      <div className="text-center mb-3">
                        {storeForm.receipt_show_logo && (
                          logoFile ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={URL.createObjectURL(logoFile)} 
                              alt="Logo Recibo" 
                              className="h-8 max-w-[85%] object-contain mx-auto mb-1.5"
                            />
                          ) : storeForm.logo_path ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={assetUrl(storeForm.logo_path) ?? undefined} 
                              alt="Logo Recibo" 
                              className="h-8 max-w-[85%] object-contain mx-auto mb-1.5"
                            />
                          ) : null
                        )}
                        <h5 className="font-bold uppercase tracking-tight">{storeForm.receipt_header_text || "Vieira Closet Boutique"}</h5>
                        <div className="text-[9px] text-gray-500 mt-0.5">Venda #1002 - 24/06/2026 14:00</div>
                      </div>
                      
                      <div className="border-t border-b border-dashed border-gray-400 py-1.5 my-1.5 text-[10px] space-y-1">
                        <div className="flex justify-between">
                          <span>1x Vestido Midi</span>
                          <span>R$ 180,00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>2x Regata</span>
                          <span>R$ 90,00</span>
                        </div>
                      </div>
                      
                      <div className="text-right font-bold text-[11px] mb-2">
                        Total: R$ 270,00
                      </div>
                      
                      <div className="text-center text-[9px] text-gray-500 mt-2 italic">
                        {storeForm.receipt_footer_text || "Obrigado pela preferência."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Label Preview */}
                <div className="border border-rose-100/50 rounded-xl bg-gray-50/50 p-4 flex flex-col shadow-xs">
                  <span className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-1 border-b border-gray-200 pb-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Etiqueta de Código de Barras
                  </span>
                  <div className="flex-1 flex items-center justify-center bg-gray-200/40 rounded-lg p-6 min-h-[260px]">
                    <div 
                      className="bg-white rounded border border-gray-400 shadow-md flex flex-col items-center justify-between text-gray-900 overflow-hidden transition-all duration-300"
                      style={{ 
                        width: `${storeForm.label_width * 3.8}px`,
                        height: storeForm.label_height ? `${storeForm.label_height * 3.8}px` : "114px",
                        padding: `${storeForm.label_margin}px`,
                        fontSize: `${storeForm.label_font_size}px`,
                        lineHeight: "1.1"
                      }}
                    >
                      <div className="w-full text-center flex flex-col items-center">
                        {storeForm.label_show_logo && (
                          logoFile ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={URL.createObjectURL(logoFile)} 
                              alt="Logo Etiqueta" 
                              className="h-4 max-w-[70%] object-contain mb-0.5"
                            />
                          ) : storeForm.logo_path ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={assetUrl(storeForm.logo_path) ?? undefined} 
                              alt="Logo Etiqueta" 
                              className="h-4 max-w-[70%] object-contain mb-0.5"
                            />
                          ) : null
                        )}
                        {storeForm.label_show_name && (
                          <div className="font-semibold text-[9px] truncate max-w-full">Blusa Seda Premium</div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-center my-0.5 w-full">
                        <svg className="h-6 w-full max-w-[140px]" viewBox="0 0 100 20" preserveAspectRatio="none">
                          <rect x="0" y="0" width="2" height="20" fill="black" />
                          <rect x="4" y="0" width="1" height="20" fill="black" />
                          <rect x="7" y="0" width="3" height="20" fill="black" />
                          <rect x="12" y="0" width="1" height="20" fill="black" />
                          <rect x="15" y="0" width="2" height="20" fill="black" />
                          <rect x="19" y="0" width="4" height="20" fill="black" />
                          <rect x="25" y="0" width="1" height="20" fill="black" />
                          <rect x="28" y="0" width="2" height="20" fill="black" />
                          <rect x="32" y="0" width="3" height="20" fill="black" />
                          <rect x="37" y="0" width="1" height="20" fill="black" />
                          <rect x="40" y="0" width="2" height="20" fill="black" />
                          <rect x="44" y="0" width="1" height="20" fill="black" />
                          <rect x="47" y="0" width="3" height="20" fill="black" />
                          <rect x="52" y="0" width="2" height="20" fill="black" />
                          <rect x="56" y="0" width="1" height="20" fill="black" />
                          <rect x="59" y="0" width="4" height="20" fill="black" />
                          <rect x="65" y="0" width="1" height="20" fill="black" />
                          <rect x="68" y="0" width="2" height="20" fill="black" />
                          <rect x="72" y="0" width="3" height="20" fill="black" />
                          <rect x="77" y="0" width="1" height="20" fill="black" />
                          <rect x="80" y="0" width="2" height="20" fill="black" />
                          <rect x="84" y="0" width="4" height="20" fill="black" />
                          <rect x="90" y="0" width="1" height="20" fill="black" />
                          <rect x="93" y="0" width="2" height="20" fill="black" />
                          <rect x="97" y="0" width="3" height="20" fill="black" />
                        </svg>
                        <span className="text-[7px] text-gray-500 font-mono tracking-widest mt-0.5">BL-SEDA-1002</span>
                      </div>
                      
                      <div className="w-full text-center flex flex-col items-center">
                        {storeForm.label_show_price && (
                          <div className="font-bold text-[10px] text-rose-700">R$ 149,90</div>
                        )}
                        {storeForm.label_additional_text && (
                          <div className="text-[7px] text-gray-500 truncate max-w-full font-mono mt-0.5">{storeForm.label_additional_text}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 border-t border-rose-100/50 pt-4 flex justify-end">
              <Button type="submit" loading={settingsSaving} className="px-6 py-2.5 font-bold shadow-md">
                Salvar Identidade e Temas
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === "usuarios" && (
        <div className="space-y-4">
          <Card
            title="Controle de Usuários"
            headerAction={
              <Button variant="primary" onClick={openCreate} className="flex items-center gap-1.5 shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Novo usuário
              </Button>
            }
            className="w-full shadow-md border border-rose-100/10"
          >
            <p className="text-xs text-gray-500 mb-4 -mt-2">
              Cadastre, edite e gerencie o nível de acesso dos vendedores, gerentes e administradores.
            </p>
            <Table<User>
              columns={[
                { key: "name", label: "Nome" },
                { key: "username", label: "Username" },
                { key: "role", label: "Papel" },
                { key: "comissao_percentual", label: "Comissão", render: (r) => (r.comissao_percentual ? `${r.comissao_percentual}%` : "—") },
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
        </div>
      )}

      {activeTab === "ia" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Configuração de IA (Agentes)" className="shadow-md border border-rose-100/10 w-full">
              <p className="text-sm text-gray-500 mb-4 -mt-2">
                Configure o provedor de IA usado pelo Agente de Relatórios e pelo Agente de Contas.
              </p>
              {aiActive ? (
                <div className="text-xs text-green-700 bg-green-50 border border-green-200/50 rounded-lg p-2.5 mb-4">
                  IA ativa: <strong className="uppercase">{String(aiActive.provider)}</strong>{" "}
                  {aiActive.model ? `(${aiActive.model})` : ""} — Funcionando corretamente.
                </div>
              ) : (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200/50 rounded-lg p-2.5 mb-4">
                  Nenhuma configuração de banco ativa. Utilizando variáveis de ambiente padrão.
                </div>
              )}
              
              <form onSubmit={saveAiConfig} className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ai-key">Chave de API</Label>
                    <Input
                      id="ai-key"
                      type="password"
                      value={aiForm.api_key}
                      onChange={(e) => setAiForm((f) => ({ ...f, api_key: e.target.value }))}
                      placeholder={aiForm.provider === "ollama" ? "Opcional para Ollama" : "Obrigatória para provedores in nuvem"}
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
                    className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-rose-300"
                  />
                  <Label htmlFor="ai-enabled" className="cursor-pointer">Ativar esta configuração de IA</Label>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="submit" disabled={aiSaving}>
                    {aiSaving ? "Salvando..." : "Salvar provedor"}
                  </Button>
                  <Button type="button" variant="secondary" disabled={aiTesting} onClick={testAiConnection}>
                    {aiTesting ? "Testando..." : "Testar conexão"}
                  </Button>
                </div>
              </form>

              <div className="mt-6 border-t border-rose-100/50 pt-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Provedores Salvos</p>
                {chatConfigs.length === 0 && <p className="text-xs text-gray-400">Nenhuma configuração cadastrada.</p>}
                {chatConfigs.length > 0 && (
                  <ul className="space-y-2 text-xs">
                    {chatConfigs.map((cfg) => (
                      <li key={cfg.provider} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50">
                        <div>
                          <span className="font-semibold text-rose-700">{cfg.provider.toUpperCase()}</span>{" "}
                          <span className="text-gray-600">— {cfg.model || "modelo padrão"}</span>{" "}
                          {cfg.enabled && <span className="text-green-700 font-semibold ml-2">(ativo)</span>}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 py-0.5 px-2"
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

            <Card title="Configuração fal.ai (Looks)" className="shadow-md border border-rose-100/10 w-full">
              <p className="text-sm text-gray-500 mb-4 -mt-2">
                Chave usada pelo gerador de looks (menu <strong>Looks (IA)</strong>). A chave fica armazenada no servidor e não é exibida depois de salva.
              </p>
              {falConfig?.configured ? (
                <div className="text-xs text-green-700 bg-green-50 border border-green-200/50 rounded-lg p-2.5 mb-4">
                  fal.ai configurada — modelo ativo: <strong>{falConfig.model}</strong>
                </div>
              ) : (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200/50 rounded-lg p-2.5 mb-4">
                  Nenhuma chave da fal.ai configurada. O menu Looks (IA) não gerará fotos.
                </div>
              )}
              
              <form onSubmit={saveFalConfig} className="grid gap-4">
                <div>
                  <Label htmlFor="fal-key">Chave de API (FAL_KEY)</Label>
                  <Input
                    id="fal-key"
                    type="password"
                    value={falForm.api_key}
                    onChange={(e) => setFalForm((f) => ({ ...f, api_key: e.target.value }))}
                    placeholder={falConfig?.has_key ? "•••••••• (deixe em branco para manter a atual)" : "Cole a FAL_KEY da fal.ai"}
                  />
                </div>
                <div>
                  <Label htmlFor="fal-model">Modelo de Referência</Label>
                  <Input
                    id="fal-model"
                    value={falForm.model}
                    onChange={(e) => setFalForm((f) => ({ ...f, model: e.target.value }))}
                    placeholder="fal-ai/nano-banana/edit"
                  />
                  <p className="text-xs text-gray-500 mt-1">Modelo da fal.ai para mesclagem de prompts e múltiplas fotos.</p>
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={falSaving}>{falSaving ? "Salvando..." : "Salvar fal.ai"}</Button>
                </div>
              </form>
            </Card>
          </div>

          <Card title="Logs de Auditoria" className="shadow-md border border-rose-100/10">
            <EmptyState
              title="Em breve"
              message="Os logs de auditoria (ações de estorno, modificação de caixa, alteração de usuários e exclusões) estarão disponíveis em breve quando o backend for atualizado."
            />
          </Card>
        </div>
      )}

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
