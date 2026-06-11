"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

/** Botão somente-ícone com rótulo acessível (aria-label) e tooltip nativo (title). Alvo ≥44px. */
export function IconButton({
  icon,
  label,
  variant = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  variant?: "default" | "danger";
}) {
  const cor =
    variant === "danger"
      ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
      : "text-gray-400 hover:text-primary-700 hover:bg-rose-50";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:opacity-50 ${cor} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}
