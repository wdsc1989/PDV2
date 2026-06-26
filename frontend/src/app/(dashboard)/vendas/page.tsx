"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch, assetUrl } from "@/api/client";
import { Input, Label, toast, ConfirmModal } from "@/components/ui";
import {
  ProductGrid,
  CartPanel,
  PaymentPanel,
  PaymentBar,
  DailySalesList,
  DailySummaryFooter,
  CashStatusBanner,
  SaleSuccessModal,
  ClientSelector,
  type Client,
  type ProductForGrid,
  type CartItemForPanel,
  type PaymentType,
  type SaleForList,
  type SummaryData,
  type CashSession,
} from "@/components/vendas";

type Product = ProductForGrid & { preco_custo: number };
type CartItem = CartItemForPanel & { preco_custo_unitario: number };
type Sale = SaleForList & { total_lucro?: number; created_at?: string };

const today = () => new Date().toISOString().slice(0, 10);
const AUTOCOMPLETE_LIMIT = 10;
const RELATED_LIMIT = 4;

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  );
}

export default function VendasPage() {
  const { isAuthenticated, user } = useAuthStore();
  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: number; nome: string }[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [cashLoading, setCashLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>("dinheiro");
  const [valueReceived, setValueReceived] = useState("");
  const [descontoTipo, setDescontoTipo] = useState<"percentual" | "valor">("percentual");
  const [descontoInput, setDescontoInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [filterMin, setFilterMin] = useState("");
  const [filterMax, setFilterMax] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [hoverPreview, setHoverPreview] = useState<{ src: string; nome: string } | null>(null);
  const [lastAddedProductId, setLastAddedProductId] = useState<number | null>(null);
  const [successSale, setSuccessSale] = useState<{ id: number; troco: number } | null>(null);
  const [cancelSaleId, setCancelSaleId] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const loadProducts = () => {
    setProductsLoading(true);
    const params = new URLSearchParams();
    params.set("active_only", "true");
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (categoryId) params.set("categoria_id", categoryId);
    apiFetch<Product[]>(`/products?${params}`)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  };

  const loadSales = () => apiFetch<Sale[]>("/sales?limit=100").then(setSales).catch(() => setSales([]));
  const loadCategories = () => apiFetch<{ id: number; nome: string }[]>("/categories/all").then(setCategories).catch(() => setCategories([]));
  const loadSummary = () => {
    setSummaryLoading(true);
    apiFetch<SummaryData>("/reports/summary?days=1").then(setSummary).catch(() => setSummary(null)).finally(() => setSummaryLoading(false));
  };
  const loadCash = () => {
    setCashLoading(true);
    apiFetch<CashSession | null>("/cash/current")
      .then(setCashSession)
      .catch(() => setCashSession(null))
      .finally(() => setCashLoading(false));
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    loadSales();
    loadCategories();
    loadSummary();
    loadCash();
  }, [mounted, isAuthenticated]);

  useEffect(() => {
    loadProducts();
  }, [searchQuery, categoryId, mounted, isAuthenticated]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const t = setTimeout(() => {
      setSuggestionsLoading(true);
      const params = new URLSearchParams();
      params.set("active_only", "true");
      params.set("q", searchQuery.trim());
      apiFetch<Product[]>(`/products?${params}`)
        .then((list) => {
          setSuggestions(list.slice(0, AUTOCOMPLETE_LIMIT));
          setShowSuggestions(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestionsLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addToCart(product: ProductForGrid, qty: number) {
    const p = product as Product;
    if (p.estoque_atual < qty) {
      toast.error(`Estoque insuficiente. Disponível: ${p.estoque_atual}`);
      return;
    }
    setLastAddedProductId(p.id);
    const existing = cart.find((c) => c.product_id === p.id);
    const newQty = existing ? existing.quantidade + qty : qty;
    if (newQty > p.estoque_atual) {
      toast.error(`Estoque máximo: ${p.estoque_atual}`);
      return;
    }
    const preco = p.preco_venda;
    const custo = p.preco_custo;
    if (existing) {
      setCart((prev) =>
        prev.map((c) =>
          c.product_id === p.id ? { ...c, quantidade: newQty, subtotal: newQty * preco, preco_custo_unitario: custo } : c
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          product_id: p.id,
          nome: p.nome,
          quantidade: qty,
          preco_unitario: preco,
          preco_custo_unitario: custo,
          subtotal: qty * preco,
        },
      ]);
    }
  }

  function selectSuggestion(p: Product) {
    addToCart(p, 1);
    setSearchQuery("");
    setShowSuggestions(false);
    setSuggestions([]);
    // leitor de código de barras / operador: pronto para a próxima bipada
    searchRef.current?.focus();
  }

  /** Enter na busca: prioriza código exato (leitor de código de barras), senão 1ª sugestão. */
  async function handleSearchEnter() {
    const term = searchQuery.trim();
    if (!term) return;
    const matchCode = (s: Product) =>
      s.codigo.toLowerCase() === term.toLowerCase() ||
      (s.codigo_barras ?? "").toLowerCase() === term.toLowerCase();
    const exactLocal = suggestions.find(matchCode);
    if (exactLocal) {
      selectSuggestion(exactLocal);
      return;
    }
    // scanner digita + Enter mais rápido que o debounce de 200ms — busca direta
    try {
      const params = new URLSearchParams();
      params.set("active_only", "true");
      params.set("q", term);
      const list = await apiFetch<Product[]>(`/products?${params}`);
      const exact = list.find(matchCode);
      const pick = exact ?? list[0];
      if (pick) {
        selectSuggestion(pick);
      } else {
        toast.error(`Nenhum produto encontrado para "${term}".`);
      }
    } catch {
      toast.error("Erro ao buscar produto.");
    }
  }

  function setCartQty(productId: number, newQty: number) {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((c) => c.product_id !== productId));
      return;
    }
    const product = products.find((x) => x.id === productId);
    if (product && newQty > product.estoque_atual) {
      toast.error(`Estoque máximo: ${product.estoque_atual}`);
      newQty = product.estoque_atual;
    }
    setCart((prev) =>
      prev.map((c) =>
        c.product_id === productId ? { ...c, quantidade: newQty, subtotal: newQty * c.preco_unitario } : c
      )
    );
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((c) => c.product_id !== productId));
  }

  function clearCart() {
    setCart([]);
    setValueReceived("");
    setDescontoInput("");
  }

  const cartTotal = cart.reduce((s, c) => s + c.subtotal, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantidade, 0);
  const descontoValor = (() => {
    const v = parseFloat(descontoInput) || 0;
    if (v <= 0 || cartTotal <= 0) return 0;
    const d = descontoTipo === "percentual" ? cartTotal * (v / 100) : v;
    return Math.max(0, Math.min(d, cartTotal));
  })();
  const cartTotalLiquido = Math.max(0, +(cartTotal - descontoValor).toFixed(2));
  const cashClosed = !cashLoading && !cashSession;

  const handleFinish = useCallback(async () => {
    if (cart.length === 0) {
      toast.error("Adicione pelo menos um item à sacola.");
      return;
    }
    if (cashClosed) {
      toast.error("Abra o caixa antes de registrar vendas.");
      return;
    }
    const received = parseFloat(valueReceived) || 0;
    if (paymentType === "dinheiro" && received < cartTotalLiquido) {
      toast.error("Valor recebido insuficiente.");
      return;
    }
    setSubmitting(true);
    try {
      const descInput = parseFloat(descontoInput) || 0;
      const res = await apiFetch<{ id: number }>("/sales", {
        method: "POST",
        body: JSON.stringify({
          tipo_pagamento: paymentType,
          desconto_tipo: descInput > 0 ? descontoTipo : null,
          desconto_input: descInput > 0 ? descInput : null,
          client_id: selectedClient?.id ?? null,
          itens: cart.map((c) => ({
            product_id: c.product_id,
            quantidade: c.quantidade,
            preco_unitario: c.preco_unitario,
            preco_custo_unitario: c.preco_custo_unitario,
          })),
        }),
      });
      const troco = paymentType === "dinheiro" ? Math.max(0, received - cartTotalLiquido) : 0;
      setCart([]);
      setValueReceived("");
      setDescontoInput("");
      setSelectedClient(null);
      setMobileCartOpen(false);
      setSuccessSale({ id: res.id, troco });
      loadSales();
      loadSummary();
      loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao finalizar venda.");
    } finally {
      setSubmitting(false);
    }
  }, [cart, paymentType, valueReceived, cartTotalLiquido, descontoInput, descontoTipo, cashClosed, selectedClient]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "F5") {
        e.preventDefault();
        if (!inInput && cart.length > 0 && !cashClosed) {
          const canFinish = paymentType !== "dinheiro" || (parseFloat(valueReceived) || 0) >= cartTotalLiquido;
          if (canFinish) handleFinish();
        }
      }
      if (e.key === "Escape") {
        if (showSuggestions) {
          setShowSuggestions(false);
          e.preventDefault();
        } else if (mobileCartOpen) {
          setMobileCartOpen(false);
          e.preventDefault();
        } else if (cart.length > 0 && !inInput) {
          setCart([]);
          setValueReceived("");
          e.preventDefault();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cart, paymentType, valueReceived, cartTotalLiquido, handleFinish, showSuggestions, cashClosed, mobileCartOpen]);

  function confirmCancelSale() {
    if (cancelSaleId == null) return;
    setCancelLoading(true);
    apiFetch(`/sales/${cancelSaleId}`, { method: "PATCH", body: JSON.stringify({ status: "cancelada" }) })
      .then(() => {
        toast.success("Venda estornada. O estoque foi devolvido.");
        loadSales();
        loadSummary();
        loadProducts();
      })
      .catch((e) => toast.error(e.message || "Erro ao estornar"))
      .finally(() => {
        setCancelLoading(false);
        setCancelSaleId(null);
      });
  }

  const salesToday = useMemo(() => sales.filter((s) => s.data_venda === today()), [sales]);

  const lastAdded = lastAddedProductId != null ? products.find((p) => p.id === lastAddedProductId) : null;
  const relatedProducts = useMemo(() => {
    if (!lastAdded || lastAdded.categoria_id == null) return [];
    return products
      .filter((p) => p.id !== lastAdded.id && p.categoria_id === lastAdded.categoria_id && p.estoque_atual > 0)
      .slice(0, RELATED_LIMIT);
  }, [products, lastAdded]);

  if (!mounted) return <div className="p-4">Carregando...</div>;

  const paymentDisabledReason = cashClosed ? "Caixa fechado — abra o caixa para finalizar." : null;

  const checkout = (
    <div className="space-y-4">
      <ClientSelector
        selectedClientId={selectedClient?.id ?? null}
        onSelectClient={setSelectedClient}
      />
      <div className="flex-1 min-h-[280px] lg:min-h-0">
        <CartPanel
          items={cart}
          onQtyChange={setCartQty}
          onRemove={removeFromCart}
          onClear={clearCart}
          total={cartTotalLiquido}
        />
      </div>
      <PaymentPanel
        total={cartTotalLiquido}
        subtotalBruto={cartTotal}
        descontoTipo={descontoTipo}
        onDescontoTipoChange={setDescontoTipo}
        descontoInput={descontoInput}
        onDescontoInputChange={setDescontoInput}
        descontoValor={descontoValor}
        paymentType={paymentType}
        onPaymentTypeChange={setPaymentType}
        valueReceived={valueReceived}
        onValueReceivedChange={setValueReceived}
        onFinish={handleFinish}
        submitting={submitting}
        disabledReason={paymentDisabledReason}
      />
    </div>
  );

  return (
    <div className="pb-24 lg:pb-32">
      <h1 className="font-heading text-2xl font-bold text-gray-900 mb-4">Vendas</h1>

      <CashStatusBanner
        session={cashSession}
        loading={cashLoading}
        onOpened={(s) => {
          setCashSession(s);
          loadSummary();
        }}
      />

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0 flex flex-col">
          <div ref={searchWrapRef} className="relative mb-3">
            <Label htmlFor="search">Buscar produto (F2) — código de barras adiciona direto</Label>
            <Input
              id="search"
              ref={searchRef}
              type="text"
              autoComplete="off"
              placeholder="Nome, código ou categoria..."
              className="min-h-[48px] text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearchEnter();
                }
              }}
            />
            {showSuggestions && (
              <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-auto">
                {suggestionsLoading ? (
                  <li className="px-3 py-2 text-sm text-gray-500">Buscando...</li>
                ) : suggestions.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-gray-500">Nenhum resultado</li>
                ) : (
                  suggestions.map((p) => {
                    const thumb = p.imagem_path ? assetUrl(p.imagem_path) : null;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="w-full min-h-[44px] cursor-pointer text-left px-3 py-2 text-sm hover:bg-rose-50 flex items-center gap-3"
                          onClick={() => selectSuggestion(p)}
                          onMouseEnter={() => setHoverPreview(thumb ? { src: thumb, nome: p.nome } : null)}
                          onMouseLeave={() => setHoverPreview(null)}
                        >
                          <span className="shrink-0 w-10 h-10 rounded bg-rose-50 flex items-center justify-center overflow-hidden">
                            {thumb ? (
                              <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <PackageIcon className="w-5 h-5 text-rose-300" />
                            )}
                          </span>
                          <span className="truncate flex-1">{p.nome}</span>
                          <span className="text-primary-700 font-semibold tabular-nums shrink-0 ml-2">
                            R$ {p.preco_venda.toFixed(2)}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            )}
            {/* Zoom da imagem ao aproximar o mouse (oculto no mobile) */}
            {showSuggestions && hoverPreview && (
              <div className="hidden sm:block absolute z-20 top-full left-full ml-3 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-xl pointer-events-none">
                <img src={hoverPreview.src} alt={hoverPreview.nome} className="w-full h-56 object-contain rounded" />
                <p className="mt-1 text-xs text-gray-600 text-center truncate">{hoverPreview.nome}</p>
              </div>
            )}
          </div>

          <div
            className="mb-3 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]"
            role="group"
            aria-label="Filtrar por categoria"
          >
            <button
              type="button"
              onClick={() => setCategoryId("")}
              aria-pressed={categoryId === ""}
              className={`min-h-[44px] shrink-0 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                categoryId === ""
                  ? "border-primary-700 bg-primary-700 text-white"
                  : "border-rose-200 bg-white text-gray-700 hover:bg-rose-50"
              }`}
            >
              Todas
            </button>
            {categories.map((c) => {
              const active = categoryId === String(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(active ? "" : String(c.id))}
                  aria-pressed={active}
                  className={`min-h-[44px] shrink-0 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                    active
                      ? "border-primary-700 bg-primary-700 text-white"
                      : "border-rose-200 bg-white text-gray-700 hover:bg-rose-50"
                  }`}
                >
                  {c.nome}
                </button>
              );
            })}
          </div>

          <div className="min-h-[300px]">
            <ProductGrid
              products={products.filter((p) => p.estoque_atual > 0)}
              onAdd={addToCart}
              loading={productsLoading}
            />
          </div>

          {relatedProducts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Você também pode gostar</h3>
              <div className="flex flex-wrap gap-2">
                {relatedProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p, 1)}
                    disabled={p.estoque_atual < 1}
                    className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 shadow-sm transition-colors duration-150 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[140px]">{p.nome}</span>
                    <span className="text-sm text-primary-700 font-semibold tabular-nums">
                      R$ {p.preco_venda.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sacola (produtos) na lateral — rolagem própria, bem visível. O pagamento fica na barra inferior fixa. */}
        <aside className="hidden lg:block w-[360px] shrink-0 self-start sticky top-4 space-y-4">
          <ClientSelector
            selectedClientId={selectedClient?.id ?? null}
            onSelectClient={setSelectedClient}
          />
          <CartPanel
            items={cart}
            onQtyChange={setCartQty}
            onRemove={removeFromCart}
            onClear={clearCart}
            total={cartTotalLiquido}
          />
        </aside>
      </div>

      {/* Barra de pagamento fixa no rodapé (desktop) — sempre visível */}
      <div className="hidden lg:block fixed bottom-0 left-64 right-0 z-20 border-t border-rose-100 bg-white px-6 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <PaymentBar
          total={cartTotalLiquido}
          subtotalBruto={cartTotal}
          descontoTipo={descontoTipo}
          onDescontoTipoChange={setDescontoTipo}
          descontoInput={descontoInput}
          onDescontoInputChange={setDescontoInput}
          descontoValor={descontoValor}
          paymentType={paymentType}
          onPaymentTypeChange={setPaymentType}
          valueReceived={valueReceived}
          onValueReceivedChange={setValueReceived}
          onFinish={handleFinish}
          submitting={submitting}
          disabledReason={paymentDisabledReason}
        />
      </div>

      {/* Mobile: barra fixa inferior + sacola em bottom-sheet */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rose-100 bg-white p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] lg:hidden">
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="flex min-h-[52px] w-full cursor-pointer items-center justify-between rounded-lg bg-primary-700 px-4 text-white transition-colors duration-150 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          <span className="text-sm font-medium">
            {cartCount > 0 ? `${cartCount} ${cartCount === 1 ? "item" : "itens"}` : "Sacola vazia"}
          </span>
          <span className="font-heading text-lg font-bold tabular-nums">R$ {cartTotalLiquido.toFixed(2)}</span>
        </button>
      </div>
      {mobileCartOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" aria-hidden onClick={() => setMobileCartOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Sacola e pagamento"
            className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-3 overflow-y-auto rounded-t-2xl bg-gray-50 p-4"
          >
            <div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-gray-300" aria-hidden />
            {checkout}
            <button
              type="button"
              onClick={() => setMobileCartOpen(false)}
              className="min-h-[44px] cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Continuar comprando
            </button>
          </div>
        </div>
      )}

      <SaleSuccessModal
        open={successSale != null}
        saleId={successSale?.id ?? null}
        troco={successSale?.troco ?? 0}
        onNewSale={() => {
          setSuccessSale(null);
          searchRef.current?.focus();
        }}
      />

    </div>
  );
}
