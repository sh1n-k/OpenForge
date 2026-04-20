import { apiFetch } from "./client";
import type { OrderMode, PayloadFormat, StrategyType } from "./types/common";
import type {
  OrderCandidate,
  OrderFill,
  OrderRequest,
  OrderStatusEvent,
  StrategyDetail,
  StrategyExecutionResponse,
  StrategyExecutionRun,
  StrategyPosition,
  StrategyRiskConfig,
  StrategyRiskEvent,
  StrategySignalEvent,
  StrategySummary,
  StrategyValidateResponse,
  StrategyVersion,
} from "./types/strategy";

export async function loadStrategies() {
  return apiFetch<StrategySummary[]>("/api/v1/strategies");
}

export async function loadStrategy(strategyId: string) {
  return apiFetch<StrategyDetail>(`/api/v1/strategies/${strategyId}`);
}

export async function loadStrategyVersions(strategyId: string) {
  return apiFetch<StrategyVersion[]>(
    `/api/v1/strategies/${strategyId}/versions`,
  );
}

export async function createStrategy(input: {
  name: string;
  description?: string;
  strategyType: StrategyType;
  initialPayload: {
    payloadFormat: PayloadFormat;
    payload: Record<string, unknown>;
    changeSummary?: string;
  };
}) {
  return apiFetch<StrategyDetail>("/api/v1/strategies", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateStrategy(
  strategyId: string,
  input: Partial<Pick<StrategyDetail, "name" | "description" | "status">>,
) {
  return apiFetch<StrategyDetail>(`/api/v1/strategies/${strategyId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function archiveStrategy(strategyId: string) {
  return apiFetch<void>(`/api/v1/strategies/${strategyId}`, {
    method: "DELETE",
  });
}

export async function cloneStrategy(strategyId: string) {
  return apiFetch<StrategyDetail>(`/api/v1/strategies/${strategyId}/clone`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function replaceStrategyUniverses(
  strategyId: string,
  universeIds: string[],
) {
  return apiFetch<StrategyDetail>(
    `/api/v1/strategies/${strategyId}/universes`,
    {
      method: "PUT",
      body: JSON.stringify({ universeIds }),
    },
  );
}

export async function addStrategyVersion(
  strategyId: string,
  input: {
    payloadFormat: PayloadFormat;
    payload: Record<string, unknown>;
    changeSummary?: string;
  },
) {
  return apiFetch<StrategyVersion>(
    `/api/v1/strategies/${strategyId}/versions`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function validateStrategy(input: {
  strategyType: StrategyType;
  payloadFormat: PayloadFormat;
  payload: Record<string, unknown>;
}) {
  return apiFetch<StrategyValidateResponse>("/api/v1/strategies/validate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function loadStrategyExecution(strategyId: string) {
  return apiFetch<StrategyExecutionResponse>(
    `/api/v1/strategies/${strategyId}/execution`,
  );
}

export async function loadStrategyExecutionRuns(
  strategyId: string,
  limit = 20,
) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  return apiFetch<StrategyExecutionRun[]>(
    `/api/v1/strategies/${strategyId}/execution/runs?${params.toString()}`,
  );
}

export async function updateStrategyExecution(
  strategyId: string,
  input: {
    enabled: boolean;
    scheduleTime: string;
    timezone: string;
    mode: "paper";
  },
) {
  return apiFetch<StrategyExecutionResponse>(
    `/api/v1/strategies/${strategyId}/execution`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export async function loadStrategySignals(strategyId: string, limit = 50) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  return apiFetch<StrategySignalEvent[]>(
    `/api/v1/strategies/${strategyId}/signals?${params.toString()}`,
  );
}

export async function loadStrategyRisk(strategyId: string) {
  return apiFetch<StrategyRiskConfig>(`/api/v1/strategies/${strategyId}/risk`);
}

export async function loadStrategyRiskEvents(strategyId: string, limit = 50) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  return apiFetch<StrategyRiskEvent[]>(
    `/api/v1/strategies/${strategyId}/risk/events?${params.toString()}`,
  );
}

export async function updateStrategyRisk(
  strategyId: string,
  input: {
    perSymbolMaxNotional: number | null;
    strategyMaxExposure: number | null;
    maxOpenPositions: number | null;
    dailyLossLimit: number | null;
    strategyKillSwitchEnabled: boolean;
  },
) {
  return apiFetch<StrategyRiskConfig>(
    `/api/v1/strategies/${strategyId}/risk`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export async function loadStrategyOrderCandidates(
  strategyId: string,
  limit = 50,
) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  return apiFetch<OrderCandidate[]>(
    `/api/v1/strategies/${strategyId}/orders/candidates?${params.toString()}`,
  );
}

export async function loadStrategyOrderRequests(
  strategyId: string,
  limit = 20,
) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  return apiFetch<OrderRequest[]>(
    `/api/v1/strategies/${strategyId}/orders/requests?${params.toString()}`,
  );
}

export async function loadStrategyOrderStatusEvents(
  strategyId: string,
  orderRequestId: string,
  limit = 50,
) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  return apiFetch<OrderStatusEvent[]>(
    `/api/v1/strategies/${strategyId}/orders/requests/${orderRequestId}/status-events?${params.toString()}`,
  );
}

export async function loadStrategyFills(strategyId: string, limit = 50) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  return apiFetch<OrderFill[]>(
    `/api/v1/strategies/${strategyId}/fills?${params.toString()}`,
  );
}

export async function loadStrategyPositions(strategyId: string) {
  return apiFetch<StrategyPosition[]>(
    `/api/v1/strategies/${strategyId}/positions`,
  );
}

export async function createOrderRequest(
  strategyId: string,
  input: {
    signalEventId: string;
    mode: OrderMode;
  },
) {
  return apiFetch<OrderRequest>(
    `/api/v1/strategies/${strategyId}/orders/requests`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function createOrderFill(
  strategyId: string,
  orderRequestId: string,
  input: {
    quantity: number;
    price: number;
    filledAt: string;
  },
) {
  return apiFetch<void>(
    `/api/v1/strategies/${strategyId}/orders/requests/${orderRequestId}/fills`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
