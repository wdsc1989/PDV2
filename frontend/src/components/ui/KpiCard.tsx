"use client";

import Link from "next/link";

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  variant?: "default" | "alert" | "success";
  className?: string;
}

const variantClasses = {
  default: "border-gray-100",
  alert: "border-amber-400 border-2",
  success: "border-green-200 border",
};

export function KpiCard({
  label,
  value,
  subtitle,
  href,
  linkLabel = "Ver mais",
  variant = "default",
  className = "",
}: KpiCardProps) {
  return (
    <div
      className={`rounded-lg shadow border bg-white p-4 sm:p-5 ${variantClasses[variant]} ${className}`}
    >
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      {href && (
        <Link href={href} className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
