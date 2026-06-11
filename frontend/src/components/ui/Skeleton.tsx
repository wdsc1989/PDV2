"use client";

/** Bloco de carregamento animado (use para loading >300ms no lugar de spinner bloqueante). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-rose-100/60 ${className}`} aria-hidden="true" />;
}

/** Linhas de skeleton para tabelas/listagens. */
export function SkeletonRows({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4" role="status" aria-label="Carregando...">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 ${c === 1 ? "flex-1" : "w-24"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Grade de skeleton para cards (ex.: grade de produtos da venda). */
export function SkeletonCards({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      role="status"
      aria-label="Carregando..."
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-rose-100 bg-white p-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      ))}
    </div>
  );
}
