"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { Input, Label, Select, toast, Button } from "@/components/ui";
import {
  ProductGrid,
  CartPanel,
  PaymentPanel,
  DailySalesList,
  DailySummaryFooter,
  type ProductForGrid,
  type CartItemForPanel,
  type PaymentType,
  type SaleForList,
  type SummaryData,
} from "@/components/vendas";

type Product = ProductForGrid & { preco_custo: number };
type CartItem = CartItemForPanel & { preco_custo_unitario: number };
type Sale = SaleForList & { total_lucro?: number; created_at?: string };

const today = () => new Date().toISOString().slice(0, 10);
const AUTOCOMPLETE_LIMIT = 10;
const RELATED_LIMIT = 4;

export default function VendasPage() {
  const { isAuthenticated } = useAuthStore();
  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: number; nome: string }[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>("dinheiro");
  const [valueReceived, setValueReceived] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [filterMin, setFilterMin] = useState("");
  const [filterMax, setFilterMax] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [lastAddedProductId, setLastAddedProductId] = useState<number | null>(null);

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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    loadSales();
    loadCategories();
    loadSummary();
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
    setError("");
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

  const handleFinish = useCallback(async () => {
    if (cart.length === 0) {
      toast.error("Adicione pelo menos um item ao carrinho.");
      return;
    }
    if (paymentType === "dinheiro" && (parseFloat(valueReceived) || 0) < cartTotal) {
      toast.error("Valor recebido insuficiente.");
      return;
    }
    setError("");
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
      toast.success("Venda registrada.");
      setCart([]);
      setValueReceived("");
      loadSales();
      loadSummary();
      window.open(`/recibo/${res.id}`, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao finalizar. Verifique se o caixa está aberto.");
      toast.error(err instanceof Error ? err.message : "Erro ao finalizar venda.");
    } finally {
      setSubmitting(false);
    }
  }, [cart, paymentType, valueReceived]);

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
        if (!inInput && cart.length > 0) {
          const total = cart.reduce((s, c) => s + c.subtotal, 0);
          const canFinish = paymentType !== "dinheiro" || (parseFloat(valueReceived) || 0) >= total;
          if (canFinish) handleFinish();
        }
      }
      if (e.key === "Escape") {
        if (showSuggestions) {
          setShowSuggestions(false);
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
  }, [cart, paymentType, valueReceived, handleFinish, showSuggestions]);

  function handleCancelSale(saleId: number) {
    if (!confirm("Estornar esta venda? O estoque será devolvido.")) return;
    apiFetch(`/sales/${saleId}`, { method: "PATCH", body: JSON.stringify({ status: "cancelada" }) })
      .then(() => {
        toast.success("Venda estornada.");
        loadSales();
        loadSummary();
      })
      .catch((e) => toast.error(e.message || "Erro ao estornar"));
  }

  const salesToday = useMemo(() => sales.filter((s) => s.data_venda === today()), [sales]);
  const categoryOptions = useMemo(
    () => [{ value: "", label: "Todas categorias" }, ...categories.map((c) => ({ value: String(c.id), label: c.nome }))],
    [categories]
  );

  const lastAdded = lastAddedProductId != null ? products.find((p) => p.id === lastAddedProductId) : null;
  const relatedProducts = useMemo(() => {
    if (!lastAdded || lastAdded.categoria_id == null) return [];
    return products
      .filter((p) => p.id !== lastAdded.id && p.categoria_id === lastAdded.categoria_id && p.estoque_atual > 0)
      .slice(0, RELATED_LIMIT);
  }, [products, lastAdded]);

  if (!mounted) return <div className="p-4">Carregando...</div>;

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Vendas</h1>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex flex-wrap gap-3 mb-3">
            <div ref={searchWrapRef} className="flex-1 min-w-[200px] relative">
              <Label htmlFor="search">Buscar produto (F2, Enter adiciona 1º)</Label>
              <Input
                id="search"
                ref={searchRef}
                type="text"
                placeholder="Nome, código ou categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && suggestions.length > 0) {
                    e.preventDefault();
                    selectSuggestion(suggestions[0]);
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
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex justify-between items-center"
                          onClick={() => selectSuggestion(p)}
                        >
                          <span className="truncate">{p.nome}</span>
                          <span className="text-blue-600 font-medium shrink-0 ml-2">R$ {p.preco_venda.toFixed(2)}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
            <div className="w-40">
              <Label htmlFor="cat">Categoria</Label>
              <Select id="cat" options={categoryOptions} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
            </div>
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
                  <div
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm"
                  >
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{p.nome}</span>
                    <span className="text-sm text-blue-600 font-semibold">R$ {p.preco_venda.toFixed(2)}</span>
                    <Button type="button" size="sm" onClick={() => addToCart(p, 1)} disabled={p.estoque_atual < 1}>
                      +
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
          <div className="flex-1 min-h-[280px] lg:min-h-0">
            <CartPanel
              items={cart}
              onQtyChange={setCartQty}
              onRemove={removeFromCart}
              total={cartTotal}
            />
          </div>
          <PaymentPanel
            total={cartTotal}
            paymentType={paymentType}
            onPaymentTypeChange={setPaymentType}
            valueReceived={valueReceived}
            onValueReceivedChange={setValueReceived}
            onFinish={handleFinish}
            submitting={submitting}
          />
        </div>
      </div>

      <div className="mt-6">
        <DailySalesList
          sales={salesToday}
          onRecibo={(id) => window.open(`/recibo/${id}`, "_blank")}
          onCancel={handleCancelSale}
          filterMin={filterMin}
          filterMax={filterMax}
          onFilterMinChange={setFilterMin}
          onFilterMaxChange={setFilterMax}
        />
        <DailySummaryFooter data={summary} loading={summaryLoading} />
      </div>
    </div>
  );
}
