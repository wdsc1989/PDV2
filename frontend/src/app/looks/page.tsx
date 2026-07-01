"use client";

import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { apiFetch, assetUrl } from "@/api/client";
import { Button, Card, Input, Label, Select, toast, ConfirmModal, PageHeader, Badge } from "@/components/ui";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Tipos comuns
type Product = { id: number; nome: string; imagem_path: string | null; categoria?: string | null; marca?: string | null; preco_venda: number };
type CatalogProduct = { id: number; nome: string; categoria: string | null; marca: string | null; preco_venda: number; imagem_path: string | null; em_destaque: boolean };
type ProductPiece = {
  id: number;
  nome: string;
  papel: string;
  preco_venda: number;
  imagem_path: string | null;
};
type Look = {
  id: number;
  nome: string;
  imagem_path: string;
  prompt: string | null;
  publicado: boolean;
  created_at: string;
  pieces?: ProductPiece[];
  valor_total?: number;
  opcoes?: string;
};

const POSES = [
  { value: "em pé, corpo inteiro, vista frontal", label: "Em pé (frontal)" },
  { value: "em pé, corpo inteiro, vista 3/4", label: "Em pé (3/4)" },
  { value: "andando, passarela", label: "Andando (passarela)" },
  { value: "sentada, pose casual", label: "Sentada (casual)" },
  { value: "de costas, mostrando o look", label: "De costas" },
];

const TAMANHOS = [
  { value: "P", label: "Tamanho P" },
  { value: "M", label: "Tamanho M" },
  { value: "G", label: "Tamanho G" },
  { value: "GG", label: "Tamanho GG" },
  { value: "PLUSIZE", label: "Plus Size" },
];

const CAIMENTOS = [
  { id: "regular", label: "Classic Fit", desc: "Caimento tradicional e confortável." },
  { id: "slim", label: "Slim Fit", desc: "Ajuste esculpido e ajustado ao corpo." },
  { id: "oversized", label: "Oversized Fit", desc: "Corte despojado com volume extra." },
  { id: "comfort", label: "Comfort Fit", desc: "Corte relaxado e tecido fluido." },
];

type ProductComboboxProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  products: Product[];
};

function ProductCombobox({ label, placeholder, value, onChange, products }: ProductComboboxProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedProduct = useMemo(() => {
    return products.find((p) => String(p.id) === value) || null;
  }, [products, value]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) => p.nome.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div className="relative" ref={containerRef}>
      <Label>{label}</Label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg border border-rose-100 bg-white px-3 py-2 text-sm focus-within:ring-1 focus-within:ring-rose-400 cursor-pointer shadow-sm min-h-[38px] transition-all hover:border-rose-200"
      >
        <span className="truncate text-gray-700 font-semibold text-xs">
          {selectedProduct ? selectedProduct.nome : placeholder}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-40 mt-1 w-full bg-white border border-rose-100 rounded-xl shadow-xl p-2 space-y-2 max-h-72 flex flex-col">
          <div className="relative shrink-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digitar nome do produto..."
              className="w-full text-xs px-2.5 py-2 pl-8 rounded-lg border border-rose-100 focus:outline-none focus:ring-1 focus:ring-rose-400 bg-rose-50/20"
              autoFocus
            />
            <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="overflow-y-auto space-y-0.5 scrollbar-thin pr-1 flex-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setSearch("");
                setIsOpen(false);
              }}
              className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-rose-50 text-gray-500 transition-colors"
            >
              Nenhum / Limpar Seleção
            </button>
            
            {filteredProducts.length === 0 ? (
              <p className="text-center text-[11px] text-gray-400 py-3">Nenhum produto encontrado</p>
            ) : (
              filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(String(p.id));
                    setSearch("");
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors ${
                    value === String(p.id) ? "bg-rose-50 text-rose-600 font-bold" : "hover:bg-rose-50/50 text-gray-700"
                  }`}
                >
                  <div className="w-8 h-8 rounded bg-rose-50 overflow-hidden flex items-center justify-center shrink-0 border border-rose-100/30">
                    {p.imagem_path ? (
                      <img src={assetUrl(p.imagem_path) ?? undefined} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[7px] text-amber-600 font-bold uppercase leading-none">Sem Foto</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate leading-tight">{p.nome}</p>
                    {!p.imagem_path && <span className="text-[8px] font-extrabold text-amber-500 uppercase leading-none mt-0.5 block">Não compatível (sem foto)</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LooksGeneralPage() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="p-4">Carregando...</div>;

  // Renderiza a interface condicionalmente
  if (isAuthenticated()) {
    return (
      <DashboardLayout>
        <AdminLooksView />
      </DashboardLayout>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex items-center justify-center text-xs font-semibold text-stone-500">Carregando provador virtual...</div>}>
      <PublicTryOnView />
    </Suspense>
  );
}

/* ==========================================
   1. VISUALIZAÇÃO DO ADMINISTRADOR (GERENCIAMENTO)
   ========================================== */
function AdminLooksView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [generating, setGenerating] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    nome: "",
    superior_id: "",
    inferior_id: "",
    conjunto_id: "",
    pose: POSES[0].value,
    tamanho: "M",
    caimento: "",
    extra_prompt: "",
  });

  const [adminSearch, setAdminSearch] = useState("");
  const [adminStatus, setAdminStatus] = useState<"todos" | "publicados" | "privados">("todos");
  const [adminDestaque, setAdminDestaque] = useState<"todos" | "destaques">("todos");
  const [adminSize, setAdminSize] = useState<"todos" | "P" | "M" | "G" | "GG" | "PLUSIZE">("todos");

  const filteredAdminLooks = useMemo(() => {
    let result = [...looks];
    
    if (adminSearch.trim()) {
      const q = adminSearch.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.nome.toLowerCase().includes(q) ||
          (l.pieces ?? []).some((p) => p.nome.toLowerCase().includes(q))
      );
    }
    
    if (adminStatus === "publicados") {
      result = result.filter((l) => l.publicado);
    } else if (adminStatus === "privados") {
      result = result.filter((l) => !l.publicado);
    }
    
    if (adminDestaque === "destaques") {
      result = result.filter((l) => {
        try {
          return l.opcoes && JSON.parse(l.opcoes).em_destaque === true;
        } catch (e) {
          return false;
        }
      });
    }
    
    if (adminSize !== "todos") {
      result = result.filter((l) => {
        try {
          return l.opcoes && JSON.parse(l.opcoes).tamanho === adminSize;
        } catch (e) {
          return false;
        }
      });
    }
    
    result.sort((a, b) => b.id - a.id);
    return result;
  }, [looks, adminSearch, adminStatus, adminDestaque, adminSize]);

  const loadProducts = () =>
    apiFetch<Product[]>("/products?active_only=true").then(setProducts).catch(() => setProducts([]));
  const loadLooks = () => apiFetch<Look[]>("/looks").then(setLooks).catch(() => setLooks([]));

  useEffect(() => {
    loadProducts();
    loadLooks();
  }, []);

  const sorted = useMemo(
    () => [...products].sort((a, b) => a.nome.localeCompare(b.nome)),
    [products]
  );

  const selected = (id: string) => products.find((x) => String(x.id) === id) ?? null;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.superior_id && !form.inferior_id && !form.conjunto_id) {
      toast.error("Selecione ao menos uma peça (superior, inferior ou conjunto).");
      return;
    }
    setGenerating(true);
    try {
      await apiFetch<Look>("/looks", {
        method: "POST",
        body: JSON.stringify({
          nome: form.nome.trim() || "Look",
          superior_id: form.superior_id ? Number(form.superior_id) : null,
          inferior_id: form.inferior_id ? Number(form.inferior_id) : null,
          conjunto_id: form.conjunto_id ? Number(form.conjunto_id) : null,
          pose: form.pose,
          tamanho: form.tamanho,
          caimento: form.caimento.trim() || null,
          extra_prompt: form.extra_prompt.trim() || null,
        }),
      });
      toast.success("Look gerado!");
      setForm((f) => ({ ...f, nome: "", superior_id: "", inferior_id: "", conjunto_id: "", caimento: "", extra_prompt: "" }));
      loadLooks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar look.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await apiFetch(`/looks/${id}`, { method: "DELETE" });
      toast.success("Look removido.");
      setDeleteId(null);
      loadLooks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  async function handleTogglePublicado(id: number, current: boolean) {
    try {
      await apiFetch(`/looks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ publicado: !current }),
      });
      toast.success(current ? "Look removido do catálogo." : "Look publicado no catálogo!");
      loadLooks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar visibilidade.");
    }
  }

  async function handleToggleDestaque(id: number, currentOpcoes: string | undefined) {
    try {
      let parsed = {};
      try {
        if (currentOpcoes) parsed = JSON.parse(currentOpcoes);
      } catch (e) {
        parsed = {};
      }
      
      const newDestaque = !(parsed as any).em_destaque;
      const updatedOpcoes = JSON.stringify({
        ...parsed,
        em_destaque: newDestaque
      });
      
      await apiFetch(`/looks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ opcoes: updatedOpcoes }),
      });
      
      toast.success(newDestaque ? "Look marcado como destaque!" : "Look removido dos destaques.");
      loadLooks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar destaque.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Looks (IA) — Painel de Controle" subtitle="Combine fotos de produtos e gere modelos virtuais para o catálogo público" />

      <Card title="Criar look para vitrine" className="mb-8 max-w-2xl">
        <form onSubmit={handleGenerate}>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="look-nome">Nome do look</Label>
              <Input id="look-nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Look verão 1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([
                ["superior_id", "Parte superior"],
                ["inferior_id", "Parte inferior"],
                ["conjunto_id", "Conjunto"],
              ] as const).map(([key, label]) => {
                const sel = selected(form[key]);
                const url = sel?.imagem_path ? assetUrl(sel.imagem_path) : null;
                return (
                  <div key={key}>
                    <ProductCombobox
                      label={label}
                      placeholder="Nenhum"
                      value={form[key]}
                      onChange={(val) => setForm((f) => ({ ...f, [key]: val }))}
                      products={sorted}
                    />
                    <div className="mt-2 flex h-24 items-center justify-center overflow-hidden rounded border border-rose-100 bg-rose-50">
                      {url ? (
                        <img src={url} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-xs text-amber-600">{sel ? "sem foto" : "sem peça"}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="-mt-2 text-xs text-gray-500">
              Todos os produtos ativos aparecem na lista. Itens <strong>sem foto</strong> não podem ser usados na geração — cadastre uma imagem do produto antes.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="look-pose">Pose da modelo</Label>
                <Select id="look-pose" options={POSES} value={form.pose} onChange={(e) => setForm((f) => ({ ...f, pose: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="look-tamanho">Tamanho da modelo</Label>
                <Select id="look-tamanho" options={TAMANHOS} value={form.tamanho} onChange={(e) => setForm((f) => ({ ...f, tamanho: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="look-caimento">Caimento no corpo (opcional)</Label>
                <Input id="look-caimento" value={form.caimento} onChange={(e) => setForm((f) => ({ ...f, caimento: e.target.value }))} placeholder="Ex.: blusa para dentro da calça, oversized" />
              </div>
              <div>
                <Label htmlFor="look-extra">Detalhes extras (opcional)</Label>
                <Input id="look-extra" value={form.extra_prompt} onChange={(e) => setForm((f) => ({ ...f, extra_prompt: e.target.value }))} placeholder="Ex.: fundo praia, luz natural" />
              </div>
            </div>
            <div>
              <Button type="submit" loading={generating} disabled={generating}>
                {generating ? "Gerando look..." : "Gerar look"}
              </Button>
              {generating && <p className="mt-2 text-xs text-gray-500">A geração de vitrine pode levar alguns segundos.</p>}
            </div>
          </div>
        </form>
      </Card>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Looks gerados na vitrine</h2>
        <span className="text-xs font-semibold text-gray-500 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1">
          {filteredAdminLooks.length} looks correspondentes
        </span>
      </div>

      {/* Barra de Filtros dos Looks no Admin */}
      <div className="bg-white rounded-2xl border border-rose-100/40 p-4 shadow-sm space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="admin-search" className="text-xs text-gray-500 font-bold uppercase">Buscar por Nome / Peça</Label>
            <Input id="admin-search" value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} placeholder="Ex.: Leticia, Morgana..." className="h-9 text-xs" />
          </div>
          <div>
            <Label htmlFor="admin-status" className="text-xs text-gray-500 font-bold uppercase">Status no Catálogo</Label>
            <select id="admin-status" value={adminStatus} onChange={(e) => setAdminStatus(e.target.value as any)} className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="todos">Todos os Status</option>
              <option value="publicados">Publicados (Catálogo)</option>
              <option value="privados">Privados (Rascunho)</option>
            </select>
          </div>
          <div>
            <Label htmlFor="admin-destaque" className="text-xs text-gray-500 font-bold uppercase">Destaque</Label>
            <select id="admin-destaque" value={adminDestaque} onChange={(e) => setAdminDestaque(e.target.value as any)} className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="todos">Todos os Looks</option>
              <option value="destaques">Apenas Destaques</option>
            </select>
          </div>
          <div>
            <Label htmlFor="admin-size" className="text-xs text-gray-500 font-bold uppercase">Tamanho Recomendado</Label>
            <select id="admin-size" value={adminSize} onChange={(e) => setAdminSize(e.target.value as any)} className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="todos">Todos os Tamanhos</option>
              <option value="P">Tamanho P</option>
              <option value="M">Tamanho M</option>
              <option value="G">Tamanho G</option>
              <option value="GG">Tamanho GG</option>
              <option value="PLUSIZE">Plus Size</option>
            </select>
          </div>
        </div>
      </div>

      {filteredAdminLooks.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum look correspondente aos filtros.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredAdminLooks.map((l) => (
            <Card key={l.id} className="overflow-hidden p-0 flex flex-col justify-between">
              <div>
                <div className="relative aspect-[3/4] bg-rose-50 overflow-hidden flex items-center justify-center">
                  <img src={assetUrl(l.imagem_path) ?? undefined} alt={l.nome} loading="lazy" className="h-full w-full object-cover" />
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    <Badge variant={l.publicado ? "success" : "default"}>
                      {l.publicado ? "No catálogo" : "Privado"}
                    </Badge>
                    {(() => {
                      let isDestaque = false;
                      try {
                        if (l.opcoes) isDestaque = JSON.parse(l.opcoes).em_destaque === true;
                      } catch(e){}
                      return isDestaque && (
                        <Badge variant="warning" className="bg-amber-500 text-white border-amber-500 font-extrabold text-[10px] px-2 py-0.5 shadow-sm">
                          ★ Destaque
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
                <div className="p-3 space-y-2 flex-1">
                  <p className="font-semibold text-gray-900 text-sm truncate" title={l.nome}>{l.nome}</p>
                  
                  {l.pieces && l.pieces.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-gray-400">Peças do Look</p>
                      <div className="max-h-24 overflow-y-auto space-y-1 border border-rose-50 rounded p-1 bg-rose-50/20">
                        {l.pieces.map((p) => (
                          <div key={`${p.id}-${p.papel}`} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                            <span className="w-1 h-1 rounded-full bg-rose-300 shrink-0" />
                            <span className="truncate flex-1 font-medium" title={p.nome}>{p.nome}</span>
                            <span className="text-gray-400 shrink-0">R${p.preco_venda.toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {l.valor_total !== undefined && l.valor_total > 0 && (
                    <div className="flex justify-between items-center text-xs font-semibold pt-1 border-t border-rose-100/50">
                      <span className="text-gray-500">Valor Total:</span>
                      <span className="text-primary-700">R$ {l.valor_total.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 pt-0 space-y-2">
                {(() => {
                  let isDestaque = false;
                  try {
                    if (l.opcoes) isDestaque = JSON.parse(l.opcoes).em_destaque === true;
                  } catch(e){}
                  return (
                    <button
                      type="button"
                      onClick={() => handleToggleDestaque(l.id, l.opcoes)}
                      className={`w-full min-h-[32px] text-xs font-bold rounded-lg border py-1 transition-colors ${
                        isDestaque
                          ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-sm"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {isDestaque ? "★ Destacado" : "☆ Destacar no Catálogo"}
                    </button>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => handleTogglePublicado(l.id, l.publicado)}
                  className={`w-full min-h-[32px] text-xs font-medium rounded-lg border py-1.5 transition-colors ${
                    l.publicado
                      ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                      : "bg-primary-700 text-white border-primary-700 hover:bg-primary-800"
                  }`}
                >
                  {l.publicado ? "Retirar do Catálogo" : "Publicar no Catálogo"}
                </button>

                <div className="flex gap-2">
                  <a href={assetUrl(l.imagem_path) ?? "#"} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button type="button" size="sm" variant="secondary" className="w-full">Abrir</Button>
                  </a>
                  <Button type="button" size="sm" variant="danger" onClick={() => setDeleteId(l.id)}>Excluir</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId != null && handleDelete(deleteId)}
        title="Excluir look"
        message="Confirma a exclusão deste look gerado?"
        confirmLabel="Excluir"
        variant="danger"
      />
    </div>
  );
}

/* ==========================================
   2. VISUALIZAÇÃO DO CLIENTE (PROVADOR VIRTUAL)
   ========================================== */
function PublicTryOnView() {
  const searchParams = useSearchParams();
  const urlProductId = searchParams.get("product_id");

  // Controle de Limite de Criações
  const [generationsLeft, setGenerationsLeft] = useState(2);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({ nome: "", whatsapp: "", consent: true });
  const [submittingLead, setSubmittingLead] = useState(false);

  // Estados de seleção e geração
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeTab, setActiveTab] = useState<"superior" | "inferior" | "conjunto">("superior");
  const [search, setSearch] = useState("");

  // Foto do Cliente
  const [humanFile, setHumanFile] = useState<File | null>(null);
  const [humanPreview, setHumanPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Peças Selecionadas
  const [selectedSuperior, setSelectedSuperior] = useState<CatalogProduct | null>(null);
  const [selectedInferior, setSelectedInferior] = useState<CatalogProduct | null>(null);
  const [selectedConjunto, setSelectedConjunto] = useState<CatalogProduct | null>(null);

  // Caimento
  const [selectedCaimento, setSelectedCaimento] = useState("regular");

  // Status de Processamento do Scanner IA
  const [tryOnProcessing, setTryOnProcessing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState("Iniciando...");

  // Resultados
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);

  // Inicializar o limite no localStorage
  useEffect(() => {
    const limit = localStorage.getItem("vcloset_tryon_limit");
    if (limit === null) {
      localStorage.setItem("vcloset_tryon_limit", "2");
      setGenerationsLeft(2);
    } else {
      setGenerationsLeft(Number(limit));
    }
  }, []);

  // Carregar produtos da vitrine
  useEffect(() => {
    setLoadingProducts(true);
    apiFetch<CatalogProduct[]>("/catalog/public")
      .then((data) => {
        const activeProds = data.filter((p) => p.imagem_path !== null);
        setProducts(activeProds);

        // Se houver product_id na URL, seleciona automaticamente no provador
        if (urlProductId) {
          const found = activeProds.find((p) => String(p.id) === urlProductId);
          if (found) {
            const name = found.nome.toLowerCase();
            const cat = (found.categoria || "").toLowerCase();
            if (cat.includes("vestido") || cat.includes("conjunto") || cat.includes("macacao") || cat.includes("macacão") ||
                name.includes("vestido") || name.includes("conjunto") || name.includes("macacão") || name.includes("macacao")) {
              setSelectedConjunto(found);
              setSelectedSuperior(null);
              setSelectedInferior(null);
              setActiveTab("conjunto");
            } else if (cat.includes("calca") || cat.includes("calça") || cat.includes("saia") || cat.includes("shorts") || cat.includes("bermuda") || cat.includes("pantacourt") || cat.includes("legging") ||
                name.includes("calça") || name.includes("calca") || name.includes("saia") || name.includes("shorts") || name.includes("bermuda") || name.includes("pantacourt")) {
              setSelectedInferior(found);
              setSelectedSuperior(null);
              setSelectedConjunto(null);
              setActiveTab("inferior");
            } else {
              setSelectedSuperior(found);
              setSelectedInferior(null);
              setSelectedConjunto(null);
              setActiveTab("superior");
            }
            toast.success(`Peça "${found.nome}" pré-selecionada!`);
          }
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [urlProductId]);

  // Função para classificar produto
  const classifiedProducts = useMemo(() => {
    return products.map((p) => {
      const name = p.nome.toLowerCase();
      const cat = (p.categoria || "").toLowerCase();
      let type: "superior" | "inferior" | "conjunto" = "superior";
      
      if (cat.includes("vestido") || cat.includes("conjunto") || cat.includes("macacao") || cat.includes("macacão") ||
          name.includes("vestido") || name.includes("conjunto") || name.includes("macacão") || name.includes("macacao")) {
        type = "conjunto";
      } else if (cat.includes("calca") || cat.includes("calça") || cat.includes("saia") || cat.includes("shorts") || cat.includes("bermuda") || cat.includes("pantacourt") || cat.includes("legging") ||
          name.includes("calça") || name.includes("calca") || name.includes("saia") || name.includes("shorts") || name.includes("bermuda") || name.includes("pantacourt")) {
        type = "inferior";
      }
      return { ...p, type };
    });
  }, [products]);

  // Filtro dos produtos
  const filteredProducts = useMemo(() => {
    return classifiedProducts.filter((p) => {
      if (p.type !== activeTab) return false;
      if (!search.trim()) return true;
      return p.nome.toLowerCase().includes(search.toLowerCase().trim());
    });
  }, [classifiedProducts, activeTab, search]);

  // Handler de upload de foto
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHumanFile(file);
      setHumanPreview(URL.createObjectURL(file));
      setTryOnResult(null); // Reseta resultado anterior
    }
  };

  // Simular progresso do scanner IA (8 segundos)
  const runScannerAnimation = (): Promise<void> => {
    return new Promise((resolve) => {
      setScanProgress(0);
      setScanStatusText("Analisando proporções corporais...");
      
      const interval = setInterval(() => {
        setScanProgress((prev) => {
          const next = prev + 1;
          if (next >= 100) {
            clearInterval(interval);
            resolve();
            return 100;
          }
          if (next === 25) setScanStatusText("Mapeando pontos de articulação do modelo...");
          if (next === 50) setScanStatusText(`Ajustando textura do tecido (${CAIMENTOS.find(c => c.id === selectedCaimento)?.label})...`);
          if (next === 75) setScanStatusText("Aplicando iluminação de estúdio integrada...");
          if (next === 95) setScanStatusText("Renderizando look final com IA...");
          return next;
        });
      }, 70); // 70ms * 100 = ~7 segundos
    });
  };

  // Enviar para o Provador
  const handleTryOnSubmit = async () => {
    if (!humanFile) {
      toast.error("Por favor, envie sua foto primeiro.");
      return;
    }
    if (!selectedSuperior && !selectedInferior && !selectedConjunto) {
      toast.error("Por favor, selecione ao menos uma peça de roupa.");
      return;
    }

    // Verificar se atingiu o limite
    if (generationsLeft <= 0) {
      setLeadModalOpen(true);
      return;
    }

    setTryOnProcessing(true);
    
    // Iniciar animação do scanner paralelamente
    const scannerPromise = runScannerAnimation();

    const formData = new FormData();
    formData.append("human_image", humanFile);
    if (selectedSuperior) formData.append("superior_id", String(selectedSuperior.id));
    if (selectedInferior) formData.append("inferior_id", String(selectedInferior.id));
    if (selectedConjunto) formData.append("conjunto_id", String(selectedConjunto.id));
    if (selectedCaimento) formData.append("caimento", selectedCaimento);

    try {
      const res = await apiFetch<{ imagem_path: string; simulado: boolean }>("/catalog/virtual-tryon", {
        method: "POST",
        body: formData,
      });

      // Aguarda a animação do scanner terminar para uma experiência mágica
      await scannerPromise;

      setTryOnResult(res.imagem_path);
      setIsSimulated(res.simulado);
      
      // Atualizar o contador no localStorage
      const nextLimit = generationsLeft - 1;
      localStorage.setItem("vcloset_tryon_limit", String(nextLimit));
      setGenerationsLeft(nextLimit);
      
      toast.success("Look gerado com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar provador virtual.");
    } finally {
      setTryOnProcessing(false);
    }
  };

  // Enviar formulário de lead
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.nome.trim() || !leadForm.whatsapp.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSubmittingLead(true);
    try {
      // Cadastra o lead no backend
      await apiFetch("/catalog/leads", {
        method: "POST",
        body: JSON.stringify({
          nome: leadForm.nome.trim(),
          whatsapp: leadForm.whatsapp.trim(),
          consent: leadForm.consent,
          tipo: "novidades",
        }),
      });

      toast.success("Cadastro concluído! +5 gerações liberadas.");
      
      // Incrementa gerações no localStorage
      const nextLimit = 5;
      localStorage.setItem("vcloset_tryon_limit", String(nextLimit));
      setGenerationsLeft(nextLimit);
      setLeadModalOpen(false);
    } catch {
      toast.error("Erro ao realizar cadastro.");
    } finally {
      setSubmittingLead(false);
    }
  };

  // Mensagem customizada do WhatsApp
  const handleTalkToStylist = () => {
    const piecesStr = [
      selectedSuperior ? `superior: ${selectedSuperior.nome}` : "",
      selectedInferior ? `inferior: ${selectedInferior.nome}` : "",
      selectedConjunto ? `conjunto: ${selectedConjunto.nome}` : ""
    ].filter(Boolean).join(" + ");

    const text = `Olá! Acabei de testar o Provador Virtual da Vieira Closet provando: ${piecesStr}. Ficou incrível e gostaria de saber sobre tamanhos e disponibilidade!`;
    const waUrl = `https://wa.me/5511988887777?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-stone-50 via-stone-100/40 to-amber-50/15 py-10 px-4 md:px-8 font-sans antialiased text-[#0C0A09]">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Cabeçalho Luxo */}
        <div className="text-center space-y-3 relative pb-6 border-b border-stone-200/50">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[#A16207] text-[10px] font-black tracking-widest uppercase">
            <span>✨ PROVADOR INTELIGENTE IA</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#1C1917] tracking-tight uppercase font-serif">
            Provador Virtual <span className="font-serif italic text-[#A16207] block sm:inline">Vieira Closet</span>
          </h1>
          <p className="max-w-xl mx-auto text-xs md:text-sm text-stone-500 font-medium">
            Envie sua foto, selecione peças reais do estoque e veja o caimento em seu corpo instantaneamente com modelagem realista por IA.
          </p>

          <div className="absolute top-0 right-0 flex items-center gap-2 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-200/50 shadow-sm">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Gerações Restantes:
            </span>
            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black shadow-inner ${
              generationsLeft > 0 ? "bg-amber-100 text-[#A16207]" : "bg-red-50 text-red-700"
            }`}>
              {generationsLeft}
            </span>
          </div>
        </div>

        {/* Grid Principal do Provador */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LADO ESQUERDO: FOTO ORIGINAL E COMPARADOR (Coluna 5/12) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="backdrop-blur-md bg-white/75 border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6 relative">
              <h2 className="text-xs font-black text-[#1C1917] uppercase tracking-wider mb-4 border-b border-stone-200/40 pb-2.5">
                📸 Sua Foto de Entrada
              </h2>

              {/* Box de Envio ou Preview */}
              <div className="relative aspect-[3/4] bg-stone-50/50 rounded-2xl border-2 border-dashed border-stone-200 overflow-hidden flex flex-col items-center justify-center p-4 transition-all duration-300 hover:border-amber-500/20 hover:bg-white/50">
                
                {tryOnProcessing && (
                  <div className="absolute inset-0 bg-stone-900/60 z-30 flex flex-col items-center justify-center text-white px-4 text-center space-y-4">
                    {/* Linha de Scanner Animada */}
                    <div className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 shadow-[0_0_15px_rgba(245,158,11,1)] animate-scan z-40" />
                    
                    <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
                    <div className="space-y-1">
                      <p className="text-sm font-black text-amber-400 font-sans tracking-wide">{scanProgress}%</p>
                      <p className="text-[10px] font-bold text-gray-200 uppercase tracking-wider">{scanStatusText}</p>
                    </div>
                  </div>
                )}

                {tryOnResult ? (
                  // Exibe a Foto Gerada/Simulada no centro
                  <div className="w-full h-full relative group">
                    <img src={assetUrl(tryOnResult) ?? undefined} alt="Look Provado" className="w-full h-full object-cover rounded-xl" />
                    <div className="absolute bottom-3 left-3 bg-stone-900/90 backdrop-blur-md text-amber-500 text-[10px] font-black tracking-widest px-3.5 py-1.5 rounded-full shadow-lg border border-amber-500/10">
                      {isSimulated ? "✨ SIMULAÇÃO DE ESTILO" : "⚡ PROVADO POR IA"}
                    </div>
                  </div>
                ) : humanPreview ? (
                  // Preview da foto do próprio cliente
                  <div className="w-full h-full relative">
                    <img src={humanPreview} alt="Foto original" className="w-full h-full object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => { setHumanFile(null); setHumanPreview(null); }}
                      className="absolute top-2.5 right-2.5 w-7 h-7 bg-stone-900 hover:bg-stone-850 text-white rounded-full flex items-center justify-center shadow-lg transition-all border border-stone-700 active:scale-90"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  // Form de upload
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer text-center space-y-4 p-6 flex flex-col items-center justify-center h-full w-full"
                  >
                    <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 border border-stone-200 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-amber-50 hover:text-amber-700">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-stone-850 uppercase tracking-wider">Carregar Minha Foto</p>
                      <p className="text-[9px] text-stone-400 mt-1 font-medium">Toque para selecionar ou arraste o arquivo</p>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Caixa de Regras de Foto */}
              <div className="mt-4 bg-stone-50/50 border border-stone-200/40 rounded-2xl p-4 text-[10px] text-stone-500 space-y-2">
                <p className="font-bold text-stone-800 uppercase tracking-wider text-[9px] mb-1">💡 Dicas para melhor resultado:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <p>🧍 <strong>Vista Frontal</strong>: Em pé com postura reta.</p>
                  <p>💡 <strong>Iluminação</strong>: Boa claridade natural.</p>
                  <p>👕 <strong>Ajuste</strong>: Roupas justas ao corpo.</p>
                  <p>⬜ <strong>Fundo Neutro</strong>: Fundo sem objetos.</p>
                </div>
              </div>
            </div>

            {/* Ações após geração */}
            {tryOnResult && !tryOnProcessing && (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleTalkToStylist}
                  className="w-full bg-[#0F5A3E] hover:bg-[#0D4B34] text-white font-bold py-3.5 rounded-2xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase font-sans tracking-wider"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.905-6.99C16.458 1.875 13.984 1.84 12.01 1.84c-5.44 0-9.866 4.418-9.87 9.864 0 1.902.504 3.759 1.465 5.382l-.999 3.647 3.743-.981zM17.7 14.12c-.3-.15-1.782-.88-2.05-.98-.268-.1-.463-.15-.658.15-.195.3-.758.98-.93 1.18-.172.2-.345.22-.646.07-.3-.15-1.27-.47-2.42-1.49-.89-.8-1.5-1.78-1.67-2.08-.172-.3-.02-.46.13-.61.137-.135.3-.35.45-.52.15-.17.2-.28.3-.47.1-.19.05-.36-.02-.51-.08-.15-.66-1.59-.9-2.18-.24-.58-.48-.5-.66-.51-.17-.01-.37-.01-.56-.01-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.39s1.02 2.78 1.17 2.97c.15.19 2.01 3.07 4.87 4.31.68.29 1.22.47 1.63.6.69.22 1.32.19 1.81.11.55-.08 1.782-.73 2.03-1.44.25-.71.25-1.32.17-1.44-.08-.12-.27-.2-.57-.35z" />
                  </svg>
                  Conversar com Estilista
                </button>
                
                <a
                  href={assetUrl(tryOnResult) ?? "#"}
                  download={`tryon_closet_${Date.now()}.png`}
                  className="w-full border border-stone-200 text-stone-700 bg-white hover:bg-stone-50 font-bold py-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider transition-colors font-sans"
                >
                  📥 Baixar Foto do Look
                </a>
              </div>
            )}
          </div>

          {/* LADO DIREITO: SELEÇÃO E CONTROLE (Coluna 7/12) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Sacola de Peças Atuais */}
            <div className="backdrop-blur-md bg-white/75 border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6">
              <h2 className="text-xs font-black text-[#1C1917] uppercase tracking-wider mb-4 border-b border-stone-200/40 pb-2.5">
                🛍️ Peças Selecionadas
              </h2>

              <div className="grid grid-cols-3 gap-3">
                {/* Peça Superior */}
                <div className="border border-stone-200/60 rounded-2xl p-2.5 bg-stone-50/50 text-center min-h-[140px] flex flex-col justify-between items-center relative transition-all duration-300 hover:border-amber-500/20">
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Blusa / Top</span>
                  {selectedSuperior ? (
                    <>
                      <div className="w-16 h-16 rounded overflow-hidden mt-1.5 shadow-sm border border-stone-200/50">
                        <img src={assetUrl(selectedSuperior.imagem_path) ?? ""} alt="" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[10px] font-bold text-stone-800 line-clamp-1 mt-1 font-sans">{selectedSuperior.nome}</p>
                      <button
                        onClick={() => setSelectedSuperior(null)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white hover:bg-stone-100 text-stone-600 rounded-full text-[10px] flex items-center justify-center font-bold border border-stone-200 shadow-md transition-all"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-stone-300 text-[10px] font-bold py-6">
                      <span>Vazio</span>
                    </div>
                  )}
                </div>

                {/* Peça Inferior */}
                <div className="border border-stone-200/60 rounded-2xl p-2.5 bg-stone-50/50 text-center min-h-[140px] flex flex-col justify-between items-center relative transition-all duration-300 hover:border-amber-500/20">
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Calça / Saia</span>
                  {selectedInferior ? (
                    <>
                      <div className="w-16 h-16 rounded overflow-hidden mt-1.5 shadow-sm border border-stone-200/50">
                        <img src={assetUrl(selectedInferior.imagem_path) ?? ""} alt="" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[10px] font-bold text-stone-800 line-clamp-1 mt-1 font-sans">{selectedInferior.nome}</p>
                      <button
                        onClick={() => setSelectedInferior(null)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white hover:bg-stone-100 text-stone-600 rounded-full text-[10px] flex items-center justify-center font-bold border border-stone-200 shadow-md transition-all"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-stone-300 text-[10px] font-bold py-6">
                      <span>Vazio</span>
                    </div>
                  )}
                </div>

                {/* Conjunto */}
                <div className="border border-stone-200/60 rounded-2xl p-2.5 bg-stone-50/50 text-center min-h-[140px] flex flex-col justify-between items-center relative transition-all duration-300 hover:border-amber-500/20">
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Vestido / Conj.</span>
                  {selectedConjunto ? (
                    <>
                      <div className="w-16 h-16 rounded overflow-hidden mt-1.5 shadow-sm border border-stone-200/50">
                        <img src={assetUrl(selectedConjunto.imagem_path) ?? ""} alt="" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[10px] font-bold text-stone-800 line-clamp-1 mt-1 font-sans">{selectedConjunto.nome}</p>
                      <button
                        onClick={() => setSelectedConjunto(null)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white hover:bg-stone-100 text-stone-600 rounded-full text-[10px] flex items-center justify-center font-bold border border-stone-200 shadow-md transition-all"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-stone-300 text-[10px] font-bold py-6">
                      <span>Vazio</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-4">
                <div className="w-full">
                  <Label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Ajuste / Caimento do Tecido</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {CAIMENTOS.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCaimento(c.id)}
                        className={`cursor-pointer border rounded-2xl p-3 text-left transition-all duration-300 ${
                          selectedCaimento === c.id
                            ? "border-[#A16207] bg-amber-50/40 shadow-sm"
                            : "border-stone-200/60 hover:border-stone-300 bg-white/50"
                        }`}
                      >
                        <p className="text-[11px] font-bold text-stone-850 font-sans tracking-wide">{c.label}</p>
                        <p className="text-[9px] text-stone-450 font-medium leading-tight mt-0.5">{c.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Escolha a Roupa (Abas e Grade) */}
            <div className="backdrop-blur-md bg-white/75 border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/40 pb-3.5 mb-4">
                <h2 className="text-xs font-black text-[#1C1917] uppercase tracking-wider">
                  👗 Peças Disponíveis
                </h2>
                
                {/* Abas */}
                <div className="flex bg-stone-100 rounded-xl p-0.5 border border-stone-200/40">
                  <button
                    onClick={() => { setActiveTab("superior"); setSearch(""); }}
                    className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      activeTab === "superior" ? "bg-white text-[#A16207] shadow-sm" : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    Superior
                  </button>
                  <button
                    onClick={() => { setActiveTab("inferior"); setSearch(""); }}
                    className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      activeTab === "inferior" ? "bg-white text-[#A16207] shadow-sm" : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    Inferior
                  </button>
                  <button
                    onClick={() => { setActiveTab("conjunto"); setSearch(""); }}
                    className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      activeTab === "conjunto" ? "bg-white text-[#A16207] shadow-sm" : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    Conjuntos
                  </button>
                </div>
              </div>

              {/* Filtro de Busca */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Pesquisar peça de roupa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs min-h-[38px] px-3.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#A16207] focus:border-[#A16207] bg-stone-50/50 shadow-inner font-sans"
                />
              </div>

              {/* Grade de Roupas */}
              {loadingProducts ? (
                <p className="text-center text-xs text-stone-400 py-12">Carregando estoque...</p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-center text-xs text-stone-400 py-12">Nenhuma peça encontrada.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto pr-1">
                  {filteredProducts.map((p) => {
                    const isSel = selectedSuperior?.id === p.id || selectedInferior?.id === p.id || selectedConjunto?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (p.type === "superior") {
                            setSelectedSuperior(isSel ? null : p);
                            setSelectedConjunto(null);
                          } else if (p.type === "inferior") {
                            setSelectedInferior(isSel ? null : p);
                            setSelectedConjunto(null);
                          } else {
                            setSelectedConjunto(isSel ? null : p);
                            setSelectedSuperior(null);
                            setSelectedInferior(null);
                          }
                        }}
                        className={`cursor-pointer rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col justify-between group ${
                          isSel ? "border-[#A16207] ring-1 ring-[#A16207]/30 bg-white" : "border-stone-200/60 bg-white/70 hover:shadow-md hover:border-stone-300"
                        }`}
                      >
                        <div className="aspect-square bg-stone-50 overflow-hidden flex items-center justify-center relative">
                          <img src={assetUrl(p.imagem_path) ?? ""} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
                          {isSel && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-[#A16207] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg">
                              ✓
                            </div>
                          )}
                        </div>
                        <div className="p-2 text-center bg-white flex-1 flex flex-col justify-between border-t border-stone-50">
                          <p className="text-[10px] font-bold text-stone-850 leading-tight line-clamp-2 font-sans">{p.nome}</p>
                          <p className="text-[11px] font-black text-[#A16207] mt-1 font-sans">R$ {p.preco_venda.toFixed(0)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ação de geração */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTryOnSubmit}
                disabled={tryOnProcessing || !humanFile || (!selectedSuperior && !selectedInferior && !selectedConjunto)}
                className="w-full bg-[#1C1917] hover:bg-[#2C2926] text-[#FAFAF9] font-bold text-xs py-4 px-6 rounded-3xl shadow-xl transition-all duration-300 tracking-widest uppercase flex items-center justify-center gap-2 border border-amber-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed min-h-[50px] font-sans"
              >
                {tryOnProcessing ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mr-1.5" />
                    <span>Processando seu Look...</span>
                  </>
                ) : (
                  <span>✨ Visualizar Roupa no meu Corpo</span>
                )}
              </button>
              {!humanFile && (
                <p className="text-center text-[10px] text-[#A16207] font-bold mt-2.5 animate-pulse uppercase tracking-wider">
                  ⚠️ Por favor, envie sua foto à esquerda para ativar o provador virtual.
                </p>
              )}
            </div>

          </div>

        </div>

        {/* Rodapé e Link para Catálogo */}
        <div className="text-center pt-6 border-t border-stone-200/50">
          <Link href="/catalogo" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A16207] hover:text-[#854D0E] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Voltar para o Catálogo de Roupas
          </Link>
        </div>

      </div>

      {/* MODAL DE CAPTURA DE LEAD (CRIAÇÕES EXCEDIDAS) */}
      {leadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-stone-200/50 animate-fade-in text-left">
            <div className="text-center space-y-2">
              <span className="text-2xl">✨</span>
              <h3 className="text-base font-black text-stone-900 uppercase tracking-wide font-serif italic">Provadores Esgotados</h3>
              <p className="text-xs text-stone-500 leading-relaxed font-medium">
                Você utilizou suas 2 criações gratuitas iniciais. Cadastre seu WhatsApp para liberar mais **5 provadores virtuais** gratuitamente!
              </p>
            </div>

            <form onSubmit={handleLeadSubmit} className="space-y-3 font-sans">
              <div>
                <Label htmlFor="lead-nome" className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Seu Nome</Label>
                <Input
                  id="lead-nome"
                  type="text"
                  placeholder="Ex: Clara Lima"
                  value={leadForm.nome}
                  onChange={(e) => setLeadForm((f) => ({ ...f, nome: e.target.value }))}
                  className="border-stone-200 focus:ring-[#A16207] focus:border-[#A16207] rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <Label htmlFor="lead-whatsapp" className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">WhatsApp</Label>
                <Input
                  id="lead-whatsapp"
                  type="text"
                  placeholder="Ex: 11988887777"
                  value={leadForm.whatsapp}
                  onChange={(e) => setLeadForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  className="border-stone-200 focus:ring-[#A16207] focus:border-[#A16207] rounded-xl text-xs"
                  required
                />
              </div>

              <div className="flex items-start gap-2 pt-1.5">
                <input
                  id="lead-consent"
                  type="checkbox"
                  checked={leadForm.consent}
                  onChange={(e) => setLeadForm((f) => ({ ...f, consent: e.target.checked }))}
                  className="mt-0.5 h-4.5 w-4.5 rounded border-stone-300 text-[#A16207] focus:ring-[#A16207]"
                />
                <Label htmlFor="lead-consent" className="cursor-pointer select-none text-[9px] text-stone-500 font-medium leading-tight">
                  Aceito receber novidades e promoções exclusivas da Vieira Closet no meu WhatsApp.
                </Label>
              </div>

              <div className="flex flex-col gap-2 pt-3">
                <button
                  type="submit"
                  disabled={submittingLead}
                  className="w-full bg-[#1C1917] hover:bg-[#2C2926] text-amber-500 border border-amber-500/20 font-bold py-3 rounded-2xl transition-all shadow-md text-xs uppercase tracking-wider"
                >
                  {submittingLead ? "Liberando..." : "Liberar +5 Provadores"}
                </button>
                <button
                  type="button"
                  onClick={() => setLeadModalOpen(false)}
                  className="w-full text-[10px] font-bold text-stone-400 hover:text-stone-600 transition-colors uppercase tracking-wider py-1"
                >
                  Talvez mais tarde
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Link dummy de fallback
function Link({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
