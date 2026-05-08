import { apiFetch } from "./client";
import type {
  ActivityEvent,
  SystemRisk,
  SystemRiskEvent,
} from "./types/system";

export async function loadSystemRisk() {
  return apiFetch<SystemRisk>("/api/v1/system/risk");
}

export async function loadSystemRiskEvents(limit = 20) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  return apiFetch<SystemRiskEvent[]>(
    `/api/v1/system/risk/events?${params.toString()}`,
  );
}

export async function updateSystemRiskKillSwitch(input: { enabled: boolean }) {
  return apiFetch<SystemRisk>("/api/v1/system/risk/kill-switch", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function loadSystemActivity(limit = 100, category?: string) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (category) params.set("category", category);
  return apiFetch<ActivityEvent[]>(`/api/v1/system/activity?${params}`);
}
