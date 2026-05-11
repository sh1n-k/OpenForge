import { writable, type Readable } from "svelte/store";

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
  durationMs: number;
}

const DEFAULT_DURATION_MS = 3500;

const store = writable<ToastItem[]>([]);
let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function scheduleDismiss(id: number, duration: number): void {
  if (typeof window === "undefined") return;
  const timer = setTimeout(() => dismissToast(id), duration);
  timers.set(id, timer);
}

export function pushToast(
  variant: ToastVariant,
  message: string,
  duration: number = DEFAULT_DURATION_MS,
): number {
  const id = nextId++;
  const item: ToastItem = { id, variant, message, durationMs: duration };
  store.update((items) => [...items, item]);
  scheduleDismiss(id, duration);
  return id;
}

export function dismissToast(id: number): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  store.update((items) => items.filter((item) => item.id !== id));
}

export const toasts: Readable<ToastItem[]> = { subscribe: store.subscribe };

export const toast = {
  success(message: string, duration?: number) {
    return pushToast("success", message, duration);
  },
  error(message: string, duration?: number) {
    return pushToast("error", message, duration);
  },
  info(message: string, duration?: number) {
    return pushToast("info", message, duration);
  },
};
