"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { Input, Label, toast, ConfirmModal } from "@/components/ui";
import {
  ProductGrid,
  CartPanel,
  PaymentPanel,
  DailySalesList,
  DailySummaryFooter,
  CashStatusBanner,
  SaleSuccessModal,
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
  const [submitting, setSubmitting] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [filterMin, setFilterMin] = useState("");
  const [filterMax, setFilterMax] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [lastAddedProductId, setLastAddedProductId] = useState<number | null>(null);
  const [successSale, setSuccessSale] = useState<{ id: number; troco: number } | null>(null);
  const [cancelSaleId, setCancelSaleId] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

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
    const exactLocal = suggestions.find((s) => s.codigo.toLowerCase() === term.toLowerCase());
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
      const exact = list.find((s) => s.codigo.toLowerCase() === term.toLowerCase());
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

  const cartTotal = cart.reduce((s, c) => s + c.subtotal, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantidade, 0);
  const cashClosed = !cashLoading && !cashSession;

  const handleFinish = useCallback(async () => {
    if (cart.length === 0) {
      toast.error("Adicione pelo menos um item ao carrinho.");
      return;
    }
    if (cashClosed) {
      toast.error("Abra o caixa antes de registrar vendas.");
      return;
    }
    const received = parseFloat(valueReceived) || 0;
    if (paymentType === "dinheiro" && received < cartTotal) {
      toast.error("Valor recebido insuficiente.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<{ id: number }>("/sales", {
        method: "POST",
        body: JSON.stringify({
          tipo_pagamento: paymentType,
          itens: cart.map((c) => ({
            product_id: c.product_id,
            quantidade: c.quantidade,
            preco_unitario: c.preco_unitario,
            preco_custo_unitario: c.preco_custo_unitario,
          })),
        }),
      });
      const troco = paymentType === "dinheiro" ? Math.max(0, received - cartTotal) : 0;
      setCart([]);
      setValueReceived("");
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
  }, [cart, paymentType, valueReceived, cartTotal, cashClosed]);

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
          const total = cart.reduce((s, c) => s + c.subtotal, 0);
          const canFinish = paymentType !== "dinheiro" || (parseFloat(valueReceived) || 0) >= total;
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
  }, [cart, paymentType, valueReceived, handleFinish, showSuggestions, cashClosed, mobileCartOpen]);

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
    <>
      <div className="flex-1 min-h-[280px] lg:min-h-0">
        <CartPanel items={cart} onQtyChange={setCartQty} onRemove={removeFromCart} total={cartTotal} />
      </div>
      <PaymentPanel
        total={cartTotal}
        paymentType={paymentType}
        onPaymentTypeChange={setPaymentType}
        valueReceived={valueReceived}
        onValueReceivedChange={setValueReceived}
        onFinish={handleFinish}
        submitting={submitting}
        disabledReason={paymentDisabledReason}
      />
    </>
  );

  return (
    <div className="flex flex-col h-full pb-20 lg:pb-0">
      <h1 className="font-heading text-2xl font-bold text-gray-900 mb-4">Vendas</h1>

      <CashStatusBanner
        session={cashSession}
        loading={cashLoading}
        onOpened={(s) => {
          setCashSession(s);
          loadSummary();
        }}
      />

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
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
              <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {suggestionsLoading ? (
                  <li className="px-3 py-2 text-sm text-gray-500">Buscando...</li>
                ) : suggestions.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-gray-500">Nenhum resultado</li>
                ) : (
                  suggestions.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="w-full min-h-[44px] cursor-pointer text-left px-3 py-2 text-sm hover:bg-rose-50 flex justify-between items-center"
                        onClick={() => selectSuggestion(p)}
                      >
                        <span className="truncate">{p.nome}</span>
                        <span className="text-primary-700 font-semibold tabular-nums shrink-0 ml-2">
                          R$ {p.preco_venda.toFixed(2)}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
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

          <div className="flex-1 min-h-[300px] overflow-auto">
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

        {/* Checkout fixo à direita no desktop/tablet horizontal */}
        <div className="hidden lg:flex w-[400px] flex-col gap-4 shrink-0">{checkout}</div>
      </div>

      {/* Mobile: barra fixa inferior + carrinho em bottom-sheet */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rose-100 bg-white p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] lg:hidden">
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="flex min-h-[52px] w-full cursor-pointer items-center justify-between rounded-lg bg-primary-700 px-4 text-white transition-colors duration-150 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          <span className="text-sm font-medium">
            {cartCount > 0 ? `${cartCount} ${cartCount === 1 ? "item" : "itens"}` : "Carrinho vazio"}
          </span>
          <span className="font-heading text-lg font-bold tabular-nums">R$ {cartTotal.toFixed(2)}</span>
        </button>
      </div>
      {mobileCartOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" aria-hidden onClick={() => setMobileCartOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Carrinho e pagamento"
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

      <div className="mt-6">
        <DailySalesList
          sales={salesToday}
          onRecibo={(id) => window.open(`/recibo/${id}`, "_blank")}
          onCancel={(id) => setCancelSaleId(id)}
          canCancel={user?.role !== "vendedor"}
          filterMin={filterMin}
          filterMax={filterMax}
          onFilterMinChange={setFilterMin}
          onFilterMaxChange={setFilterMax}
        />
        <DailySummaryFooter data={summary} loading={summaryLoading} />
      </div>

      <SaleSuccessModal
        open={successSale != null}
        saleId={successSale?.id ?? null}
        troco={successSale?.troco ?? 0}
        onNewSale={() => {
          setSuccessSale(null);
          searchRef.current?.focus();
        }}
      />

      <ConfirmModal
        open={cancelSaleId != null}
        onClose={() => setCancelSaleId(null)}
        onConfirm={confirmCancelSale}
        title="Estornar venda"
        message="Estornar esta venda? Os itens voltam para o estoque e a venda sai do total do dia."
        confirmLabel="Estornar"
        variant="danger"
        loading={cancelLoading}
      />
    </div>
  );
}
