export function formatPnl(value: number): string {
  if (value === 0) return "0";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toLocaleString()}`;
}

export function pnlClassName(value: number): string {
  if (value > 0) return "text-success";
  if (value < 0) return "text-error";
  return "text-muted";
}
