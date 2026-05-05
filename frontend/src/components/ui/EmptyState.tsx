"use client";

import Link from "next/link";

export interface EmptyStateProps {
  title?: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title = "Nenhum resultado",
  message,
  actionLabel,
  actionHref,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center text-gray-500 ${className}`}
    >
      <p className="text-lg font-medium text-gray-700 mb-1">{title}</p>
      <p className="text-sm mb-4 max-w-sm">{message}</p>
      {actionLabel && (actionHref || onAction) && (
        <>
          {actionHref ? (
            <Link
              href={actionHref}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="text-sm font-medium text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              {actionLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
}
