"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CategoriasPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/produtos?tab=categorias");
  }, [router]);
  return (
    <div className="p-6">
      <p className="text-gray-500">Redirecionando para Produtos...</p>
    </div>
  );
}
