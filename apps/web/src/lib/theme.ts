export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "of-theme";
const ATTR = "data-theme";

type Listener = (theme: ResolvedTheme) => void;
const listeners = new Set<Listener>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function readStored(): Theme {
  if (!isBrowser()) return "system";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

function systemPrefers(): ResolvedTheme {
  if (!isBrowser()) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getTheme(): Theme {
  return readStored();
}

export function resolveTheme(theme: Theme = readStored()): ResolvedTheme {
  return theme === "system" ? systemPrefers() : theme;
}

function applyAttribute(resolved: ResolvedTheme) {
  if (!isBrowser()) return;
  if (resolved === "dark") {
    document.documentElement.setAttribute(ATTR, "dark");
  } else {
    document.documentElement.removeAttribute(ATTR);
  }
}

export function setTheme(theme: Theme): void {
  if (!isBrowser()) return;
  if (theme === "system") {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }
  const resolved = resolveTheme(theme);
  applyAttribute(resolved);
  listeners.forEach((cb) => cb(resolved));
}

export function subscribeTheme(cb: Listener): () => void {
  listeners.add(cb);
  if (isBrowser()) {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (readStored() === "system") {
        const resolved = systemPrefers();
        applyAttribute(resolved);
        listeners.forEach((listener) => listener(resolved));
      }
    };
    mql.addEventListener("change", handler);
    return () => {
      listeners.delete(cb);
      mql.removeEventListener("change", handler);
    };
  }
  return () => {
    listeners.delete(cb);
  };
}

export function initTheme(): void {
  if (!isBrowser()) return;
  applyAttribute(resolveTheme());
}
