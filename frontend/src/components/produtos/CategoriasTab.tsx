"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { Button, Modal, Table, Input, Label, Badge, toast, ConfirmModal, PageHeader, SkeletonRows, EmptyState, ErrorState } from "@/components/ui";

type Category = { id: number; nome: string; descricao: string | null; ativo: boolean };

export function CategoriasTab() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nomeError, setNomeError] = useState("");
  const [form, setForm] = useState({ nome: "", descricao: "", ativo: true });

  const loadCategories = () => {
    setLoading(true);
    setLoadError(false);
    apiFetch<Category[]>("/categories/all")
      .then(setCategories)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    loadCategories();
  }, [mounted, isAuthenticated]);

  function openCreate() {
    setEditingId(null);
    setForm({ nome: "", descricao: "", ativo: true });
    setShowModal(true);
    setError("");
  }

  function openEdit(c: Category) {
    setEditingId(c.id);
    setForm({ nome: c.nome, descricao: c.descricao || "", ativo: c.ativo });
    setShowModal(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) {
      setNomeError("Informe o nome da categoria.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (editingId !== null) {
        await apiFetch(`/categories/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({ nome: form.nome.trim(), descricao: form.descricao.trim() || null, ativo: form.ativo }),
        });
        toast.success("Categoria atualizada.");
      } else {
        await apiFetch("/categories", {
          method: "POST",
          body: JSON.stringify({ nome: form.nome.trim(), descricao: form.descricao.trim() || null, ativo: form.ativo }),
        });
        toast.success("Categoria criada.");
      }
      setShowModal(false);
      loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleteId == null) return;
    setDeleting(true);
    try {
      await apiFetch(`/categories/${deleteId}`, { method: "DELETE" });
      toast.success("Categoria excluída.");
      loadCategories();
      if (editingId === deleteId) setShowModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  if (!mounted) return <div className="p-4">Carregando...</div>;

  return (
    <div>
      <PageHeader
        title="Categorias"
        subtitle="Organize os produtos para filtrar mais rápido na venda"
        actions={
          <Button variant="primary" onClick={openCreate}>
            + Nova categoria
          </Button>
        }
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId !== null ? "Editar categoria" : "Nova categoria"}
      >
        <form onSubmit={handleSubmit}>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <div className="grid gap-3">
            <div>
              <Label htmlFor="cat-nome">Nome *</Label>
              <Input
                id="cat-nome"
                value={form.nome}
                aria-invalid={nomeError ? true : undefined}
                className={nomeError ? "border-red-500" : ""}
                onChange={(e) => {
                  setForm((f) => ({ ...f, nome: e.target.value }));
                  if (nomeError && e.target.value.trim()) setNomeError("");
                }}
                onBlur={() => setNomeError(form.nome.trim() ? "" : "Informe o nome da categoria.")}
                required
              />
              {nomeError && <p role="alert" className="mt-1 text-xs text-red-600">{nomeError}</p>}
            </div>
            <div>
              <Label htmlFor="cat-desc">Descrição</Label>
              <Input
                id="cat-desc"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cat-ativo"
                checked={form.ativo}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="cat-ativo">Ativo</Label>
            </div>
            <div className="flex gap-2 mt-2">
              <Button type="submit" loading={saving}>
                Salvar
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {loading ? (
        <SkeletonRows rows={6} cols={3} />
      ) : loadError ? (
        <ErrorState onRetry={loadCategories} />
      ) : categories.length === 0 ? (
        <EmptyState
          title="Nenhuma categoria ainda"
          message="Crie a primeira categoria para organizar os produtos na tela de venda."
          actionLabel="+ Nova categoria"
          onAction={openCreate}
        />
      ) : (
        <Table<Category>
          columns={[
            { key: "nome", label: "Nome" },
            { key: "descricao", label: "Descrição", render: (r) => r.descricao ?? "—" },
            { key: "ativo", label: "Ativo", render: (r) => (r.ativo ? <Badge variant="success">Sim</Badge> : <Badge variant="default">Não</Badge>) },
          ]}
          data={categories}
          keyExtractor={(r) => r.id}
          actions={(c) => (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(c)}>Editar</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteId(c.id)} className="text-red-600">Excluir</Button>
            </>
          )}
        />
      )}

      <ConfirmModal
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir categoria"
        message="Excluir esta categoria? Os produtos dela não são apagados, mas ficam sem categoria."
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
