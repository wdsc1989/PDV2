"use client";

import { useEffect, useState, useMemo } from "react";
import { Table, Badge, Button, Input, Label, Select, ConfirmModal, toast } from "@/components/ui";
import { apiFetch } from "@/api/client";
import { EditSaleModal } from "./EditSaleModal";

type User = { id: number; username: string; name: string; role: string };
type Sale = {
  id: number;
  cash_session_id: number;
  user_id: number | null;
  data_venda: string;
  subtotal_bruto: number;
  desconto_tipo: string | null;
  desconto_input: number | null;
  desconto_valor: number;
  total_vendido: number;
  total_lucro: number | null;
  total_pecas: number;
  comissao_percentual: number;
  comissao_valor: number;
  comissao_paga: boolean;
  tipo_pagamento: string | null;
  status: string;
  created_at: string;
  itens: {
    product_id: number;
    product_nome: string | null;
    quantidade: number;
    preco_unitario: number;
    preco_custo_unitario: number | null;
  }[];
};

interface VendasHistoricoTabProps {
  userRole: string;
  vendedores: User[];
}

export function VendasHistoricoTab({ userRole, vendedores }: VendasHistoricoTabProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros locais
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroPagamento, setFiltroPagamento] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  // Modais
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [cancelSaleId, setCancelSaleId] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadSales = () => {
    setLoading(true);
    apiFetch<Sale[]>("/sales?limit=500")
      .then(setSales)
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSales();
  }, []);

  // Filtragem local
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (dataInicio && s.created_at.slice(0, 10) < dataInicio) return false;
      if (dataFim && s.created_at.slice(0, 10) > dataFim) return false;
      if (filtroVendedor && String(s.user_id) !== filtroVendedor) return false;
      if (filtroPagamento && s.tipo_pagamento !== filtroPagamento) return false;
      if (filtroStatus && s.status !== filtroStatus) return false;
      return true;
    });
  }, [sales, dataInicio, dataFim, filtroVendedor, filtroPagamento, filtroStatus]);

  // Estornar venda
  async function confirmCancelSale() {
    if (cancelSaleId == null) return;
    setCancelLoading(true);
    try {
      await apiFetch(`/sales/${cancelSaleId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelada" }),
      });
      toast.success("Venda estornada. O estoque foi devolvido.");
      loadSales();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao estornar venda.");
    } finally {
      setCancelLoading(false);
      setCancelSaleId(null);
    }
  }

  const canEdit = userRole === "admin";
  const canCancel = userRole === "admin" || userRole === "gerente";

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="p-4 bg-white rounded-lg border border-rose-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div>
          <Label htmlFor="hist-inicio">De</Label>
          <Input
            id="hist-inicio"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="hist-fim">Até</Label>
          <Input
            id="hist-fim"
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="hist-vendedor">Vendedor</Label>
          <Select
            id="hist-vendedor"
            value={filtroVendedor}
            onChange={(e) => setFiltroVendedor(e.target.value)}
            options={[
              { value: "", label: "Todos" },
              ...vendedores.map((v) => ({ value: String(v.id), label: v.name })),
            ]}
          />
        </div>
        <div>
          <Label htmlFor="hist-pag">Pagamento</Label>
          <Select
            id="hist-pag"
            value={filtroPagamento}
            onChange={(e) => setFiltroPagamento(e.target.value)}
            options={[
              { value: "", label: "Todos" },
              { value: "dinheiro", label: "Dinheiro" },
              { value: "pix", label: "PIX" },
              { value: "cartao", label: "Cartão" },
              { value: "outro", label: "Outro" },
            ]}
          />
        </div>
        <div>
          <Label htmlFor="hist-status">Status</Label>
          <Select
            id="hist-status"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            options={[
              { value: "", label: "Todos" },
              { value: "concluida", label: "Concluída" },
              { value: "cancelada", label: "Cancelada" },
            ]}
          />
        </div>
      </div>

      {/* Tabela de Histórico */}
      {loading ? (
        <div className="p-10 text-center text-gray-500">Carregando histórico...</div>
      ) : filteredSales.length === 0 ? (
        <div className="p-10 text-center text-gray-500 bg-white rounded-lg border border-rose-100">
          Nenhuma venda encontrada com os filtros aplicados.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-rose-100 shadow-sm overflow-hidden">
          <Table<Sale>
            keyExtractor={(s) => s.id}
            data={filteredSales}
            columns={[
              { key: "id", label: "ID" },
              {
                key: "created_at",
                label: "Data/Hora",
                render: (s) => (s.created_at ? new Date(s.created_at).toLocaleString("pt-BR") : "—"),
              },
              {
                key: "vendedor",
                label: "Vendedor",
                render: (s) => {
                  const vend = vendedores.find((v) => v.id === s.user_id);
                  return vend ? vend.name : "—";
                },
              },
              {
                key: "total_vendido",
                label: "Total Líquido",
                render: (s) => <span className="font-semibold text-gray-900">R$ {s.total_vendido.toFixed(2)}</span>,
              },
              {
                key: "tipo_pagamento",
                label: "Forma de Pagamento",
                render: (s) => <span className="capitalize">{s.tipo_pagamento || "—"}</span>,
              },
              {
                key: "status",
                label: "Status",
                render: (s) => (
                  <Badge variant={s.status === "concluida" ? "success" : "danger"}>
                    {s.status === "concluida" ? "Concluída" : "Cancelada"}
                  </Badge>
                ),
              },
              {
                key: "acoes",
                label: "Ações",
                render: (s) => (
                  <div className="flex gap-2 justify-center">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(`/recibo/${s.id}`, "_blank")}
                    >
                      Recibo
                    </Button>
                    {s.status !== "cancelada" && canCancel && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => setCancelSaleId(s.id)}
                      >
                        Estornar
                      </Button>
                    )}
                    {s.status !== "cancelada" && canEdit && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingSale(s)}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* Modal de Edição */}
      <EditSaleModal
        open={editingSale !== null}
        onClose={() => setEditingSale(null)}
        sale={editingSale}
        onSave={loadSales}
        vendedores={vendedores}
      />

      {/* Modal de Confirmação de Estorno */}
      <ConfirmModal
        open={cancelSaleId != null}
        onClose={() => setCancelSaleId(null)}
        onConfirm={confirmCancelSale}
        title="Estornar venda"
        message="Confirma o estorno desta venda? Os itens retornarão ao estoque físico."
        confirmLabel="Estornar"
        cancelLabel="Cancelar"
        variant="danger"
        loading={cancelLoading}
      />
    </div>
  );
}
