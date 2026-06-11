"use client";

import { ButtonHTMLAttributes } from "react";

import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary-700 text-white hover:bg-primary-800 focus:ring-primary-600 transition-colors duration-150",
  secondary: "bg-rose-50 text-gray-900 hover:bg-rose-100 focus:ring-primary-400 border border-rose-200 transition-colors duration-150",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 transition-colors duration-150",
  ghost: "text-gray-700 hover:bg-rose-50 focus:ring-primary-400 transition-colors duration-150",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm font-medium",
  lg: "px-5 py-2.5 text-base font-medium",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Desabilita o botão e mostra spinner durante ação assíncrona (evita duplo clique). */
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  loading = false,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
