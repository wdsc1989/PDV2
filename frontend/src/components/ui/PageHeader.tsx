"use client";

import { ReactNode } from "react";

/** Cabeçalho de página padrão: título + subtítulo + slot extra (ex.: busca) + ações. */
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {(children || actions) && (
        <div className="flex items-center gap-2 print:hidden">
          {children}
          {actions}
        </div>
      )}
    </div>
  );
}
