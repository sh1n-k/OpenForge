import { apiFetch } from "./client";
import type {
  CrossStrategyFill,
  CrossStrategyOrderRequest,
  CrossStrategyPosition,
  DashboardResponse,
} from "./types/dashboard";

export async function loadDashboard() {
  return apiFetch<DashboardResponse>("/api/v1/dashboard");
}

export async function loadAllOrders(strategyId?: string, limit = 50) {
  const params = new URLSearchParams();
  if (strategyId) params.set("strategyId", strategyId);
  params.set("limit", String(limit));
  return apiFetch<CrossStrategyOrderRequest[]>(`/api/v1/orders?${params}`);
}

export async function loadAllFills(strategyId?: string, limit = 50) {
  const params = new URLSearchParams();
  if (strategyId) params.set("strategyId", strategyId);
  params.set("limit", String(limit));
  return apiFetch<CrossStrategyFill[]>(`/api/v1/fills?${params}`);
}

export async function loadAllPositions(strategyId?: string) {
  const params = new URLSearchParams();
  if (strategyId) params.set("strategyId", strategyId);
  return apiFetch<CrossStrategyPosition[]>(`/api/v1/positions?${params}`);
}
