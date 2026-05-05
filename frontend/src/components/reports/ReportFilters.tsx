"use client";

import { Label, Select } from "@/components/ui";
import type { SelectOption } from "@/components/ui";
import type { ReportFiltersState } from "@/types/reports";

const PRESET_OPTIONS: SelectOption[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "trimestre", label: "Trimestre" },
  { value: "ano", label: "Ano" },
];

const PAYMENT_OPTIONS: SelectOption[] = [
  { value: "", label: "Todas" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "pix", label: "PIX" },
];

export interface ReportFiltersProps {
  filters: ReportFiltersState;
  onChange: (f: ReportFiltersState) => void;
  categoryOptions: SelectOption[];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayMonthISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export function ReportFilters({ filters, onChange, categoryOptions }: ReportFiltersProps) {
  const setPreset = (preset: ReportFiltersState["preset"]) => {
    const today = todayISO();
    if (preset === "hoje") {
      onChange({ ...filters, preset, dataInicio: today, dataFim: today });
    } else {
      onChange({ ...filters, preset, dataInicio: "", dataFim: "" });
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      <div className="w-36">
        <Label htmlFor="preset">Período</Label>
        <Select
          id="preset"
          options={PRESET_OPTIONS}
          value={filters.preset}
          onChange={(e) => setPreset(e.target.value as ReportFiltersState["preset"])}
          className="w-full"
        />
      </div>
      {filters.preset === "hoje" ? null : (
        <>
          <div className="w-40">
            <Label htmlFor="dataInicio">Data início</Label>
            <input
              id="dataInicio"
              type="date"
              value={filters.dataInicio || firstDayMonthISO()}
              onChange={(e) => onChange({ ...filters, dataInicio: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-40">
            <Label htmlFor="dataFim">Data fim</Label>
            <input
              id="dataFim"
              type="date"
              value={filters.dataFim || todayISO()}
              onChange={(e) => onChange({ ...filters, dataFim: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      )}
      <div className="w-48">
        <Label htmlFor="categoria">Categoria</Label>
        <Select
          id="categoria"
          options={[{ value: "", label: "Todas" }, ...categoryOptions]}
          value={filters.categoriaId}
          onChange={(e) => onChange({ ...filters, categoriaId: e.target.value })}
          className="w-full"
        />
      </div>
      <div className="w-36">
        <Label htmlFor="pagamento">Forma de pagamento</Label>
        <Select
          id="pagamento"
          options={PAYMENT_OPTIONS}
          value={filters.tipoPagamento}
          onChange={(e) => onChange({ ...filters, tipoPagamento: e.target.value })}
          className="w-full"
        />
      </div>
    </div>
  );
}
