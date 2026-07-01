"use client";

import { useEffect, useMemo, useState } from "react";
import { assetUrl } from "@/api/client";

type CatalogProduct = {
  id: number;
  nome: string;
  categoria: string | null;
  marca: string | null;
  preco_venda: number;
  imagem_path: string | null;
  em_destaque: boolean;
  created_at: string;
  estoque_atual?: number;
};

type LookPiece = {
  id: number;
  nome: string;
  papel: string;
  preco_venda: number;
  imagem_path: string | null;
  em_destaque?: boolean;
  categoria?: string | null;
  marca?: string | null;
  estoque_atual?: number;
};

type CatalogLook = {
  id: number;
  nome: string;
  imagem_path: string;
  prompt: string | null;
  publicado: boolean;
  created_at: string;
  pieces?: LookPiece[];
  valor_total?: number;
};

const API_BASE =
  typeof window !== "undefined"
    ? ""
    : ((typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) || "http://127.0.0.1:8000");

function PlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"
      className="w-12 h-12 text-rose-200" aria-hidden="true">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  );
}

export default function CatalogoPublicoPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [looks, setLooks] = useState<CatalogLook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros/Estadíos adicionais
  const [activeTab, setActiveTab] = useState<"produtos" | "looks">("looks");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [sortBy, setSortBy] = useState<"relevancia" | "preco_asc" | "preco_desc" | "novidades">("relevancia");

  // Detalhes selecionados (Modais)
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [selectedLook, setSelectedLook] = useState<CatalogLook | null>(null);

  // Captura de Lead
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadType, setLeadType] = useState<"novidades" | "look" | "produto">("novidades");
  const [targetLookId, setTargetLookId] = useState<number | null>(null);
  const [targetProductId, setTargetProductId] = useState<number | null>(null);
  const [leadForm, setLeadForm] = useState({
    nome: "",
    email: "",
    whatsapp: "",
    consent: false,
  });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [settings, setSettings] = useState<{ store_name: string; logo_path: string | null } | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/v1/catalog/public`).then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar produtos");
        return r.json();
      }),
      fetch(`${API_BASE}/api/v1/catalog/looks`).then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar looks");
        return r.json();
      }),
      fetch(`${API_BASE}/api/v1/settings/`).then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar configurações");
        return r.json();
      }),
    ])
      .then(([pList, lList, configData]) => {
        setProducts(pList);
        setLooks(lList);
        setSettings(configData);
      })
      .catch((e) => setError("Não foi possível carregar as informações do catálogo."))
      .finally(() => setLoading(false));
  }, []);

  // Extrair categorias exclusivas
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return Array.from(set).sort();
  }, [products]);

  // Extrair marcas exclusivas
  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.marca) set.add(p.marca);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtrar produtos em destaque
  const featuredProducts = useMemo(() => {
    return products.filter((p) => p.em_destaque);
  }, [products]);

  // Filtragem e ordenação de produtos
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          (p.categoria ?? "").toLowerCase().includes(q) ||
          (p.marca ?? "").toLowerCase().includes(q)
      );
    }

    if (selectedCategory) {
      result = result.filter((p) => p.categoria === selectedCategory);
    }

    if (selectedBrand) {
      result = result.filter((p) => p.marca === selectedBrand);
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        result = result.filter((p) => p.preco_venda >= min);
      }
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        result = result.filter((p) => p.preco_venda <= max);
      }
    }

    if (sortBy === "relevancia") {
      result.sort((a, b) => a.nome.localeCompare(b.nome));
    } else if (sortBy === "preco_asc") {
      result.sort((a, b) => a.preco_venda - b.preco_venda);
    } else if (sortBy === "preco_desc") {
      result.sort((a, b) => b.preco_venda - a.preco_venda);
    } else if (sortBy === "novidades") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [products, search, selectedCategory, selectedBrand, minPrice, maxPrice, sortBy]);

  // Filtragem de looks (Composições IA) por busca e filtros de categoria, marca, preço e promoção
  const filteredLooks = useMemo(() => {
    let result = [...looks];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.nome.toLowerCase().includes(q) ||
          (l.pieces ?? []).some((p) => p.nome.toLowerCase().includes(q))
      );
    }

    if (selectedCategory) {
      result = result.filter((l) =>
        (l.pieces ?? []).some((p) => p.categoria === selectedCategory)
      );
    }

    if (selectedBrand) {
      result = result.filter((l) =>
        (l.pieces ?? []).some((p) => p.marca === selectedBrand)
      );
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        result = result.filter((l) => (l.valor_total ?? 0) >= min);
      }
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        result = result.filter((l) => (l.valor_total ?? 0) <= max);
      }
    }

    if (onlyPromo) {
      result = result.filter((l) =>
        (l.pieces ?? []).some((p) => p.em_destaque === true)
      );
    }

    return result;
  }, [looks, search, selectedCategory, selectedBrand, minPrice, maxPrice, onlyPromo]);

  function copyLink() {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleWhatsappChange(val: string) {
    const cleaned = val.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
    }
    if (cleaned.length > 7) {
      formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
    }
    setLeadForm((f) => ({ ...f, whatsapp: formatted }));
  }

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadForm.email.trim() || !leadForm.whatsapp.trim()) {
      alert("Por favor, preencha o e-mail e WhatsApp.");
      return;
    }
    if (!leadForm.consent) {
      alert("Você precisa concordar em receber comunicações.");
      return;
    }

    setLeadSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/catalog/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: leadForm.nome.trim() || null,
          email: leadForm.email.trim(),
          whatsapp: leadForm.whatsapp.trim(),
          consent: leadForm.consent,
          look_id: leadType === "look" ? targetLookId : null,
          product_id: leadType === "produto" ? targetProductId : null,
          tipo: leadType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Falha ao registrar interesse.");
      }

      alert("Prontinho! Suas informações foram salvas. Entraremos em contato em breve.");
      setLeadForm({ nome: "", email: "", whatsapp: "", consent: false });
      setIsLeadModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Ocorreu um erro ao enviar.");
    } finally {
      setLeadSubmitting(false);
    }
  }

  function openLeadModal(type: "novidades" | "look" | "produto", id: number | null = null) {
    setLeadType(type);
    if (type === "look") {
      setTargetLookId(id);
      setTargetProductId(null);
    } else if (type === "produto") {
      setTargetProductId(id);
      setTargetLookId(null);
    } else {
      setTargetLookId(null);
      setTargetProductId(null);
    }
    setIsLeadModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-rose-50/20 font-sans text-gray-800 pb-16">
      <title>Catálogo IA - Vieira Closet Boutique</title>
      {/* Header Sticky */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-rose-100/60 shadow-sm">
        <div className="mx-auto max-w-[95%] 2xl:max-w-[1500px] px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {settings?.logo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={assetUrl(settings.logo_path) ?? undefined}
                alt={settings.store_name}
                className="h-14 w-auto object-contain bg-white rounded-xl shadow-md p-1 border border-rose-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-rose-300">
                V
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 min-h-[38px] rounded-lg border border-rose-200 bg-white px-3.5 text-xs font-semibold text-gray-700 hover:bg-rose-50 transition-all hover:border-rose-300 active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186l.04-.022a2.25 2.25 0 002.828.793l7.3-3.72a2.25 2.25 0 11.9.32l-7.3 3.72M7.217 10.907a2.25 2.25 0 000 2.186m0 0l.04.022a2.25 2.25 0 002.828-.793l7.3 3.72a2.25 2.25 0 10.9-.32l-7.3-3.72" />
              </svg>
              {copied ? "Copiado!" : "Compartilhar"}
            </button>
            <button
              type="button"
              onClick={() => openLeadModal("novidades")}
              className="inline-flex items-center gap-1.5 min-h-[38px] rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700 transition-all shadow-md shadow-rose-200 active:scale-95"
            >
              Receber Novidades
            </button>
          </div>
        </div>

        {/* Busca e Abas */}
        <div className="mx-auto max-w-[95%] 2xl:max-w-[1500px] px-4 pb-3 flex flex-col gap-3">
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar roupas ou composições..."
              className="w-full rounded-xl border border-rose-100/80 bg-rose-50/40 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all shadow-inner"
            />
            <svg className="absolute left-3.5 top-3 w-4 h-4 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Banner Informativo IA e Link Instagram */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 mt-1 rounded-2xl border border-rose-100/60 bg-gradient-to-r from-rose-50/70 to-amber-50/50 shadow-sm animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5 shrink-0" aria-hidden="true">✨</span>
              <div>
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  Composições de Moda Geradas por IA
                </h3>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Todas as modelos e looks desta vitrine são criados por Inteligência Artificial para demonstrar as combinações de peças. 
                  Deseja ver fotos reais das roupas vestidas? Visite o nosso Instagram!
                </p>
              </div>
            </div>
            <a
              href="https://www.instagram.com/vieiraclosett/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all w-full md:w-auto shrink-0 group cursor-pointer"
            >
              <svg className="w-4 h-4 text-white group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
              Ver Fotos Reais (Instagram)
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[95%] 2xl:max-w-[1500px] px-4 py-6">
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin"></div>
            <p className="mt-2 text-sm text-gray-500">Preparando vitrine...</p>
          </div>
        )}
        {error && <p className="text-center text-red-500 font-semibold py-12">{error}</p>}

        {!loading && !error && (
          <>
            {/* Seção de Promoções - Ocupa largura total se estiver na aba produtos e sem busca ativa */}
            {activeTab === "produtos" && featuredProducts.length > 0 && !search && !selectedCategory && !selectedBrand && !minPrice && !maxPrice && (
              <section className="mb-10 bg-rose-50/10 rounded-3xl border border-rose-100 p-6 shadow-sm">
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xl animate-pulse">🔥</span>
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-wider">Promoções Vieira Closet</h2>
                  </div>
                  <p className="text-xs font-semibold text-rose-600 mt-1.5 bg-rose-50 border border-rose-100 rounded-lg py-1 px-3 inline-block">
                    ✨ Ofertas imperdíveis com descontos especiais selecionados para você! Aproveite antes que acabe.
                  </p>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory">
                  {featuredProducts.map((p) => (
                    <div
                      key={`featured-${p.id}`}
                      onClick={() => setSelectedProduct(p)}
                      className="snap-start shrink-0 w-52 cursor-pointer overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm hover:shadow-md hover:border-rose-300 transition-all duration-300 flex flex-col justify-between group"
                    >
                      <div className="relative aspect-[9/16] bg-rose-50/40 overflow-hidden flex items-center justify-center">
                        {p.imagem_path ? (
                          <img
                            src={assetUrl(p.imagem_path) ?? undefined}
                            alt={p.nome}
                            className="h-full w-full object-cover group-hover:scale-125 transition-transform duration-300 ease-out"
                          />
                        ) : (
                          <PlaceholderIcon />
                        )}
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-600 text-white shadow-md animate-pulse">
                          Promoção
                        </span>
                      </div>
                      <div className="p-3 bg-white flex-1 flex flex-col justify-between">
                        <div>
                          <p className="line-clamp-2 text-xs font-bold text-gray-800 leading-tight group-hover:text-rose-600 transition-colors">
                            {p.nome}
                          </p>
                          {p.marca && <p className="mt-1 text-[9px] text-gray-400 font-bold uppercase">{p.marca}</p>}
                        </div>
                        <p className="mt-3 font-heading text-sm font-black text-rose-600">
                          R$ {p.preco_venda.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Layout Principal de Colunas */}
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Coluna da Esquerda: Filtros */}
              {true && (
                <aside className="w-full lg:w-64 shrink-0">
                  {/* Botão Mobile para exibir filtros */}
                  <div className="lg:hidden mb-4">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-rose-100 bg-white text-sm font-semibold text-gray-700 hover:bg-rose-50/50 transition-all cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                        </svg>
                        Filtros
                        {(selectedCategory || selectedBrand || minPrice || maxPrice || onlyPromo) && (
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block animate-pulse"></span>
                        )}
                      </span>
                      <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showFilters ? 'rotate-185' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  </div>

                  {/* Filtros Container */}
                  <div className={`space-y-6 lg:block ${showFilters ? 'block' : 'hidden'} bg-white rounded-2xl border border-rose-100/50 p-5 shadow-sm`}>
                    <div className="flex items-center justify-between pb-3 border-b border-rose-100/40">
                      <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider">Filtrar Composições</h3>
                      {(selectedCategory || selectedBrand || minPrice || maxPrice || onlyPromo) && (
                        <button
                          onClick={() => {
                            setSelectedCategory("");
                            setSelectedBrand("");
                            setMinPrice("");
                            setMaxPrice("");
                            setOnlyPromo(false);
                          }}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition-colors uppercase cursor-pointer"
                        >
                          Limpar
                        </button>
                      )}
                    </div>

                    {/* Categorias */}
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-extrabold uppercase text-gray-400 tracking-wider">Categorias</h4>
                      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                        <button
                          onClick={() => setSelectedCategory("")}
                          className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            selectedCategory === ""
                              ? "bg-rose-50 text-rose-600 font-bold"
                              : "text-gray-600 hover:bg-rose-50/30"
                          }`}
                        >
                          Todas as Categorias
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              selectedCategory === cat
                                ? "bg-rose-50 text-rose-600 font-bold"
                                : "text-gray-600 hover:bg-rose-50/30"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>



                    {/* Faixa de Preço */}
                    <div className="space-y-3 pt-4 border-t border-rose-100/30">
                      <h4 className="text-[11px] font-extrabold uppercase text-gray-400 tracking-wider">Preço (R$)</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label htmlFor="min-price" className="sr-only">Preço Mínimo</label>
                          <input
                            id="min-price"
                            type="number"
                            placeholder="Mín"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-rose-100 focus:outline-none focus:ring-1 focus:ring-rose-400"
                          />
                        </div>
                        <div>
                          <label htmlFor="max-price" className="sr-only">Preço Máximo</label>
                          <input
                            id="max-price"
                            type="number"
                            placeholder="Máx"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-rose-100 focus:outline-none focus:ring-1 focus:ring-rose-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Destaque / Promoção */}
                    <div className="space-y-2 pt-4 border-t border-rose-100/30">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={onlyPromo}
                          onChange={(e) => setOnlyPromo(e.target.checked)}
                          className="rounded border-rose-200 text-rose-600 focus:ring-rose-400 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-gray-700">🔥 Apenas Promoções</span>
                      </label>
                    </div>
                  </div>
                </aside>
              )}

              {/* Coluna da Direita: Grade de Conteúdo */}
              <div className="flex-1">
                {activeTab === "produtos" && (
                  <div>
                    {/* Barra superior de informações e ordenação */}
                    <div className="flex items-center justify-between gap-4 mb-6 bg-white rounded-2xl border border-rose-100/50 px-4 py-3 shadow-sm">
                      <p className="text-xs text-gray-500 font-semibold">
                        {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <label htmlFor="sort" className="text-xs text-gray-400 font-medium whitespace-nowrap">Ordenar por:</label>
                        <select
                          id="sort"
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="bg-white border border-rose-100 rounded-lg text-xs font-semibold text-gray-700 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
                        >
                          <option value="relevancia">Nome (A-Z)</option>
                          <option value="preco_asc">Menor Preço</option>
                          <option value="preco_desc">Maior Preço</option>
                          <option value="novidades">Lançamentos</option>
                        </select>
                      </div>
                    </div>

                    {/* Produtos Grid */}
                    {filteredAndSortedProducts.length === 0 ? (
                      <div className="text-center py-16 bg-white rounded-2xl border border-rose-100/40 p-8 shadow-sm">
                        <p className="text-gray-400 font-medium">Nenhum produto correspondente encontrado.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {filteredAndSortedProducts.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedProduct(p)}
                            className="group cursor-pointer overflow-hidden rounded-2xl border border-rose-100/50 bg-white shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                          >
                            <div className="relative aspect-[9/16] bg-rose-50 overflow-hidden flex items-center justify-center">
                              {p.imagem_path ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={assetUrl(p.imagem_path) ?? undefined}
                                  alt={p.nome}
                                  loading="lazy"
                                  className="h-full w-full object-cover group-hover:scale-125 transition-transform duration-300 ease-out"
                                />
                              ) : (
                                <PlaceholderIcon />
                              )}
                              {p.categoria && (
                                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-white/80 backdrop-blur-sm text-rose-600 border border-rose-100">
                                  {p.categoria}
                                </span>
                              )}
                            </div>
                            <div className="p-3 bg-white flex-1 flex flex-col justify-between">
                              <div>
                                <p className="line-clamp-2 text-xs font-bold text-gray-800 leading-tight group-hover:text-rose-600 transition-colors">
                                  {p.nome}
                                </p>
                                {p.marca && (
                                  <p className="mt-0.5 text-[10px] text-gray-400 font-medium">{p.marca}</p>
                                )}
                              </div>
                              <p className="mt-2 font-heading text-base font-black text-rose-600 tabular-nums">
                                R$ {p.preco_venda.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "looks" && (
                  <div>
                    {filteredLooks.length === 0 ? (
                      <div className="text-center py-16 bg-white rounded-2xl border border-rose-100/40 p-8 shadow-sm">
                        <p className="text-gray-400">Nenhuma composição correspondente encontrada.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {filteredLooks.map((l) => (
                          <div
                            key={l.id}
                            onClick={() => setSelectedLook(l)}
                            className="group cursor-pointer overflow-hidden rounded-2xl border border-rose-100/50 bg-white shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                          >
                            <div className="relative aspect-[9/16] bg-rose-50 overflow-hidden flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={assetUrl(l.imagem_path) ?? undefined}
                                alt={l.nome}
                                loading="lazy"
                                className="h-full w-full object-cover group-hover:scale-120 transition-transform duration-300 ease-out"
                              />
                              <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-600 text-white shadow-md">
                                  Composição IA
                                </span>
                                {(l.pieces ?? []).some((piece) => piece.em_destaque === true) && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500 text-white shadow-md flex items-center gap-0.5 animate-pulse">
                                    🔥 Promoção
                                  </span>
                                )}
                              </div>

                              {/* Peças sobrepostas do Look */}
                              {l.pieces && l.pieces.length > 0 && (
                                <div 
                                  className="absolute bottom-3 left-3 flex -space-x-2 z-10" 
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {l.pieces.map((piece) => {
                                    if (!piece.imagem_path) return null;
                                    return (
                                      <div
                                        key={piece.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedProduct({
                                            id: piece.id,
                                            nome: piece.nome,
                                            categoria: piece.categoria ?? null,
                                            marca: piece.marca ?? null,
                                            preco_venda: piece.preco_venda,
                                            imagem_path: piece.imagem_path,
                                            em_destaque: piece.em_destaque ?? false,
                                            created_at: new Date().toISOString(),
                                            estoque_atual: piece.estoque_atual ?? 0
                                          });
                                        }}
                                        className="relative group/piece transition-all duration-200"
                                        title={piece.nome}
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={assetUrl(piece.imagem_path) ?? undefined}
                                          alt={piece.nome}
                                          className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-md hover:scale-[3.5] hover:z-30 hover:rounded-xl transition-all duration-200 ease-out origin-bottom-left cursor-pointer"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="font-extrabold text-sm text-gray-900 group-hover:text-rose-600 transition-colors leading-snug">
                                  {l.nome && l.nome.toLowerCase() !== "look" 
                                    ? l.nome 
                                    : (l.pieces && l.pieces.length > 0 
                                        ? l.pieces.map(p => p.nome).join(" + ") 
                                        : "Composição Especial")}
                                </h3>
                                {(l.pieces ?? []).some((piece) => (piece.estoque_atual ?? 0) <= 0) && (
                                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-gray-100 text-gray-500 border border-gray-200">
                                    🚫 Sob Consulta (Sem Estoque)
                                  </span>
                                )}
                              </div>
                              <div className="mt-4 pt-3 border-t border-rose-50 flex items-center justify-between">
                                <div>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase">Look Completo</p>
                                  <p className="font-heading text-lg font-black text-rose-600">
                                    R$ {(l.valor_total ?? 0).toFixed(2)}
                                  </p>
                                </div>
                                <span className="text-xs font-bold text-rose-500 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                  Ver Detalhes
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                  </svg>
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal Detalhe Produto */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl z-10 border border-rose-100 flex flex-col max-h-[90vh]">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center border border-rose-100 shadow-sm transition-all"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Área rolável: Imagem + Detalhes do Produto */}
            <div className="overflow-y-auto flex-1">
              <div className="aspect-[9/16] bg-rose-50 flex items-center justify-center overflow-hidden">
                {selectedProduct.imagem_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={assetUrl(selectedProduct.imagem_path) ?? undefined}
                    alt={selectedProduct.nome}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <PlaceholderIcon />
                )}
              </div>
              <div className="p-5">
                {selectedProduct.categoria && (
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100/50">
                    {selectedProduct.categoria}
                  </span>
                )}
                <h2 className="mt-2 text-lg font-black text-gray-900 leading-snug">{selectedProduct.nome}</h2>
                {selectedProduct.marca && (
                  <p className="text-xs text-gray-400 font-semibold mt-0.5">Marca: {selectedProduct.marca}</p>
                )}

                {/* Alerta de Produto Indisponível */}
                {(selectedProduct.estoque_atual ?? 0) <= 0 && (
                  <div className="p-3.5 mt-2 rounded-xl border border-amber-100 bg-amber-50/50 text-[11px] text-amber-800 leading-relaxed flex items-start gap-2.5 shadow-inner">
                    <span className="text-base mt-0.5" aria-hidden="true">⚠️</span>
                    <div>
                      <strong className="font-bold block mb-0.5">Este produto está temporariamente indisponível.</strong>
                      Deixe seus dados clicando em <strong className="font-bold uppercase">"Consultar Equivalentes"</strong> para que nossa equipe te recomende peças semelhantes em estoque!
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé Fixo */}
            <div className="p-5 border-t border-rose-50 bg-white flex items-center justify-between shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Preço Especial</span>
                <p className="font-heading text-2xl font-black text-rose-600">
                  R$ {selectedProduct.preco_venda.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => {
                  if (selectedProduct) {
                    openLeadModal("produto", selectedProduct.id);
                    setSelectedProduct(null);
                  }
                }}
                className={`${
                  (selectedProduct.estoque_atual ?? 0) <= 0
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
                    : "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                } text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer`}
              >
                {(selectedProduct.estoque_atual ?? 0) <= 0
                  ? "Consultar Equivalentes"
                  : "Eu quero!"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhe Look */}
      {selectedLook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedLook(null)} />
          <div className="relative bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl z-10 border border-rose-100 flex flex-col max-h-[90vh]">
            <button
              onClick={() => setSelectedLook(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center border border-rose-100 shadow-sm transition-all"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Área rolável: Imagem + Peças do Look */}
            <div className="overflow-y-auto flex-1">
              <div className="aspect-[9/16] bg-rose-50 flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={assetUrl(selectedLook.imagem_path) ?? undefined}
                  alt={selectedLook.nome}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100/50">
                      Composição Exclusiva IA
                    </span>
                    {(selectedLook.pieces ?? []).some((p) => p.em_destaque) && (
                      <span className="text-[10px] uppercase font-extrabold tracking-wider text-white bg-amber-500 px-2 py-0.5 rounded border border-amber-100/50 flex items-center gap-0.5 animate-pulse">
                        🔥 Em Promoção
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-lg font-black text-gray-900 leading-snug">
                    {selectedLook.nome && selectedLook.nome.toLowerCase() !== "look" 
                      ? selectedLook.nome 
                      : (selectedLook.pieces && selectedLook.pieces.length > 0 
                          ? selectedLook.pieces.map(p => p.nome).join(" + ") 
                          : "Composição Especial")}
                  </h2>
                </div>

                {/* Peças que compõem */}
                {selectedLook.pieces && selectedLook.pieces.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase font-extrabold tracking-wider text-gray-400">Peças Incluídas:</h4>
                    <div className="space-y-2">
                      {selectedLook.pieces.map((piece) => (
                        <div key={`${piece.id}-${piece.papel}`} className="flex items-center gap-3 p-2 rounded-xl bg-rose-50/20 border border-rose-100/30">
                          <div className="w-10 h-10 rounded bg-rose-50 overflow-hidden shrink-0 flex items-center justify-center">
                            {piece.imagem_path ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={assetUrl(piece.imagem_path) ?? undefined} alt={piece.nome} className="w-full h-full object-cover" />
                            ) : (
                              <svg className="w-5 h-5 text-rose-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate flex items-center gap-1.5 flex-wrap">
                              {piece.nome}
                              {piece.em_destaque && (
                                <span className="text-[8px] bg-amber-500 text-white font-extrabold px-1 rounded uppercase tracking-wider">
                                  Promo
                                </span>
                              )}
                              {(piece.estoque_atual ?? 0) <= 0 && (
                                <span className="text-[8px] bg-gray-400 text-white font-extrabold px-1 rounded uppercase tracking-wider">
                                  Sem Estoque
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] uppercase font-bold text-rose-400 leading-none mt-0.5">{piece.papel}</p>
                          </div>
                          <span className="text-xs font-bold text-gray-900 pr-1">R$ {piece.preco_venda.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alerta de Peças Indisponíveis (Para capturar o lead mesmo sem estoque) */}
                {(selectedLook.pieces ?? []).some((p) => (p.estoque_atual ?? 0) <= 0) && (
                  <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/50 text-[11px] text-amber-800 leading-relaxed flex items-start gap-2.5 shadow-inner">
                    <span className="text-base mt-0.5" aria-hidden="true">⚠️</span>
                    <div>
                      <strong className="font-bold block mb-0.5">Algumas peças deste look estão sem estoque físico.</strong>
                      Você ainda pode clicar em <strong className="font-bold uppercase">"Consultar Equivalentes"</strong> abaixo! Nossa atendente entrará em contato para encontrar opções semelhantes e montar sua composição personalizada.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé Fixo */}
            <div className="p-5 border-t border-rose-50 bg-white flex items-center justify-between shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Preço do Look Completo</span>
                <p className="font-heading text-2xl font-black text-rose-600">
                  R$ {(selectedLook.valor_total ?? 0).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedLook(null);
                  openLeadModal("look", selectedLook.id);
                }}
                className={`${
                  (selectedLook.pieces ?? []).some((p) => (p.estoque_atual ?? 0) <= 0)
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
                    : "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                } text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer`}
              >
                {(selectedLook.pieces ?? []).some((p) => (p.estoque_atual ?? 0) <= 0)
                  ? "Consultar Equivalentes"
                  : "Quero este look!"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Captura de Lead */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsLeadModalOpen(false)} />
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl z-10 border border-rose-100 space-y-4">
            <button
              onClick={() => setIsLeadModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-all"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center">
              <span className="inline-block p-3 rounded-full bg-rose-50 text-rose-500 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </span>
              <h2 className="text-lg font-black text-gray-900 leading-snug">
                {leadType === "look"
                  ? "Garanta Sua Composição"
                  : leadType === "produto"
                  ? "Garanta Seu Produto"
                  : "Fique por dentro das novidades!"}
              </h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {leadType === "look"
                  ? "Deixe seus dados para entrarmos em contato para te enviar as peças selecionadas."
                  : leadType === "produto"
                  ? "Deixe seus dados para entrarmos em contato para reservar e te enviar este produto."
                  : "Cadastre-se para receber atualizações em primeira mão sobre novas peças e looks exclusivos."}
              </p>
            </div>

            <form onSubmit={handleLeadSubmit} className="space-y-3">
              <div>
                <label htmlFor="lead-name" className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome (opcional)</label>
                <input
                  id="lead-name"
                  type="text"
                  placeholder="Seu nome"
                  value={leadForm.nome}
                  onChange={(e) => setLeadForm((f) => ({ ...f, nome: e.target.value }))}
                  className="w-full rounded-xl border border-rose-100 bg-rose-50/30 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label htmlFor="lead-email" className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail *</label>
                <input
                  id="lead-email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-rose-100 bg-rose-50/30 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label htmlFor="lead-whatsapp" className="block text-[10px] font-bold text-gray-400 uppercase mb-1">WhatsApp *</label>
                <input
                  id="lead-whatsapp"
                  type="tel"
                  placeholder="(99) 99999-9999"
                  value={leadForm.whatsapp}
                  onChange={(e) => handleWhatsappChange(e.target.value)}
                  required
                  className="w-full rounded-xl border border-rose-100 bg-rose-50/30 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-start gap-2 pt-1.5">
                <input
                  id="lead-consent"
                  type="checkbox"
                  checked={leadForm.consent}
                  onChange={(e) => setLeadForm((f) => ({ ...f, consent: e.target.checked }))}
                  required
                  className="rounded border-rose-200 text-rose-600 focus:ring-rose-400 mt-0.5 cursor-pointer"
                />
                <label htmlFor="lead-consent" className="text-[10px] text-gray-500 leading-normal cursor-pointer select-none">
                  Autorizo o envio de novidades, lançamentos de peças e promoções exclusivas via E-mail e WhatsApp.
                </label>
              </div>

              <button
                type="submit"
                disabled={leadSubmitting}
                className="w-full min-h-[40px] bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-200 mt-2 active:scale-95 transition-all flex items-center justify-center"
              >
                {leadSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Cadastrar e Continuar"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
