export type StatusChipVariant = "success" | "warning" | "error" | "info";

export function statusVariant(value: string | null | undefined): StatusChipVariant {
  if (
    value === "running" ||
    value === "completed" ||
    value === "success" ||
    value === "valid" ||
    value === "UP"
  )
    return "success";
  if (value?.includes("failed") || value?.includes("invalid") || value === "DOWN" || value === "error")
    return "error";
  if (value === "queued" || value === "draft" || value === "stopped") return "warning";
  return "info";
}
