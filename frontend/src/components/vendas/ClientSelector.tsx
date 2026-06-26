"use client";

import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/api/client";
import { Button, Input, Label, Modal, toast } from "@/components/ui";

export interface Client {
  id: number;
  nome: string;
  whatsapp: string;
  consent_whatsapp: boolean;
}

interface ClientSelectorProps {
  selectedClientId: number | null;
  onSelectClient: (client: Client | null) => void;
}

export function ClientSelector({ selectedClientId, onSelectClient }: ClientSelectorProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Form de cadastro rápido
  const [newNome, setNewNome] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");
  const [newConsent, setNewConsent] = useState(true);
  const [saving, setSaving] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Busca cliente selecionado por ID se necessário
  useEffect(() => {
    if (selectedClientId) {
      setLoading(true);
      apiFetch<Client[]>(`/clients?q=`)
        .then((clients) => {
          const found = clients.find((c) => c.id === selectedClientId);
          if (found) {
            setSelectedClient(found);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setSelectedClient(null);
    }
  }, [selectedClientId]);

  // Busca sugestões conforme digita
  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      apiFetch<Client[]>(`/clients?q=${encodeURIComponent(search.trim())}`)
        .then((list) => {
          setSuggestions(list.slice(0, 5));
          setShowSuggestions(true);
        })
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNome.trim() || !newWhatsapp.trim()) {
      toast.error("Preencha o nome e o WhatsApp.");
      return;
    }
    setSaving(true);
    try {
      const client = await apiFetch<Client>("/clients", {
        method: "POST",
        body: JSON.stringify({
          nome: newNome.trim(),
          whatsapp: newWhatsapp.trim(),
          consent_whatsapp: newConsent,
        }),
      });
      toast.success("Cliente cadastrado com sucesso!");
      onSelectClient(client);
      setSelectedClient(client);
      setModalOpen(false);
      setNewNome("");
      setNewWhatsapp("");
      setNewConsent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar cliente.");
    } finally {
      setSaving(false);
    }
  };

  const handleSelect = (client: Client) => {
    onSelectClient(client);
    setSelectedClient(client);
    setSearch("");
    setShowSuggestions(false);
  };

  const handleClear = () => {
    onSelectClient(null);
    setSelectedClient(null);
    setSearch("");
  };

  return (
    <div ref={wrapperRef} className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          👤 Cliente
        </h3>
        {!selectedClient && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors"
          >
            + Cadastro Rápido
          </button>
        )}
      </div>

      {selectedClient ? (
        <div className="flex items-center justify-between rounded-lg bg-amber-50/40 border border-amber-100/70 p-3">
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-gray-900">{selectedClient.nome}</p>
            <p className="text-xs text-gray-600 font-semibold">{selectedClient.whatsapp}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                selectedClient.consent_whatsapp
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-gray-100 text-gray-800 border border-gray-200"
              }`}>
                {selectedClient.consent_whatsapp ? "Aceita WhatsApp" : "Não aceita WhatsApp"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-medium text-red-600 hover:text-red-700 p-1"
            aria-label="Limpar cliente"
          >
            Remover
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            type="text"
            placeholder="Buscar por nome ou WhatsApp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            className="w-full text-xs min-h-[40px]"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg z-50 py-1">
              {suggestions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50/40 text-gray-800 font-medium flex items-center justify-between"
                >
                  <span>{c.nome}</span>
                  <span className="text-gray-500 font-semibold text-[10px]">{c.whatsapp}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Cadastro Rápido */}
      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Cadastro Rápido de Cliente"
          size="sm"
        >
          <form onSubmit={handleCreateClient} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="c-nome">Nome Completo</Label>
              <Input
                id="c-nome"
                type="text"
                placeholder="Ex: Larissa Silva"
                value={newNome}
                onChange={(e) => setNewNome(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="c-whatsapp">WhatsApp</Label>
              <Input
                id="c-whatsapp"
                type="text"
                placeholder="Ex: 11999999999"
                value={newWhatsapp}
                onChange={(e) => setNewWhatsapp(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1.5">
              <input
                id="c-consent"
                type="checkbox"
                checked={newConsent}
                onChange={(e) => setNewConsent(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
              />
              <Label htmlFor="c-consent" className="cursor-pointer select-none font-medium text-xs text-gray-700">
                Aceita receber novidades e promoções no WhatsApp
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Cadastrar e Selecionar
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
