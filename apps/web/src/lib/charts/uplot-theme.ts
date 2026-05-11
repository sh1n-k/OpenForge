import type { Options } from "uplot";

function readVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export interface ChartTheme {
  foreground: string;
  mutedForeground: string;
  subtleForeground: string;
  surface: string;
  border: string;
  borderSoft: string;
  primary: string;
  success: string;
  error: string;
}

export function readChartTheme(): ChartTheme {
  return {
    foreground: readVar("--foreground", "#18181b"),
    mutedForeground: readVar("--muted-foreground", "#52525b"),
    subtleForeground: readVar("--subtle-foreground", "#71717a"),
    surface: readVar("--surface", "#ffffff"),
    border: readVar("--border", "#e4e4e7"),
    borderSoft: readVar("--border-soft", "#f4f4f5"),
    primary: readVar("--primary", "#2563eb"),
    success: readVar("--success", "#16a34a"),
    error: readVar("--error", "#dc2626"),
  };
}

export function baseAxisStyle(theme: ChartTheme): NonNullable<Options["axes"]>[number] {
  return {
    stroke: theme.subtleForeground,
    grid: { stroke: theme.borderSoft, width: 1 },
    ticks: { stroke: theme.borderSoft, width: 1 },
    font: "11px ui-sans-serif, system-ui, sans-serif",
    labelFont: "11px ui-sans-serif, system-ui, sans-serif",
  };
}
