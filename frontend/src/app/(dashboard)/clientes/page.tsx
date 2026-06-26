"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/api/client";
import { Button, Card, Table, toast, PageHeader, Modal, Label, Input } from "@/components/ui";

type Client = {
  id: number;
  nome: string;
  whatsapp: string;
  consent_whatsapp: boolean;
  origem: "local" | "catalogo";
  possui_lead_pendente: boolean;
  created_at: string;
  updated_at: string;
};

type Lead = {
  id: number;
  nome: string | null;
  email: string;
  whatsapp: string;
  consent: boolean;
  look_id: number | null;
  product_id: number | null;
  product_nome: string | null;
  look_nome: string | null;
  tipo: "novidades" | "look" | "produto";
  contatado: boolean;
  created_at: string;
};

type ContactMessage = {
  id: number;
  whatsapp: string;
  mensagem: string;
  created_at: string;
};

function formatWhatsappText(clientName: string, interestName: string | null, interestType: string | null): string {
  let text = `Olá${clientName ? ' ' + clientName : ''}! `;
  if (interestType === "produto" && interestName) {
    text += `Vimos no catálogo da Vieira Closet Boutique que você se interessou pelo produto "${interestName}". Como posso te ajudar hoje?`;
  } else if (interestType === "look" && interestName) {
    text += `Vimos no catálogo da Vieira Closet Boutique que você se interessou pela composição de look "${interestName}". Como posso te ajudar hoje?`;
  } else {
    text += `Obrigado por ser nosso cliente na Vieira Closet Boutique! Como posso te ajudar hoje?`;
  }
  return text;
}

export default function ClientesPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Estados do CRM (Leads de Interesse / Contatos)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientLeads, setClientLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Estados do CRUD de Clientes
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formOrigem, setFormOrigem] = useState<"local" | "catalogo">("local");
  const [formConsent, setFormConsent] = useState(true);
  const [savingClient, setSavingClient] = useState(false);

  // Estado de Exclusão
  const [deleteClientTarget, setDeleteClientTarget] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState(false);

  const loadClients = async () => {
    setLoading(true);
    try {
      const url = searchQuery.trim()
        ? `/clients?q=${encodeURIComponent(searchQuery.trim())}`
        : "/clients";
      const data = await apiFetch<Client[]>(url);
      setClients(data);
    } catch (err) {
      toast.error("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  };

  const loadClientLeads = async (clientId: number) => {
    setLoadingLeads(true);
    try {
      const data = await apiFetch<Lead[]>(`/catalog/leads/client/${clientId}`);
      setClientLeads(data);
    } catch {
      toast.error("Erro ao carregar interesses do catálogo.");
    } finally {
      setLoadingLeads(false);
    }
  };

  const loadContacts = async (phone: string) => {
    setLoadingContacts(true);
    try {
      const data = await apiFetch<ContactMessage[]>(`/catalog/leads/contact/${phone}`);
      setContacts(data);
    } catch {
      toast.error("Erro ao carregar histórico de contatos.");
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    loadClients();
  }, [mounted, isAuthenticated, searchQuery]);

  useEffect(() => {
    if (selectedClient) {
      loadClientLeads(selectedClient.id);
      loadContacts(selectedClient.whatsapp);
      setNewMessage("");
    } else {
      setClientLeads([]);
      setContacts([]);
    }
  }, [selectedClient]);

  // WhatsApp Rápido
  async function handleQuickContact(client: Client) {
    setLoading(true);
    let leadToUse: Lead | null = null;
    try {
      const leadsData = await apiFetch<Lead[]>(`/catalog/leads/client/${client.id}`);
      if (leadsData && leadsData.length > 0) {
        leadToUse = leadsData[0];
      }
    } catch (e) {
      console.error("Falha ao buscar leads do cliente", e);
    }

    const text = formatWhatsappText(
      client.nome,
      leadToUse ? (leadToUse.tipo === "look" ? leadToUse.look_nome : leadToUse.product_nome) : null,
      leadToUse ? leadToUse.tipo : null
    );

    try {
      await apiFetch("/catalog/leads/contact", {
        method: "POST",
        body: JSON.stringify({
          whatsapp: client.whatsapp,
          mensagem: `[Contato Inicial Rápido]: ${text}`,
        }),
      });
      loadClients();
    } catch (e) {
      console.error("Falha ao registrar contato automático", e);
    } finally {
      setLoading(false);
    }

    const cleaned = client.whatsapp.replace(/\D/g, "");
    const number = cleaned.startsWith("55") ? cleaned : (cleaned.length >= 10 ? "55" + cleaned : cleaned);
    const waUrl = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  }

  // Enviar Mensagem no Modal do CRM
  async function handleSendMessage() {
    if (!selectedClient || !newMessage.trim()) return;
    setSendingMessage(true);
    const msgText = newMessage.trim();
    try {
      await apiFetch("/catalog/leads/contact", {
        method: "POST",
        body: JSON.stringify({
          whatsapp: selectedClient.whatsapp,
          mensagem: msgText,
        }),
      });
      toast.success("Contato registrado com sucesso!");
      setNewMessage("");
      loadContacts(selectedClient.whatsapp);
      loadClients();
      loadClientLeads(selectedClient.id);

      const cleaned = selectedClient.whatsapp.replace(/\D/g, "");
      const number = cleaned.startsWith("55") ? cleaned : (cleaned.length >= 10 ? "55" + cleaned : cleaned);
      const waUrl = `https://wa.me/${number}?text=${encodeURIComponent(msgText)}`;
      window.open(waUrl, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar mensagem.");
    } finally {
      setSendingMessage(false);
    }
  }

  // CRUD: Modal de Criar
  const openCreateModal = () => {
    setEditingClient(null);
    setFormNome("");
    setFormWhatsapp("");
    setFormOrigem("local");
    setFormConsent(true);
    setClientModalOpen(true);
  };

  // CRUD: Modal de Editar
  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormNome(client.nome);
    setFormWhatsapp(client.whatsapp);
    setFormOrigem(client.origem);
    setFormConsent(client.consent_whatsapp);
    setClientModalOpen(true);
  };

  // CRUD: Salvar (Criar ou Editar)
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formWhatsapp.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSavingClient(true);
    try {
      if (editingClient) {
        await apiFetch(`/clients/${editingClient.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            nome: formNome.trim(),
            whatsapp: formWhatsapp.trim(),
            consent_whatsapp: formConsent,
            origem: formOrigem,
          }),
        });
        toast.success("Cliente atualizado com sucesso!");
      } else {
        await apiFetch("/clients", {
          method: "POST",
          body: JSON.stringify({
            nome: formNome.trim(),
            whatsapp: formWhatsapp.trim(),
            consent_whatsapp: formConsent,
            origem: formOrigem,
          }),
        });
        toast.success("Cliente cadastrado com sucesso!");
      }
      setClientModalOpen(false);
      loadClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar cliente.");
    } finally {
      setSavingClient(false);
    }
  };

  // CRUD: Deletar
  const handleDeleteClient = async () => {
    if (!deleteClientTarget) return;
    setDeletingClient(true);
    try {
      await apiFetch(`/clients/${deleteClientTarget.id}`, {
        method: "DELETE",
      });
      toast.success("Cliente removido com sucesso.");
      setDeleteClientTarget(null);
      loadClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir cliente.");
    } finally {
      setDeletingClient(false);
    }
  };

  // Exportar CSV
  function exportCSV() {
    if (clients.length === 0) {
      toast.error("Não há dados para exportar.");
      return;
    }

    const headers = ["Nome", "WhatsApp", "Origem", "Consentimento WhatsApp", "Data de Cadastro"];
    const rows = clients.map((c) => [
      c.nome,
      c.whatsapp,
      c.origem === "catalogo" ? "Catálogo" : "Local",
      c.consent_whatsapp ? "Sim" : "Não",
      new Date(c.created_at).toLocaleString("pt-BR"),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clientes_boutique_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exportado com sucesso!");
  }

  if (!mounted) return <div className="p-4">Carregando...</div>;

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes / CRM"
        subtitle="Gerenciamento unificado de contatos locais, vendas do PDV e leads do catálogo"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportCSV} disabled={clients.length === 0}>
              Exportar CSV
            </Button>
            <Button variant="primary" onClick={openCreateModal}>
              + Novo Cliente
            </Button>
          </div>
        }
      />

      <Card>
        {/* Barra de Filtros */}
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Pesquisar por nome ou WhatsApp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md min-h-[44px]"
          />
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">Carregando clientes...</p>
        ) : clients.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhum cliente cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table<Client>
              columns={[
                {
                  key: "nome",
                  label: "Nome",
                  render: (r) => (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{r.nome}</span>
                      {r.possui_lead_pendente && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                          Pendente
                        </span>
                      )}
                    </div>
                  )
                },
                {
                  key: "whatsapp",
                  label: "WhatsApp",
                  render: (r) => <span className="font-medium text-gray-700">{r.whatsapp}</span>
                },
                {
                  key: "origem",
                  label: "Origem",
                  render: (r) => (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      r.origem === "catalogo"
                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                    }`}>
                      {r.origem === "catalogo" ? "Catálogo" : "Local"}
                    </span>
                  )
                },
                {
                  key: "consent_whatsapp",
                  label: "Novidades",
                  render: (r) => (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      r.consent_whatsapp ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
                    }`}>
                      {r.consent_whatsapp ? "Aceita" : "Não aceita"}
                    </span>
                  )
                },
                {
                  key: "created_at",
                  label: "Cadastro",
                  render: (r) => new Date(r.created_at).toLocaleDateString("pt-BR")
                },
                {
                  key: "actions",
                  label: "Ações",
                  render: (r) => (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedClient(r)}
                      >
                        CRM / Detalhes
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 font-medium"
                        onClick={() => handleQuickContact(r)}
                      >
                        WhatsApp Rápido
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => openEditModal(r)}
                      >
                        Editar
                      </Button>
                      {isAdmin && (
                        <Button
                          type="button"
                          size="sm"
                          className="text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100/80 border border-red-200"
                          onClick={() => setDeleteClientTarget(r)}
                        >
                          Excluir
                        </Button>
                      )}
                    </div>
                  )
                }
              ]}
              data={clients}
              keyExtractor={(c) => String(c.id)}
              getRowClassName={(r) => r.possui_lead_pendente ? "bg-amber-50/20" : ""}
            />
          </div>
        )}
      </Card>

      {/* Modal de CRM / Detalhes do Cliente */}
      {selectedClient && (
        <Modal
          open={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          title={`CRM do Cliente — ${selectedClient.nome}`}
          size="lg"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto pr-1">
            {/* Histórico do Catálogo */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-gray-900 border-b border-amber-100 pb-2">
                🛍️ Itens de Interesse (Catálogo)
              </h3>
              {loadingLeads ? (
                <p className="text-center text-gray-400 text-xs py-10">Carregando interesses...</p>
              ) : clientLeads.length === 0 ? (
                <div className="text-center text-gray-400 text-xs py-10 bg-gray-50 rounded-xl p-4">
                  <p className="font-medium">Nenhum interesse do catálogo registrado.</p>
                  {selectedClient.origem === "local" && (
                    <p className="mt-1 text-[11px] text-gray-400">Este cliente foi cadastrado localmente no PDV de vendas.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {clientLeads.map((l) => (
                    <div key={l.id} className="p-3 rounded-xl bg-amber-50/20 border border-amber-100/40 text-xs">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            l.tipo === "look"
                              ? "bg-purple-100 text-purple-800"
                              : l.tipo === "produto"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {l.tipo === "look" ? "Look (IA)" : l.tipo === "produto" ? "Produto" : "Novidades"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            l.contatado ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {l.contatado ? "Contatado" : "Pendente"}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(l.created_at).toLocaleDateString("pt-BR")} às {new Date(l.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="font-bold text-gray-800">
                        {l.tipo === "look" ? l.look_nome : l.tipo === "produto" ? l.product_nome : "Newsletter de Lançamentos"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Histórico de Mensagens / Novo Contato */}
            <div className="space-y-4 flex flex-col">
              <h3 className="font-bold text-sm text-gray-900 border-b border-amber-100 pb-2">
                💬 Histórico de Mensagens Enviadas
              </h3>

              {/* Lista de Mensagens */}
              <div className="flex-1 space-y-3 min-h-[200px] max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-100">
                {loadingContacts ? (
                  <p className="text-center text-gray-400 text-xs py-10">Carregando histórico...</p>
                ) : contacts.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-10">Nenhum contato registrado.</p>
                ) : (
                  contacts.map((msg) => (
                    <div key={msg.id} className="p-2.5 rounded-xl bg-white border border-gray-200/60 shadow-sm text-xs">
                      <p className="text-gray-700 whitespace-pre-wrap">{msg.mensagem}</p>
                      <span className="text-[9px] text-gray-400 block text-right mt-1.5 font-medium">
                        {new Date(msg.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Caixa de Texto do Novo Contato */}
              <div className="space-y-2 mt-2 pt-2 border-t border-amber-100/30">
                <Label htmlFor="crm-msg">Nova Mensagem (Envia no WhatsApp e grava no CRM)</Label>
                <textarea
                  id="crm-msg"
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 min-h-[80px] focus:ring-amber-500 focus:outline-none focus:ring-2 bg-white"
                  placeholder="Olá! Vimos que você curtiu nossas peças..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const firstLead = clientLeads[0];
                      setNewMessage(
                        formatWhatsappText(
                          selectedClient.nome,
                          firstLead ? (firstLead.tipo === "look" ? firstLead.look_nome : firstLead.product_nome) : null,
                          firstLead ? firstLead.tipo : null
                        )
                      );
                    }}
                  >
                    Usar Template
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    loading={sendingMessage}
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    Enviar e Registrar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Criar / Editar Cliente (CRUD) */}
      {clientModalOpen && (
        <Modal
          open={clientModalOpen}
          onClose={() => setClientModalOpen(false)}
          title={editingClient ? "Editar Dados do Cliente" : "Cadastrar Novo Cliente"}
          size="sm"
        >
          <form onSubmit={handleSaveClient} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                type="text"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex: Larissa Silva"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                type="text"
                value={formWhatsapp}
                onChange={(e) => setFormWhatsapp(e.target.value)}
                placeholder="Ex: 11999999999"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="origem">Origem de Cadastro</Label>
              <select
                id="origem"
                value={formOrigem}
                onChange={(e) => setFormOrigem(e.target.value as "local" | "catalogo")}
                className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-amber-500 focus:outline-none focus:ring-2 bg-white"
              >
                <option value="local">Local (PDV de Vendas)</option>
                <option value="catalogo">Catálogo (Vitrine Pública)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="consent_whatsapp"
                type="checkbox"
                checked={formConsent}
                onChange={(e) => setFormConsent(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
              />
              <Label htmlFor="consent_whatsapp" className="cursor-pointer select-none font-medium text-xs text-gray-700">
                Aceita receber novidades e promoções no WhatsApp
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setClientModalOpen(false)}
                disabled={savingClient}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={savingClient}>
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteClientTarget && (
        <Modal
          open={!!deleteClientTarget}
          onClose={() => setDeleteClientTarget(null)}
          title="Excluir Cliente"
          size="sm"
        >
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-600">
              Tem certeza que deseja excluir o cliente <strong>{deleteClientTarget.nome}</strong>?
            </p>
            <p className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100">
              ⚠️ Atenção: Esta ação é definitiva e removerá a associação desse cliente a todas as vendas, catalog leads e contas a receber.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteClientTarget(null)}
                disabled={deletingClient}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteClient}
                loading={deletingClient}
              >
                Excluir
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
