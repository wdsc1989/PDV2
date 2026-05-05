"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { Button, Modal, Table, Input, Label, Badge, toast } from "@/components/ui";

type Category = { id: number; nome: string; descricao: string | null; ativo: boolean };

export default function CategoriasPage() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ nome: "", descricao: "", ativo: true });

  const loadCategories = () => apiFetch<Category[]>("/categories/all").then(setCategories).catch(() => setCategories([]));

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

  async function handleDelete(id: number) {
    if (!confirm("Excluir esta categoria?")) return;
    try {
      await apiFetch(`/categories/${id}`, { method: "DELETE" });
      toast.success("Categoria excluída.");
      loadCategories();
      if (editingId === id) setShowModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    }
  }

  if (!mounted) return <div className="p-4">Carregando...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Categorias</h1>

      <div className="mb-6">
        <Button variant="primary" onClick={openCreate}>
          + Nova categoria
        </Button>
      </div>

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
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                required
              />
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
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </form>
      </Modal>

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
            <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="text-red-600">Excluir</Button>
          </>
        )}
      />
    </div>
  );
}
