"use client";

import { useEffect } from "react";
import { useToastStore } from "@/store/toast";

const typeStyles = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-blue-600 text-white",
};

export function ToastContainer() {
  const { toasts, remove } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} item={t} onClose={() => remove(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ item, onClose }: { item: { id: number; type: "success" | "error" | "info"; message: string }; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`pointer-events-auto rounded-lg shadow-lg px-4 py-3 text-sm ${typeStyles[item.type]}`}
      role="alert"
    >
      {item.message}
    </div>
  );
}
