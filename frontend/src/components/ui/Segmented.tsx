"use client";

import { KeyboardEvent, ReactNode } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/**
 * Controle segmentado acessível (radiogroup). Navegação por seta ←/→/↑/↓ e por dígitos 1..9;
 * roving tabindex (só o item ativo é tabulável). Alvo de toque ≥44px (min-h-[44px]).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  columns,
  className = "",
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
  /** Quando definido, organiza em grade (ex.: 2 → grid 2 colunas para 4 opções). */
  columns?: number;
  className?: string;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(options[(idx + 1) % options.length].value);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(options[(idx - 1 + options.length) % options.length].value);
    } else if (/^[1-9]$/.test(e.key)) {
      const n = Number(e.key) - 1;
      if (n < options.length) {
        e.preventDefault();
        onChange(options[n].value);
      }
    }
  }
  const layout = columns
    ? `grid gap-1`
    : "inline-flex w-full gap-1";
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      className={`${layout} w-full rounded-lg bg-gray-100 p-1 ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary-500 ${
              active ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
