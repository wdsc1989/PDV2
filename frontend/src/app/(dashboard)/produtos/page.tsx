"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { apiFetch, assetUrl } from "@/api/client";
import { EstoqueTab } from "@/components/produtos/EstoqueTab";
import { CategoriasTab } from "@/components/produtos/CategoriasTab";
import { VariacoesTab } from "@/components/produtos/VariacoesTab";
import { Button, Card, Table, Input, Label, Select, toast, KpiCard, FilterBar, Badge, ConfirmModal, PageHeader } from "@/components/ui";
import { BarcodeLabelModal, type BarcodeLabelProduct } from "@/components/produtos/BarcodeLabelModal";
import { compressImage } from "@/lib/image";

function ProductPlaceholderIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={`${className} text-rose-300`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

type Product = {
  id: number;
  codigo: string;
  codigo_barras: string | null;
  nome: string;
  categoria: string | null;
  categoria_id: number | null;
  marca: string | null;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number | null;
  ativo: boolean;
  no_catalogo: boolean;
  imagem_path: string | null;
  em_destaque: boolean;
  cores: string[] | null;
  tamanhos: string[] | null;
};

const emptyForm = {
  codigo: "",
  codigo_barras: "",
  nome: "",
  categoria: "",
  marca: "",
  preco_custo: "0",
  preco_venda: "0",
  estoque_minimo: "",
  ativo: true,
  no_catalogo: true,
  em_destaque: false,
  categoria_id: "",
  imagem_path: "",
  cores: [] as string[],
  tamanhos: [] as string[],
};

/**
 * Seletor de variacao (cor/tamanho): mostra as opcoes JA CADASTRADAS como chips
 * clicaveis (selecionar/desmarcar no produto) e permite adicionar uma nova — que
 * ja fica cadastrada na lista padrao (onRegister) e selecionada aqui. Opcional.
 */
function VariationPicker({
  id,
  label,
  ajuda,
  placeholder,
  options,
  valores,
  onChange,
  onRegister,
}: {
  id: string;
  label: string;
  ajuda?: string;
  placeholder?: string;
  options: string[];
  valores: string[];
  onChange: (v: string[]) => void;
  onRegister: (valor: string) => void;
}) {
  const [novo, setNovo] = useState("");
  const marcado = (v: string) => valores.some((x) => x.toLowerCase() === v.toLowerCase());

  function alternar(v: string) {
    onChange(marcado(v) ? valores.filter((x) => x.toLowerCase() !== v.toLowerCase()) : [...valores, v]);
  }

  function adicionar() {
    const partes = novo.split(",").map((s) => s.trim()).filter(Boolean);
    if (!partes.length) return;
    const sel = [...valores];
    for (const p of partes) {
      if (!options.some((o) => o.toLowerCase() === p.toLowerCase())) onRegister(p);
      if (!sel.some((x) => x.toLowerCase() === p.toLowerCase())) sel.push(p);
    }
    onChange(sel);
    setNovo("");
  }

  // cadastradas + quaisquer avulsas ja selecionadas que nao estejam na lista
  const todas = [...options];
  for (const v of valores) if (!todas.some((o) => o.toLowerCase() === v.toLowerCase())) todas.push(v);

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {todas.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {todas.map((v) => {
            const on = marcado(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => alternar(v)}
                aria-pressed={on}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                  on ? "text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-[#A16207]/40"
                }`}
                style={on ? { background: "#A16207" } : undefined}
              >
                {v}
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <Input
          id={id}
          value={novo}
          placeholder={placeholder}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              adicionar();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={adicionar}>
          Adicionar
        </Button>
      </div>
      {ajuda && <p className="mt-1 text-xs text-gray-500">{ajuda}</p>}
    </div>
  );
}

export default function ProdutosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const editParam = searchParams.get("edit");
  const [activeTab, setActiveTab] = useState<"produtos" | "estoque" | "categorias" | "variacoes">("produtos");

  useEffect(() => {
    if (tabParam === "estoque" || tabParam === "categorias" || tabParam === "produtos" || tabParam === "variacoes") {
      setActiveTab(tabParam as "produtos" | "estoque" | "categorias" | "variacoes");
    }
  }, [tabParam]);

  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [labelProduct, setLabelProduct] = useState<BarcodeLabelProduct | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockQty, setStockQty] = useState("");
  const [stockCusto, setStockCusto] = useState("");
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState("");

  // Ajuste de Estoque
  const [adjProduct, setAdjProduct] = useState<Product | null>(null);
  const [adjNewQty, setAdjNewQty] = useState("");
  const [adjMotivo, setAdjMotivo] = useState("inventario");
  const [adjObs, setAdjObs] = useState("");
  const [adjSaving, setAdjSaving] = useState(false);
  const [adjError, setAdjError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<{ id: number; nome: string }[]>([]);
  const [varCores, setVarCores] = useState<string[]>([]);
  const [varTamanhos, setVarTamanhos] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "ativo" | "inativo">("all");
  const [filterBaixoEstoque, setFilterBaixoEstoque] = useState(false);
  const [filterFoto, setFilterFoto] = useState<"all" | "com_foto" | "sem_foto">("all");
  const [filterNoCatalogo, setFilterNoCatalogo] = useState<"all" | "no_catalogo" | "fora_catalogo">("all");
  const [filterEmDestaque, setFilterEmDestaque] = useState<"all" | "em_destaque" | "sem_destaque">("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterCategoria) count++;
    if (filterStatus !== "all") count++;
    if (filterFoto !== "all") count++;
    if (filterNoCatalogo !== "all") count++;
    if (filterEmDestaque !== "all") count++;
    if (filterBaixoEstoque) count++;
    return count;
  }, [filterCategoria, filterStatus, filterFoto, filterNoCatalogo, filterEmDestaque, filterBaixoEstoque]);

  const hasActiveFilters = activeFiltersCount > 0;

  const clearAllFilters = () => {
    setSearch("");
    setFilterCategoria("");
    setFilterStatus("all");
    setFilterBaixoEstoque(false);
    setFilterFoto("all");
    setFilterNoCatalogo("all");
    setFilterEmDestaque("all");
  };

  const loadProducts = () => apiFetch<Product[]>("/products?active_only=false").then(setProducts).catch(() => setProducts([]));
  const loadCategories = () => apiFetch<{ id: number; nome: string }[]>("/categories/all").then(setCategories).catch(() => setCategories([]));
  const loadVariationOptions = () =>
    apiFetch<{ tipo: string; valor: string }[]>("/variation-options")
      .then((list) => {
        setVarCores(list.filter((o) => o.tipo === "cor").map((o) => o.valor));
        setVarTamanhos(list.filter((o) => o.tipo === "tamanho").map((o) => o.valor));
      })
      .catch(() => {});
  function registrarVariacao(tipo: "cor" | "tamanho", valor: string) {
    // otimista: aparece na hora; o POST persiste no pre-cadastro
    if (tipo === "cor") setVarCores((c) => (c.some((x) => x.toLowerCase() === valor.toLowerCase()) ? c : [...c, valor]));
    else setVarTamanhos((t) => (t.some((x) => x.toLowerCase() === valor.toLowerCase()) ? t : [...t, valor]));
    apiFetch("/variation-options", { method: "POST", body: JSON.stringify({ tipo, valor }) }).catch(() => {});
  }

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q));
    }
    if (filterCategoria) {
      const cid = parseInt(filterCategoria, 10);
      list = list.filter((p) => p.categoria_id === cid);
    }
    if (filterStatus === "ativo") list = list.filter((p) => p.ativo);
    if (filterStatus === "inativo") list = list.filter((p) => !p.ativo);
    if (filterBaixoEstoque) list = list.filter((p) => p.estoque_minimo != null && p.estoque_atual <= p.estoque_minimo);
    
    // Filtro de Foto/Imagem
    if (filterFoto === "com_foto") {
      list = list.filter((p) => p.imagem_path && p.imagem_path.trim() !== "");
    } else if (filterFoto === "sem_foto") {
      list = list.filter((p) => !p.imagem_path || p.imagem_path.trim() === "");
    }

    // Filtro de Mostrar no Catálogo
    if (filterNoCatalogo === "no_catalogo") {
      list = list.filter((p) => p.no_catalogo);
    } else if (filterNoCatalogo === "fora_catalogo") {
      list = list.filter((p) => !p.no_catalogo);
    }

    // Filtro de Destaque no Catálogo
    if (filterEmDestaque === "em_destaque") {
      list = list.filter((p) => p.em_destaque);
    } else if (filterEmDestaque === "sem_destaque") {
      list = list.filter((p) => !p.em_destaque);
    }

    return list;
  }, [
    products,
    search,
    filterCategoria,
    filterStatus,
    filterBaixoEstoque,
    filterFoto,
    filterNoCatalogo,
    filterEmDestaque
  ]);

  const kpiTotal = filtered.length;
  const kpiBaixoEstoque = useMemo(
    () => filtered.filter((p) => p.estoque_minimo != null && p.estoque_atual <= p.estoque_minimo).length,
    [filtered]
  );
  const kpiValorEstoque = useMemo(
    () => filtered.reduce((s, p) => s + p.preco_custo * p.estoque_atual, 0),
    [filtered]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    loadProducts();
    loadCategories();
    loadVariationOptions();
  }, [mounted, isAuthenticated]);

  useEffect(() => {
    if (!editParam || products.length === 0) return;
    const id = parseInt(editParam, 10);
    const product = products.find((p) => p.id === id);
    if (product) {
      openEdit(product);
      router.replace(tabParam ? `/produtos?tab=${tabParam}` : "/produtos");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, products]);

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      codigo: p.codigo,
      codigo_barras: p.codigo_barras || "",
      nome: p.nome,
      categoria: p.categoria || "",
      marca: p.marca || "",
      preco_custo: String(p.preco_custo),
      preco_venda: String(p.preco_venda),
      estoque_minimo: p.estoque_minimo != null ? String(p.estoque_minimo) : "",
      ativo: p.ativo,
      no_catalogo: p.no_catalogo,
      em_destaque: p.em_destaque,
      categoria_id: p.categoria_id != null ? String(p.categoria_id) : "",
      imagem_path: p.imagem_path || "",
      cores: p.cores || [],
      tamanhos: p.tamanhos || [],
    });
    setShowForm(true);
  }

  async function handleSubmitProduct(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = {
      codigo: form.codigo.trim(),
      codigo_barras: form.codigo_barras.trim() || null,
      nome: form.nome.trim(),
      categoria: form.categoria.trim() || null,
      marca: form.marca.trim() || null,
      preco_custo: parseFloat(form.preco_custo) || 0,
      preco_venda: parseFloat(form.preco_venda) || 0,
      estoque_minimo: form.estoque_minimo ? parseFloat(form.estoque_minimo) : null,
      ativo: form.ativo,
      no_catalogo: form.no_catalogo,
      em_destaque: form.em_destaque,
      categoria_id: form.categoria_id ? parseInt(form.categoria_id, 10) : null,
      imagem_path: form.imagem_path.trim() || null,
      cores: form.cores.length ? form.cores : null,
      tamanhos: form.tamanhos.length ? form.tamanhos : null,
    };
    try {
      let productId = editingId;
      if (editingId != null) {
        await apiFetch(`/products/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Produto atualizado.");
        setEditingId(null);
      } else {
        const created = await apiFetch<Product>("/products", { method: "POST", body: JSON.stringify(payload) });
        productId = created.id;
        toast.success("Produto cadastrado.");
      }
      if (imageFile && productId != null) {
        try {
          const compressed = await compressImage(imageFile, { maxDim: 1920, quality: 0.9 });
          const fd = new FormData();
          fd.append("file", compressed);
          await apiFetch(`/products/${productId}/image`, { method: "POST", body: fd });
        } catch (imgErr) {
          toast.error(imgErr instanceof Error ? imgErr.message : "Produto salvo, mas a foto falhou.");
        }
      }
      setImageFile(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      setForm(emptyForm);
      setShowForm(false);
      loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(productId: number) {
    try {
      await apiFetch(`/products/${productId}`, { method: "DELETE" });
      toast.success("Produto excluído.");
      setDeleteConfirm(null);
      loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    }
  }

  async function handleEntradaEstoque(e: React.FormEvent) {
    e.preventDefault();
    if (!stockProduct) return;
    const qty = parseFloat(stockQty);
    if (!qty || qty <= 0) return;
    setStockError("");
    setStockSaving(true);
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const custo = stockCusto.trim() ? parseFloat(stockCusto.replace(",", ".")) : null;
      await apiFetch("/stock/entries", {
        method: "POST",
        body: JSON.stringify({ product_id: stockProduct.id, quantity: qty, preco_custo_unitario: custo, data_entrada: hoje, observacao: "Entrada pelo frontend" }),
      });
      toast.success(custo != null ? "Entrada registrada. Custo médio atualizado." : "Entrada de estoque registrada.");
      setStockQty("");
      setStockCusto("");
      setStockProduct(null);
      loadProducts();
    } catch (err) {
      setStockError(err instanceof Error ? err.message : "Erro ao registrar entrada");
      toast.error(err instanceof Error ? err.message : "Erro ao registrar entrada");
    } finally {
      setStockSaving(false);
    }
  }

  async function handleAjusteEstoque(e: React.FormEvent) {
    e.preventDefault();
    if (!adjProduct) return;
    const qty = parseFloat(adjNewQty.replace(",", "."));
    if (isNaN(qty) || qty < 0) {
      setAdjError("Quantidade inválida.");
      return;
    }
    setAdjError("");
    setAdjSaving(true);
    try {
      await apiFetch("/stock/adjustments", {
        method: "POST",
        body: JSON.stringify({
          product_id: adjProduct.id,
          quantidade_nova: qty,
          motivo: adjMotivo,
          observacao: adjObs.trim() || null,
        }),
      });
      toast.success("Estoque ajustado com sucesso.");
      setAdjNewQty("");
      setAdjMotivo("inventario");
      setAdjObs("");
      setAdjProduct(null);
      loadProducts();
    } catch (err) {
      setAdjError(err instanceof Error ? err.message : "Erro ao ajustar estoque");
      toast.error(err instanceof Error ? err.message : "Erro ao ajustar estoque");
    } finally {
      setAdjSaving(false);
    }
  }

  if (!mounted) return <div className="p-4">Carregando...</div>;



  const categoryOptions = [{ value: "", label: "Nenhuma" }, ...categories.map((c) => ({ value: String(c.id), label: c.nome }))];
  const statusOptions = [
    { value: "all", label: "Todos" },
    { value: "ativo", label: "Ativo" },
    { value: "inativo", label: "Inativo" },
  ];

  return (
    <div>
      {/* Abas Superiores Elegantes */}
      <div className="flex border-b border-rose-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab("produtos")}
          className={`px-4 py-2 border-b-2 font-semibold text-sm transition-all ${
            activeTab === "produtos"
              ? "border-primary-700 text-primary-700 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Lista de Produtos
        </button>
        <button
          onClick={() => setActiveTab("estoque")}
          className={`px-4 py-2 border-b-2 font-semibold text-sm transition-all ${
            activeTab === "estoque"
              ? "border-primary-700 text-primary-700 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Estoque
        </button>
        <button
          onClick={() => setActiveTab("categorias")}
          className={`px-4 py-2 border-b-2 font-semibold text-sm transition-all ${
            activeTab === "categorias"
              ? "border-primary-700 text-primary-700 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Categorias
        </button>
        <button
          onClick={() => setActiveTab("variacoes")}
          className={`px-4 py-2 border-b-2 font-semibold text-sm transition-all ${
            activeTab === "variacoes"
              ? "border-primary-700 text-primary-700 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Cores e Tamanhos
        </button>
      </div>

      {activeTab === "estoque" && <EstoqueTab />}
      {activeTab === "categorias" && <CategoriasTab />}
      {activeTab === "variacoes" && <VariacoesTab />}
      {activeTab === "produtos" && (
        <>
          <PageHeader
        title="Produtos"
        subtitle="Cadastro e gestão de produtos"
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditingId(null);
              setImageFile(null);
              setForm(emptyForm);
              setShowForm((v) => !v);
            }}
          >
            {showForm ? "Cancelar" : "+ Novo produto"}
          </Button>
        }
      />

      <div className="mb-6 space-y-4">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome ou código"
          showClear={false}
        >
          <div className="flex gap-2">
            <Button
              type="button"
              variant={hasActiveFilters ? "primary" : "secondary"}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-1.5 min-h-[38px] transition-all duration-200"
            >
              <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
              </svg>
              Filtros
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-black animate-pulse">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={clearAllFilters}
                className="text-xs text-rose-500 hover:text-rose-700 font-bold uppercase transition-colors"
              >
                Limpar
              </Button>
            )}
          </div>
        </FilterBar>

        {showAdvancedFilters && (
          <div className="bg-rose-50/20 border border-rose-100/40 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="advanced-category" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Categoria</Label>
                <Select
                  id="advanced-category"
                  options={[{ value: "", label: "Todas categorias" }, ...categories.map((c) => ({ value: String(c.id), label: c.nome }))]}
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  className="w-full text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="advanced-status" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status do Produto</Label>
                <Select
                  id="advanced-status"
                  options={statusOptions}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="advanced-foto" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Foto / Imagem</Label>
                <Select
                  id="advanced-foto"
                  options={[
                    { value: "all", label: "Todas as fotos" },
                    { value: "com_foto", label: "Com Foto" },
                    { value: "sem_foto", label: "Sem Foto" }
                  ]}
                  value={filterFoto}
                  onChange={(e) => setFilterFoto(e.target.value as any)}
                  className="w-full text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="advanced-catalogo" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">No Catálogo Público</Label>
                <Select
                  id="advanced-catalogo"
                  options={[
                    { value: "all", label: "Todos no catálogo" },
                    { value: "no_catalogo", label: "No Catálogo" },
                    { value: "fora_catalogo", label: "Fora do Catálogo" }
                  ]}
                  value={filterNoCatalogo}
                  onChange={(e) => setFilterNoCatalogo(e.target.value as any)}
                  className="w-full text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="advanced-destaque" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Destaque na Vitrine</Label>
                <Select
                  id="advanced-destaque"
                  options={[
                    { value: "all", label: "Todos destaques" },
                    { value: "em_destaque", label: "Em Destaque" },
                    { value: "sem_destaque", label: "Sem Destaque" }
                  ]}
                  value={filterEmDestaque}
                  onChange={(e) => setFilterEmDestaque(e.target.value as any)}
                  className="w-full text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-rose-100/30">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterBaixoEstoque}
                  onChange={(e) => setFilterBaixoEstoque(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
                />
                Apenas produtos com baixo estoque de segurança
              </label>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors uppercase tracking-wider"
                >
                  Limpar Todos os Filtros
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Total de produtos" value={String(kpiTotal)} />
        <KpiCard label="Baixo estoque" value={String(kpiBaixoEstoque)} variant={kpiBaixoEstoque > 0 ? "alert" : "default"} />
        <KpiCard label="Valor em estoque (custo)" value={`R$ ${kpiValorEstoque.toFixed(2)}`} />
      </div>

      {stockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setStockProduct(null)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 border border-rose-100/50">
            <button
              onClick={() => setStockProduct(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-all"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100/50">
                Movimentação de Estoque
              </span>
              <h3 className="mt-2 font-bold text-base text-gray-900 leading-snug">
                Registrar Entrada de Estoque
              </h3>
            </div>

            {/* Informações do Produto */}
            <div className="flex gap-3 p-3 rounded-xl bg-rose-50/20 border border-rose-100/30 mb-4">
              <div className="w-12 h-12 rounded-lg bg-rose-50 overflow-hidden shrink-0 flex items-center justify-center">
                {stockProduct.imagem_path ? (
                  <img src={assetUrl(stockProduct.imagem_path) ?? undefined} alt={stockProduct.nome} className="w-full h-full object-cover" />
                ) : (
                  <ProductPlaceholderIcon className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{stockProduct.nome}</p>
                <p className="text-[10px] text-gray-400 font-medium">Cód: {stockProduct.codigo}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[10px] font-semibold text-gray-500">Atual: <strong className="text-gray-700">{stockProduct.estoque_atual}</strong></span>
                  <span className="text-[10px] font-semibold text-gray-500">Custo: <strong className="text-gray-700">R$ {stockProduct.preco_custo.toFixed(2)}</strong></span>
                </div>
              </div>
            </div>

            <form onSubmit={handleEntradaEstoque} className="space-y-4">
              {stockError && <p className="text-red-600 text-sm">{stockError}</p>}
              
              <div>
                <Label htmlFor="stock-qty">Quantidade a Adicionar *</Label>
                <Input
                  id="stock-qty"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  placeholder="Ex: 10"
                  required
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="stock-custo">Preço de Custo Unitário (R$)</Label>
                <Input
                  id="stock-custo"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Opcional - atualiza o custo médio"
                  value={stockCusto}
                  onChange={(e) => setStockCusto(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setStockProduct(null)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={stockSaving}>
                  Confirmar Entrada
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingId(null); }} />
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl z-10 border border-rose-100/50 flex flex-col max-h-[90vh]">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-all"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100/50">
                {editingId != null ? "Gerenciamento de Produto" : "Cadastro de Produto"}
              </span>
              <h3 className="mt-2 font-bold text-lg text-gray-900 leading-snug">
                {editingId != null ? "Editar Produto" : "Cadastrar Novo Produto"}
              </h3>
            </div>

            <div className="overflow-y-auto pr-1">
              <form onSubmit={handleSubmitProduct}>
                {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
                <div className="grid gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="codigo">Código</Label>
                      <Input id="codigo" value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="Gerado automaticamente" />
                    </div>
                    <div>
                      <Label htmlFor="codigo-barras">Código de barras</Label>
                      <Input id="codigo-barras" value={form.codigo_barras} onChange={(e) => setForm((f) => ({ ...f, codigo_barras: e.target.value }))} placeholder="EAN/GTIN (opcional)" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="nome">Nome *</Label>
                    <Input id="nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="categoria-txt">Categoria (texto)</Label>
                      <Input id="categoria-txt" value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="categoria-id">Categoria (lista)</Label>
                      <Select id="categoria-id" options={categoryOptions} value={form.categoria_id} onChange={(e) => setForm((f) => ({ ...f, categoria_id: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="marca">Marca</Label>
                    <Input id="marca" value={form.marca} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="custo">Preço custo (R$)</Label>
                      <Input id="custo" type="number" step="0.01" min="0" value={form.preco_custo} onChange={(e) => setForm((f) => ({ ...f, preco_custo: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="venda">Preço venda (R$) *</Label>
                      <Input id="venda" type="number" step="0.01" min="0" value={form.preco_venda} onChange={(e) => setForm((f) => ({ ...f, preco_venda: e.target.value }))} required />
                    </div>
                    <div>
                      <Label htmlFor="min">Estoque mínimo</Label>
                      <Input id="min" type="number" step="0.01" min="0" value={form.estoque_minimo} onChange={(e) => setForm((f) => ({ ...f, estoque_minimo: e.target.value }))} />
                    </div>
                  </div>
                  {/* Variacoes opcionais: cor e tamanho — so informativas, refletem no catalogo */}
                  <div className="grid grid-cols-1 gap-3 rounded-lg border border-[#A16207]/20 bg-[#A16207]/5 p-3 sm:grid-cols-2">
                    <VariationPicker
                      id="tamanhos"
                      label="Tamanhos (opcional)"
                      placeholder="Adicionar tamanho"
                      ajuda="Clique para marcar. Adicionar um novo já o cadastra."
                      options={varTamanhos}
                      valores={form.tamanhos}
                      onChange={(v) => setForm((f) => ({ ...f, tamanhos: v }))}
                      onRegister={(valor) => registrarVariacao("tamanho", valor)}
                    />
                    <VariationPicker
                      id="cores"
                      label="Cores (opcional)"
                      placeholder="Adicionar cor"
                      ajuda="Clique para marcar. Adicionar uma nova já a cadastra."
                      options={varCores}
                      valores={form.cores}
                      onChange={(v) => setForm((f) => ({ ...f, cores: v }))}
                      onRegister={(valor) => registrarVariacao("cor", valor)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="imagem-file">Foto do produto</Label>
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-rose-50">
                        {imageFile ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={URL.createObjectURL(imageFile)} alt="Pré-visualização" className="h-full w-full object-cover" />
                        ) : form.imagem_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={assetUrl(form.imagem_path) ?? undefined} alt="Foto atual" className="h-full w-full object-cover" />
                        ) : (
                          <ProductPlaceholderIcon className="w-7 h-7" />
                        )}
                      </div>
                      <input
                        id="imagem-file"
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        Tirar foto / Escolher
                      </Button>
                      {imageFile && (
                        <span className="text-xs text-gray-500 truncate max-w-[200px]">
                          {imageFile.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">JPG, PNG ou WebP. Ela será otimizada antes do envio.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="ativo" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} className="rounded" />
                      <Label htmlFor="ativo">Ativo</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="no-catalogo" checked={form.no_catalogo} onChange={(e) => setForm((f) => ({ ...f, no_catalogo: e.target.checked }))} className="rounded" />
                      <Label htmlFor="no-catalogo">Mostrar no catálogo</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="em-destaque" checked={form.em_destaque} onChange={(e) => setForm((f) => ({ ...f, em_destaque: e.target.checked }))} className="rounded" />
                      <Label htmlFor="em-destaque">Destacar no catálogo</Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Button>
                    <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="hidden lg:block">
        <Table<Product>
          columns={[
            {
              key: "imagem_path",
              label: "Imagem",
              render: (r) => (
                <div className="relative group w-10 h-10 shrink-0">
                  <div className="w-full h-full rounded bg-rose-50 flex items-center justify-center overflow-hidden">
                    {r.imagem_path ? (
                      <img src={assetUrl(r.imagem_path) ?? undefined} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <ProductPlaceholderIcon />
                    )}
                  </div>
                  {/* Popup de imagem ampliada no hover */}
                  {r.imagem_path && (
                    <div className="absolute left-12 top-1/2 -translate-y-1/2 z-40 hidden group-hover:block bg-white p-1 rounded-lg shadow-xl border border-rose-100/50 pointer-events-none transition-all duration-200">
                      <div className="w-48 h-48 overflow-hidden rounded-md">
                        <img src={assetUrl(r.imagem_path) ?? undefined} alt={r.nome} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              ),
            },
            { key: "nome", label: "Nome" },
            { key: "categoria", label: "Categoria", render: (r) => r.categoria ?? "—" },
            { key: "preco_venda", label: "Preço venda", render: (r) => <span className="text-right block">R$ {r.preco_venda.toFixed(2)}</span> },
            { key: "estoque_atual", label: "Estoque", render: (r) => <span className="text-right block">{r.estoque_atual}</span> },
            {
              key: "actions",
              label: "Ações",
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(r)}>Editar</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setStockProduct(r)}>Entrada</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => { setAdjProduct(r); setAdjNewQty(String(r.estoque_atual)); setAdjError(""); }}>Ajuste</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setLabelProduct(r)}>Etiqueta</Button>
                  <Button type="button" size="sm" variant="danger" onClick={() => setDeleteConfirm(r.id)}>Excluir</Button>
                </div>
              ),
            },
          ]}
          data={filtered}
          keyExtractor={(p) => p.id}
        />
      </div>

      <div className="lg:hidden space-y-3">
        {filtered.map((p) => {
          const lowStock = p.estoque_minimo != null && p.estoque_atual <= p.estoque_minimo;
          return (
            <Card key={p.id} className={`p-4 ${lowStock ? "border-amber-400 border-2" : ""}`}>
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-lg bg-rose-50 flex items-center justify-center overflow-hidden shrink-0">
                  {p.imagem_path ? (
                    <img src={assetUrl(p.imagem_path) ?? undefined} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <ProductPlaceholderIcon className="w-7 h-7" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{p.nome}</p>
                  <p className="text-sm text-gray-500">{p.categoria ?? "—"}</p>
                  <p className="text-blue-600 font-semibold">R$ {p.preco_venda.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Estoque: {p.estoque_atual} {lowStock && <Badge variant="danger" className="ml-1">Baixo</Badge>}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(p)}>Editar</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setStockProduct(p)}>Entrada</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => { setAdjProduct(p); setAdjNewQty(String(p.estoque_atual)); setAdjError(""); }}>Ajuste</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setLabelProduct(p)}>Etiqueta</Button>
                  <Button type="button" size="sm" variant="danger" onClick={() => setDeleteConfirm(p.id)}>Excluir</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <ConfirmModal
        open={deleteConfirm != null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm != null && handleDelete(deleteConfirm)}
        title="Excluir produto"
        message="Confirma a exclusão deste produto? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="danger"
      />

      {adjProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAdjProduct(null)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 border border-rose-100/50">
            <button
              onClick={() => setAdjProduct(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-all"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100/50">
                Ajustar estoque (Auditoria)
              </span>
              <h3 className="mt-2 font-bold text-base text-gray-900 leading-snug">
                Ajuste Manual de Estoque
              </h3>
            </div>

            {/* Informações do Produto */}
            <div className="flex gap-3 p-3 rounded-xl bg-rose-50/20 border border-rose-100/30 mb-4">
              <div className="w-12 h-12 rounded-lg bg-rose-50 overflow-hidden shrink-0 flex items-center justify-center">
                {adjProduct.imagem_path ? (
                  <img src={assetUrl(adjProduct.imagem_path) ?? undefined} alt={adjProduct.nome} className="w-full h-full object-cover" />
                ) : (
                  <ProductPlaceholderIcon className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{adjProduct.nome}</p>
                <p className="text-[10px] text-gray-400 font-medium">Cód: {adjProduct.codigo}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[10px] font-semibold text-gray-500">Atual: <strong className="text-gray-700">{adjProduct.estoque_atual}</strong></span>
                  <span className="text-[10px] font-semibold text-gray-500">Preço: <strong className="text-gray-700">R$ {adjProduct.preco_venda.toFixed(2)}</strong></span>
                </div>
              </div>
            </div>

            <form onSubmit={handleAjusteEstoque} className="space-y-4">
              {adjError && <p className="text-red-600 text-sm">{adjError}</p>}
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="adj-qty">Novo Estoque Absoluto *</Label>
                  <Input
                    id="adj-qty"
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjNewQty}
                    onChange={(e) => setAdjNewQty(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="adj-motivo">Motivo do Ajuste *</Label>
                  <select
                    id="adj-motivo"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                    value={adjMotivo}
                    onChange={(e) => setAdjMotivo(e.target.value)}
                  >
                    <option value="inventario">Inventário (Correção)</option>
                    <option value="perda_avaria">Perda / Avaria</option>
                    <option value="brinde_consumo">Brinde / Consumo</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="adj-obs">Observação / Justificativa</Label>
                <Input
                  id="adj-obs"
                  value={adjObs}
                  onChange={(e) => setAdjObs(e.target.value)}
                  placeholder="Justificativa do ajuste manual"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setAdjProduct(null)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={adjSaving}>
                  Confirmar Ajuste
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BarcodeLabelModal product={labelProduct} onClose={() => setLabelProduct(null)} />
      </>
      )}
    </div>
  );
}
