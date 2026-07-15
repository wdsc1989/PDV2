"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/api/client";
import { Button, Input, toast, PageHeader } from "@/components/ui";

type Opt = { id: number; tipo: "cor" | "tamanho"; valor: string; ordem: number; ativo: boolean };

const GOLD = "#A16207";

function ListaVariacao({
  titulo,
  ajuda,
  placeholder,
  itens,
  onAdd,
  onDelete,
}: {
  titulo: string;
  ajuda: string;
  placeholder: string;
  itens: Opt[];
  onAdd: (valor: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [novo, setNovo] = useState("");
  const [saving, setSaving] = useState(false);

  async function adicionar() {
    const partes = novo.split(",").map((s) => s.trim()).filter(Boolean);
    if (!partes.length) return;
    setSaving(true);
    try {
      for (const p of partes) await onAdd(p);
      setNovo("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-rose-100 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900">{titulo}</h3>
      <p className="mt-0.5 text-xs text-gray-500">{ajuda}</p>

      <div className="mt-3 flex gap-2">
        <Input
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
        <Button type="button" variant="secondary" onClick={adicionar} loading={saving}>
          Adicionar
        </Button>
      </div>

      {itens.length === 0 ? (
        <p className="mt-3 text-xs text-gray-400">Nenhum item cadastrado ainda.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {itens.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: `${GOLD}12`, color: "#854D0E", boxShadow: `inset 0 0 0 1px ${GOLD}33` }}
            >
              {o.valor}
              <button
                type="button"
                aria-label={`Remover ${o.valor}`}
                onClick={() => onDelete(o.id)}
                className="text-[#A16207]/60 hover:text-[#854D0E]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function VariacoesTab() {
  const [opts, setOpts] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch<Opt[]>("/variation-options")
      .then(setOpts)
      .catch(() => setOpts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  async function add(tipo: "cor" | "tamanho", valor: string) {
    try {
      await apiFetch("/variation-options", {
        method: "POST",
        body: JSON.stringify({ tipo, valor }),
      });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar");
    }
  }

  async function del(id: number) {
    try {
      await apiFetch(`/variation-options/${id}`, { method: "DELETE" });
      setOpts((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    }
  }

  const tamanhos = opts.filter((o) => o.tipo === "tamanho");
  const cores = opts.filter((o) => o.tipo === "cor");

  return (
    <div>
      <PageHeader
        title="Cores e Tamanhos"
        subtitle="Pré-cadastro das variações — você escolhe destas listas ao cadastrar um produto (segue opcional)."
      />
      {loading ? (
        <div className="p-4 text-sm text-gray-500">Carregando...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <ListaVariacao
            titulo="Tamanhos"
            ajuda="Ex: PP, P, M, G, GG. Tecle Enter ou vírgula."
            placeholder="Novo tamanho"
            itens={tamanhos}
            onAdd={(v) => add("tamanho", v)}
            onDelete={del}
          />
          <ListaVariacao
            titulo="Cores"
            ajuda="Ex: Preto, Bege, Vermelho. Tecle Enter ou vírgula."
            placeholder="Nova cor"
            itens={cores}
            onAdd={(v) => add("cor", v)}
            onDelete={del}
          />
        </div>
      )}
    </div>
  );
}
