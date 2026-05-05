import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastState = {
  toasts: ToastItem[];
  add: (type: ToastType, message: string) => void;
  remove: (id: number) => void;
};

let id = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (type, message) =>
    set((state) => ({
      toasts: [...state.toasts, { id: ++id, type, message }],
    })),
  remove: (idToRemove) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== idToRemove),
    })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().add("success", message),
  error: (message: string) => useToastStore.getState().add("error", message),
  info: (message: string) => useToastStore.getState().add("info", message),
};
