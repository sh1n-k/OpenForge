import type {
  StrategyType,
  PayloadFormat,
  OrderMode,
  StrategySummary,
  StrategyDetail,
  StrategyVersion,
  StrategyExecutionResponse,
  StrategyExecutionRun,
  StrategySignalEvent,
  OrderCandidate,
  OrderRequest,
  OrderStatusEvent,
  OrderFill,
  StrategyPosition,
  StrategyRiskConfig,
  StrategyRiskEvent,
  SystemRisk,
  SystemRiskEvent,
  SystemBrokerStatus,
  BrokerConnection,
  BrokerConnectionEvent,
  BrokerLedgerStatus,
  BrokerLedgerSyncRun,
  BrokerLedgerTrade,
  BrokerLedgerBalance,
  BrokerLedgerProfit,
  BrokerLedgerMarket,
  BacktestRunStatus,
  BacktestRunDetail,
  BacktestRunSummary,
  MarketCoverage,
  StrategyValidateResponse,
  UniverseMarketScope,
  UniverseSummary,
  UniverseDetail,
  UniverseSymbol,
  DashboardResponse,
  CrossStrategyOrderRequest,
  CrossStrategyFill,
  CrossStrategyPosition,
  ActivityEvent,
  SymbolSearchResponse,
  SymbolCollectResponse,
  SymbolMasterStatusResponse,
} from "./types";

const defaultBaseUrl = "http://127.0.0.1:8080";

function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultBaseUrl;
  }

  return (
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    defaultBaseUrl
  );
}

async function getServerCookieHeader(): Promise<Record<string, string>> {
  if (typeof window !== "undefined") return {};
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("of_access_token");
    if (token) {
      return { Cookie: `of_access_token=${token.value}` };
    }
  } catch {
    // cookies() throws outside of server component context
  }
  return {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const serverCookies = await getServerCookieHeader();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    credentials: "include",
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...serverCookies,
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const body = (await response.json()) as {
        detail?: string;
        title?: string;
      };
      message = body.detail ?? body.title ?? message;
    } catch {
      // ignore parsing errors
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function loadStrategies() {
  return apiFetch<StrategySummary[]>("/api/v1/strategies");
}

export async function loadStrategy(strategyId: string) {
  return apiFetch<StrategyDetail>(`/api/v1/strategies/${strategyId}`);
}

export async function loadStrategyExecution(strategyId: string) {
  return apiFetch<StrategyExecutionResponse>(`/api/v1/strategies/${strategyId}/execution`);
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

export async function loadStrategySignals(strategyId: string, limit = 50) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  return apiFetch<StrategySignalEvent[]>(
    `/api/v1/strategies/${strategyId}/signals?${params.toString()}`,
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
  return apiFetch<StrategyPosition[]>(`/api/v1/strategies/${strategyId}/positions`);
}

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

export async function loadSystemBrokerStatus() {
  return apiFetch<SystemBrokerStatus>("/api/v1/system/broker");
}

export async function loadSystemBrokerEvents(limit = 20) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  return apiFetch<BrokerConnectionEvent[]>(
    `/api/v1/system/broker/events?${params.toString()}`,
  );
}

export async function loadBrokerLedgerStatus() {
  return apiFetch<BrokerLedgerStatus>("/api/v1/system/broker/ledger/status");
}

export async function loadBrokerLedgerSyncRuns(limit = 20) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  return apiFetch<BrokerLedgerSyncRun[]>(
    `/api/v1/system/broker/ledger/sync-runs?${params.toString()}`,
  );
}

export async function startBrokerLedgerSync(input: {
  startDate: string;
  endDate: string;
  markets: BrokerLedgerMarket[];
}) {
  return apiFetch<BrokerLedgerSyncRun>("/api/v1/system/broker/ledger/sync", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function loadBrokerLedgerTrades(input?: {
  syncRunId?: string | null;
  market?: BrokerLedgerMarket | null;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (input?.syncRunId) params.set("syncRunId", input.syncRunId);
  if (input?.market) params.set("market", input.market);
  params.set("limit", String(input?.limit ?? 100));
  return apiFetch<BrokerLedgerTrade[]>(
    `/api/v1/system/broker/ledger/trades?${params.toString()}`,
  );
}

export async function loadBrokerLedgerBalances(input?: {
  syncRunId?: string | null;
  market?: BrokerLedgerMarket | null;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (input?.syncRunId) params.set("syncRunId", input.syncRunId);
  if (input?.market) params.set("market", input.market);
  params.set("limit", String(input?.limit ?? 100));
  return apiFetch<BrokerLedgerBalance[]>(
    `/api/v1/system/broker/ledger/balances?${params.toString()}`,
  );
}

export async function loadBrokerLedgerProfits(input?: {
  syncRunId?: string | null;
  market?: BrokerLedgerMarket | null;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (input?.syncRunId) params.set("syncRunId", input.syncRunId);
  if (input?.market) params.set("market", input.market);
  params.set("limit", String(input?.limit ?? 100));
  return apiFetch<BrokerLedgerProfit[]>(
    `/api/v1/system/broker/ledger/profits?${params.toString()}`,
  );
}

export async function loadStrategyVersions(strategyId: string) {
  return apiFetch<StrategyVersion[]>(`/api/v1/strategies/${strategyId}/versions`);
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

export async function updateStrategyExecution(
  strategyId: string,
  input: { enabled: boolean; scheduleTime: string; timezone: string; mode: "paper" },
) {
  return apiFetch<StrategyExecutionResponse>(
    `/api/v1/strategies/${strategyId}/execution`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
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
  return apiFetch<StrategyRiskConfig>(`/api/v1/strategies/${strategyId}/risk`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function updateSystemRiskKillSwitch(input: { enabled: boolean }) {
  return apiFetch<SystemRisk>("/api/v1/system/risk/kill-switch", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function updateBrokerConnectionConfig(input: {
  targetMode: OrderMode;
  appKey?: string | null;
  appSecret?: string | null;
  accountNumber?: string | null;
  productCode?: string | null;
  enabled: boolean;
}) {
  return apiFetch<BrokerConnection>("/api/v1/system/broker/config", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function testBrokerConnection(input: { targetMode: OrderMode }) {
  return apiFetch<BrokerConnection>("/api/v1/system/broker/test", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function addStrategyVersion(
  strategyId: string,
  input: {
    payloadFormat: PayloadFormat;
    payload: Record<string, unknown>;
    changeSummary?: string;
  },
) {
  return apiFetch<StrategyVersion>(`/api/v1/strategies/${strategyId}/versions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createOrderRequest(
  strategyId: string,
  input: {
    signalEventId: string;
    mode: OrderMode;
  },
) {
  return apiFetch<OrderRequest>(`/api/v1/strategies/${strategyId}/orders/requests`, {
    method: "POST",
    body: JSON.stringify(input),
  });
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

export async function cloneStrategy(strategyId: string) {
  return apiFetch<StrategyDetail>(`/api/v1/strategies/${strategyId}/clone`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function createBacktest(input: {
  strategyId: string;
  strategyVersionId?: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  commissionRate: number;
  taxRate: number;
  slippageRate: number;
  symbols?: string[];
  universeIds?: string[];
}) {
  return apiFetch<{ runId: string; status: BacktestRunStatus }>("/api/v1/backtests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function loadBacktest(runId: string) {
  return apiFetch<BacktestRunDetail>(`/api/v1/backtests/${runId}`);
}

export async function loadStrategyBacktests(strategyId: string) {
  return apiFetch<BacktestRunSummary[]>(`/api/v1/strategies/${strategyId}/backtests`);
}

export async function loadMarketCoverage(input: {
  symbols: string[];
  startDate: string;
  endDate: string;
}) {
  const params = new URLSearchParams();
  input.symbols.forEach((symbol) => params.append("symbols", symbol));
  params.set("startDate", input.startDate);
  params.set("endDate", input.endDate);
  return apiFetch<MarketCoverage>(`/api/v1/market-data/coverage?${params.toString()}`);
}

export async function importDailyBars(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<{ importedRows: number; symbols: string[] }>(
    "/api/v1/market-data/daily-bars/import",
    {
      method: "POST",
      body,
    },
  );
}

export async function archiveStrategy(strategyId: string) {
  return apiFetch<void>(`/api/v1/strategies/${strategyId}`, {
    method: "DELETE",
  });
}

export async function replaceStrategyUniverses(
  strategyId: string,
  universeIds: string[],
) {
  return apiFetch<StrategyDetail>(`/api/v1/strategies/${strategyId}/universes`, {
    method: "PUT",
    body: JSON.stringify({ universeIds }),
  });
}

export async function loadUniverses() {
  return apiFetch<UniverseSummary[]>("/api/v1/universes");
}

export async function loadUniverse(universeId: string) {
  return apiFetch<UniverseDetail>(`/api/v1/universes/${universeId}`);
}

export async function createUniverse(input: {
  name: string;
  description?: string;
  marketScope: UniverseMarketScope;
}) {
  return apiFetch<UniverseDetail>("/api/v1/universes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateUniverse(
  universeId: string,
  input: { name?: string; description?: string },
) {
  return apiFetch<UniverseDetail>(`/api/v1/universes/${universeId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function replaceUniverseSymbols(
  universeId: string,
  symbols: UniverseSymbol[],
) {
  return apiFetch<UniverseDetail>(`/api/v1/universes/${universeId}/symbols`, {
    method: "PUT",
    body: JSON.stringify({ symbols }),
  });
}

export async function archiveUniverse(universeId: string) {
  return apiFetch<void>(`/api/v1/universes/${universeId}`, {
    method: "DELETE",
  });
}

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

export async function loadSystemActivity(limit = 100, category?: string) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (category) params.set("category", category);
  return apiFetch<ActivityEvent[]>(`/api/v1/system/activity?${params}`);
}

export async function searchSymbols(
  q: string,
  marketScope: UniverseMarketScope,
  exchange?: string,
  limit = 20,
) {
  const params = new URLSearchParams();
  params.set("q", q);
  params.set("marketScope", marketScope);
  if (exchange) params.set("exchange", exchange);
  params.set("limit", String(limit));
  return apiFetch<SymbolSearchResponse>(`/api/v1/symbols/search?${params}`);
}

export async function collectSymbols(marketScope: UniverseMarketScope) {
  const params = new URLSearchParams();
  params.set("marketScope", marketScope);
  return apiFetch<SymbolCollectResponse>(`/api/v1/symbols/collect?${params}`, {
    method: "POST",
  });
}

export async function loadSymbolMasterStatus() {
  return apiFetch<SymbolMasterStatusResponse>("/api/v1/symbols/status");
}

export async function login(password: string) {
  return apiFetch<{ authenticated: boolean }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function logout() {
  return apiFetch<{ loggedOut: boolean }>("/api/v1/auth/logout", {
    method: "POST",
  });
}

export async function refreshAuth() {
  return apiFetch<{ refreshed: boolean }>("/api/v1/auth/refresh", {
    method: "POST",
  });
}
