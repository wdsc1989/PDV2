"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EstoquePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/produtos?tab=estoque");
  }, [router]);
  return (
    <div className="p-6">
      <p className="text-gray-500">Redirecionando para Produtos...</p>
    </div>
  );
}
