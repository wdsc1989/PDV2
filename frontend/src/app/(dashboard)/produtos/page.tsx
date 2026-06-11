"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch, assetUrl } from "@/api/client";
import { Button, Card, Table, Input, Label, Select, toast, KpiCard, FilterBar, Badge, ConfirmModal, PageHeader } from "@/components/ui";

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
  nome: string;
  categoria: string | null;
  categoria_id: number | null;
  marca: string | null;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number | null;
  ativo: boolean;
  imagem_path: string | null;
};

export default function ProdutosPage() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    codigo: "",
    nome: "",
    categoria: "",
    marca: "",
    preco_custo: "0",
    preco_venda: "0",
    estoque_minimo: "",
    ativo: true,
    categoria_id: "",
    imagem_path: "",
  });
  const [showStockForm, setShowStockForm] = useState(false);
  const [stockProductId, setStockProductId] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockCusto, setStockCusto] = useState("");
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<{ id: number; nome: string }[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "ativo" | "inativo">("all");
  const [filterBaixoEstoque, setFilterBaixoEstoque] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const loadProducts = () => apiFetch<Product[]>("/products?active_only=false").then(setProducts).catch(() => setProducts([]));
  const loadCategories = () => apiFetch<{ id: number; nome: string }[]>("/categories/all").then(setCategories).catch(() => setCategories([]));

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
    return list;
  }, [products, search, filterCategoria, filterStatus, filterBaixoEstoque]);

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
  }, [mounted, isAuthenticated]);

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      codigo: p.codigo,
      nome: p.nome,
      categoria: p.categoria || "",
      marca: p.marca || "",
      preco_custo: String(p.preco_custo),
      preco_venda: String(p.preco_venda),
      estoque_minimo: p.estoque_minimo != null ? String(p.estoque_minimo) : "",
      ativo: p.ativo,
      categoria_id: p.categoria_id != null ? String(p.categoria_id) : "",
      imagem_path: p.imagem_path || "",
    });
    setShowForm(true);
  }

  async function handleSubmitProduct(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = {
      codigo: form.codigo.trim(),
      nome: form.nome.trim(),
      categoria: form.categoria.trim() || null,
      marca: form.marca.trim() || null,
      preco_custo: parseFloat(form.preco_custo) || 0,
      preco_venda: parseFloat(form.preco_venda) || 0,
      estoque_minimo: form.estoque_minimo ? parseFloat(form.estoque_minimo) : null,
      ativo: form.ativo,
      categoria_id: form.categoria_id ? parseInt(form.categoria_id, 10) : null,
      imagem_path: form.imagem_path.trim() || null,
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
        const fd = new FormData();
        fd.append("file", imageFile);
        try {
          await apiFetch(`/products/${productId}/image`, { method: "POST", body: fd });
        } catch (imgErr) {
          toast.error(imgErr instanceof Error ? imgErr.message : "Produto salvo, mas a foto falhou.");
        }
      }
      setImageFile(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      setForm({ codigo: "", nome: "", categoria: "", marca: "", preco_custo: "0", preco_venda: "0", estoque_minimo: "", ativo: true, categoria_id: "", imagem_path: "" });
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
    const pid = parseInt(stockProductId, 10);
    const qty = parseFloat(stockQty);
    if (!pid || !qty || qty <= 0) return;
    setStockError("");
    setStockSaving(true);
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const custo = stockCusto.trim() ? parseFloat(stockCusto.replace(",", ".")) : null;
      await apiFetch("/stock/entries", {
        method: "POST",
        body: JSON.stringify({ product_id: pid, quantity: qty, preco_custo_unitario: custo, data_entrada: hoje, observacao: "Entrada pelo frontend" }),
      });
      toast.success(custo != null ? "Entrada registrada. Custo médio atualizado." : "Entrada de estoque registrada.");
      setStockProductId("");
      setStockQty("");
      setStockCusto("");
      setShowStockForm(false);
      loadProducts();
    } catch (err) {
      setStockError(err instanceof Error ? err.message : "Erro ao registrar entrada");
      toast.error(err instanceof Error ? err.message : "Erro ao registrar entrada");
    } finally {
      setStockSaving(false);
    }
  }

  if (!mounted) return <div className="p-4">Carregando...</div>;

  const productOptions = products.map((p) => ({ value: String(p.id), label: `${p.codigo} - ${p.nome} (est: ${p.estoque_atual})` }));

  const categoryOptions = [{ value: "", label: "Nenhuma" }, ...categories.map((c) => ({ value: String(c.id), label: c.nome }))];
  const statusOptions = [
    { value: "all", label: "Todos" },
    { value: "ativo", label: "Ativo" },
    { value: "inativo", label: "Inativo" },
  ];

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Cadastro e gestão de produtos"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowStockForm((v) => !v)}>
              {showStockForm ? "Cancelar" : "Entrada de estoque"}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditingId(null);
                setImageFile(null);
                setForm({ codigo: "", nome: "", categoria: "", marca: "", preco_custo: "0", preco_venda: "0", estoque_minimo: "", ativo: true, categoria_id: "", imagem_path: "" });
                setShowForm((v) => !v);
              }}
            >
              {showForm ? "Cancelar" : "+ Novo produto"}
            </Button>
          </>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome ou código"
        onClear={() => {
          setSearch("");
          setFilterCategoria("");
          setFilterStatus("all");
          setFilterBaixoEstoque(false);
        }}
      >
        <Select
          options={[{ value: "", label: "Todas categorias" }, ...categories.map((c) => ({ value: String(c.id), label: c.nome }))]}
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          className="min-w-[140px]"
        />
        <Select
          options={statusOptions}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "all" | "ativo" | "inativo")}
          className="min-w-[120px]"
        />
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-gray-700">
          <input type="checkbox" checked={filterBaixoEstoque} onChange={(e) => setFilterBaixoEstoque(e.target.checked)} className="rounded" />
          Apenas baixo estoque
        </label>
      </FilterBar>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Total de produtos" value={String(kpiTotal)} />
        <KpiCard label="Baixo estoque" value={String(kpiBaixoEstoque)} variant={kpiBaixoEstoque > 0 ? "alert" : "default"} />
        <KpiCard label="Valor em estoque (custo)" value={`R$ ${kpiValorEstoque.toFixed(2)}`} />
      </div>

      {showStockForm && (
        <Card title="Entrada de estoque" className="mb-8 max-w-md">
          <form onSubmit={handleEntradaEstoque}>
            {stockError && <p className="text-red-600 text-sm mb-2">{stockError}</p>}
            <div className="grid gap-3">
              <div>
                <Label htmlFor="stock-prod">Produto</Label>
                <Select id="stock-prod" options={[{ value: "", label: "Selecione..." }, ...productOptions]} value={stockProductId} onChange={(e) => setStockProductId(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="stock-qty">Quantidade</Label>
                <Input id="stock-qty" type="number" step="0.01" min="0.01" value={stockQty} onChange={(e) => setStockQty(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="stock-custo">Custo unitário (R$)</Label>
                <Input id="stock-custo" type="number" step="0.01" min="0" placeholder="opcional — atualiza o custo médio" value={stockCusto} onChange={(e) => setStockCusto(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" loading={stockSaving}>Registrar entrada</Button>
                <Button type="button" variant="secondary" onClick={() => setShowStockForm(false)}>Cancelar</Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {showForm && (
        <Card title="Cadastrar produto" className="mb-8 max-w-lg">
          <form onSubmit={handleSubmitProduct}>
            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
            <div className="grid gap-3">
              <div>
                <Label htmlFor="codigo">Código *</Label>
                <Input id="codigo" value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} required />
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
              <div>
                <Label htmlFor="imagem-file">Foto do produto</Label>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-rose-50">
                    {imageFile ? (
                      <img src={URL.createObjectURL(imageFile)} alt="Pré-visualização" className="h-full w-full object-cover" />
                    ) : form.imagem_path ? (
                      <img src={assetUrl(form.imagem_path) ?? undefined} alt="Foto atual" className="h-full w-full object-cover" />
                    ) : (
                      <ProductPlaceholderIcon className="w-7 h-7" />
                    )}
                  </div>
                  <input
                    id="imagem-file"
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    className="text-sm text-gray-600 file:mr-3 file:min-h-[40px] file:cursor-pointer file:rounded-lg file:border-0 file:bg-rose-50 file:px-3 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-rose-100"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">JPG, PNG ou WebP até 5 MB — aparece na grade da tela de venda.</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} className="rounded" />
                <Label htmlFor="ativo">Ativo</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      <div className="hidden lg:block">
        <Table<Product>
          columns={[
            {
              key: "imagem_path",
              label: "Imagem",
              render: (r) => (
                <div className="w-10 h-10 rounded bg-rose-50 flex items-center justify-center overflow-hidden shrink-0">
                  {r.imagem_path ? (
                    <img src={assetUrl(r.imagem_path) ?? undefined} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <ProductPlaceholderIcon />
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
    </div>
  );
}
