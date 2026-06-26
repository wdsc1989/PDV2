"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Select, toast } from "@/components/ui";
import { apiFetch } from "@/api/client";

type User = { id: number; username: string; name: string; role: string };
type Product = { id: number; nome: string; preco_venda: number; preco_custo: number; estoque_atual: number };
type SaleItem = {
  product_id: number;
  product_nome: string;
  quantidade: number;
  preco_unitario: number;
  preco_custo_unitario: number;
};
type Sale = {
  id: number;
  user_id: number | null;
  tipo_pagamento: string | null;
  desconto_tipo: string | null;
  desconto_input: number | null;
  created_at: string;
  itens: {
    product_id: number;
    product_nome: string | null;
    quantidade: number;
    preco_unitario: number;
    preco_custo_unitario: number | null;
  }[];
};

interface EditSaleModalProps {
  open: boolean;
  onClose: () => void;
  sale: Sale | null;
  onSave: () => void;
  vendedores: User[];
}

export function EditSaleModal({ open, onClose, sale, onSave, vendedores }: EditSaleModalProps) {
  const [userId, setUserId] = useState("");
  const [tipoPagamento, setTipoPagamento] = useState("");
  const [descontoInput, setDescontoInput] = useState("0");
  const [descontoTipo, setDescontoTipo] = useState<"percentual" | "valor">("percentual");
  const [createdAt, setCreatedAt] = useState("");
  const [itens, setItens] = useState<SaleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sale) return;

    setUserId(sale.user_id ? String(sale.user_id) : "");
    setTipoPagamento(sale.tipo_pagamento || "dinheiro");
    setDescontoInput(String(sale.desconto_input || 0));
    setDescontoTipo((sale.desconto_tipo as "percentual" | "valor") || "percentual");

    // Converter ISO string para datetime-local input value (YYYY-MM-DDTHH:MM)
    if (sale.created_at) {
      try {
        const d = new Date(sale.created_at);
        // Ajustar fuso horário local para formatar
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        setCreatedAt(localISOTime);
      } catch (err) {
        setCreatedAt("");
      }
    } else {
      setCreatedAt("");
    }

    setItens(
      sale.itens.map((it) => ({
        product_id: it.product_id,
        product_nome: it.product_nome || "Produto Desconhecido",
        quantidade: it.quantidade,
        preco_unitario: it.preco_unitario,
        preco_custo_unitario: it.preco_custo_unitario || 0,
      }))
    );
    setSearchQuery("");
    setSuggestions([]);
  }, [sale]);

  // Autocomplete de produtos
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      setSearchLoading(true);
      apiFetch<Product[]>(`/products?active_only=true&q=${encodeURIComponent(searchQuery.trim())}`)
        .then((list) => setSuggestions(list.slice(0, 5)))
        .catch(() => setSuggestions([]))
        .finally(() => setSearchLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  if (!open || !sale) return null;

  function handleAddItem(p: Product) {
    const exists = itens.find((it) => it.product_id === p.id);
    if (exists) {
      setItens(
        itens.map((it) =>
          it.product_id === p.id
            ? { ...it, quantidade: it.quantidade + 1 }
            : it
        )
      );
    } else {
      setItens([
        ...itens,
        {
          product_id: p.id,
          product_nome: p.nome,
          quantidade: 1,
          preco_unitario: p.preco_venda,
          preco_custo_unitario: p.preco_custo,
        },
      ]);
    }
    setSearchQuery("");
    setSuggestions([]);
  }

  function handleRemoveItem(productId: number) {
    setItens(itens.filter((it) => it.product_id !== productId));
  }

  function handleQtyChange(productId: number, val: number) {
    if (val <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setItens(
      itens.map((it) =>
        it.product_id === productId
          ? { ...it, quantidade: val }
          : it
      )
    );
  }

  // Cálculos locais para exibição
  const subtotal = itens.reduce((s, it) => s + it.quantidade * it.preco_unitario, 0);
  const descVal = parseFloat(descontoInput) || 0;
  const descontoCalculado = (() => {
    if (descVal <= 0 || subtotal <= 0) return 0;
    const d = descontoTipo === "percentual" ? subtotal * (descVal / 100) : descVal;
    return Math.max(0, Math.min(d, subtotal));
  })();
  const totalLiquido = Math.max(0, subtotal - descontoCalculado);

  async function handleSave() {
    if (itens.length === 0) {
      toast.error("Adicione pelo menos um item à sacola.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id: userId ? parseInt(userId) : null,
        tipo_pagamento: tipoPagamento,
        desconto_tipo: descontoTipo,
        desconto_input: parseFloat(descontoInput) || 0,
        created_at: createdAt ? new Date(createdAt).toISOString() : null,
        itens: itens.map((it) => ({
          product_id: it.product_id,
          quantidade: it.quantidade,
          preco_unitario: it.preco_unitario,
          preco_custo_unitario: it.preco_custo_unitario,
        })),
      };

      await apiFetch(`/sales/${sale!.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      toast.success("Venda atualizada com sucesso.");
      onSave();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar venda.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white rounded-xl border border-rose-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-rose-100 bg-rose-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Editar Venda #{sale.id}</h3>
            <p className="text-xs text-gray-500">Modifique os dados de pagamento, vendedor ou itens e salve.</p>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Grid de Informações de Cabeçalho */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-vendedor">Vendedor</Label>
              <Select
                id="edit-vendedor"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                options={[
                  { value: "", label: "Não selecionado (Nenhum)" },
                  ...vendedores.map((v) => ({ value: String(v.id), label: v.name })),
                ]}
              />
            </div>

            <div>
              <Label htmlFor="edit-pagamento">Forma de Pagamento</Label>
              <Select
                id="edit-pagamento"
                value={tipoPagamento}
                onChange={(e) => setTipoPagamento(e.target.value)}
                options={[
                  { value: "dinheiro", label: "Dinheiro" },
                  { value: "pix", label: "PIX" },
                  { value: "cartao", label: "Cartão" },
                  { value: "outro", label: "Outro" },
                ]}
              />
            </div>

            <div>
              <Label htmlFor="edit-created">Data e Hora</Label>
              <Input
                id="edit-created"
                type="datetime-local"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
              />
            </div>

            <div>
              <Label>Desconto</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={descontoInput}
                  onChange={(e) => setDescontoInput(e.target.value)}
                  className="w-2/3"
                />
                <Select
                  value={descontoTipo}
                  onChange={(e) => setDescontoTipo(e.target.value as "percentual" | "valor")}
                  options={[
                    { value: "percentual", label: "%" },
                    { value: "valor", label: "R$" },
                  ]}
                  className="w-1/3"
                />
              </div>
            </div>
          </div>

          <hr className="border-rose-100" />

          {/* Adicionar Produto */}
          <div className="relative">
            <Label htmlFor="edit-search">Pesquisar produto para adicionar</Label>
            <Input
              id="edit-search"
              type="text"
              placeholder="Digite o nome ou código do produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchLoading && (
              <div className="absolute right-3 bottom-2 text-xs text-gray-400">Pesquisando...</div>
            )}
            {suggestions.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 flex justify-between items-center"
                      onClick={() => handleAddItem(p)}
                    >
                      <span className="font-medium text-gray-800">{p.nome}</span>
                      <span className="text-primary-700 font-semibold">R$ {p.preco_venda.toFixed(2)} (Estoque: {p.estoque_atual})</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Lista de Itens */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Produtos na Sacola</h4>
            {itens.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Sacola vazia. Adicione produtos acima.</p>
            ) : (
              <div className="border border-rose-100 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-rose-50/50 text-gray-600 font-medium border-b border-rose-100">
                      <th className="p-2">Produto</th>
                      <th className="p-2 w-28 text-center">Qtd.</th>
                      <th className="p-2 text-right">Unitário</th>
                      <th className="p-2 text-right">Subtotal</th>
                      <th className="p-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-50">
                    {itens.map((it) => (
                      <tr key={it.product_id} className="hover:bg-rose-50/20 text-gray-700">
                        <td className="p-2 font-medium truncate max-w-[200px]" title={it.product_nome}>
                          {it.product_nome}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              className="w-6 h-6 rounded bg-gray-100 text-gray-600 font-bold flex items-center justify-center hover:bg-rose-100 transition-colors"
                              onClick={() => handleQtyChange(it.product_id, it.quantidade - 1)}
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-semibold tabular-nums">{it.quantidade}</span>
                            <button
                              type="button"
                              className="w-6 h-6 rounded bg-gray-100 text-gray-600 font-bold flex items-center justify-center hover:bg-rose-100 transition-colors"
                              onClick={() => handleQtyChange(it.product_id, it.quantidade + 1)}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-2 text-right tabular-nums">
                          R$ {it.preco_unitario.toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-semibold tabular-nums">
                          R$ {(it.quantidade * it.preco_unitario).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700 font-semibold"
                            onClick={() => handleRemoveItem(it.product_id)}
                            title="Remover produto"
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-rose-100 bg-rose-50/30 flex flex-wrap justify-between items-center gap-4">
          <div className="text-sm">
            <span className="text-gray-500">Subtotal: R$ {subtotal.toFixed(2)}</span>
            {descontoCalculado > 0 && (
              <span className="text-amber-600 ml-3">Desconto: -R$ {descontoCalculado.toFixed(2)}</span>
            )}
            <div className="text-base font-bold text-gray-900">Total: R$ {totalLiquido.toFixed(2)}</div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} loading={saving}>
              Salvar Alterações
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
