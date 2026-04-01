export type StrategyType = "builder" | "code";
export type StrategyStatus =
  | "draft"
  | "backtest_completed"
  | "running"
  | "stopped";
export type PayloadFormat = "builder_json" | "code_text";
export type MarketType = "domestic";
export type StrategyValidationStatus =
  | "valid"
  | "invalid"
  | "invalid_legacy_draft";
export type BacktestRunStatus = "queued" | "running" | "completed" | "failed";
export type StrategyExecutionMode = "paper";
export type StrategyExecutionTriggerType = "scheduled";
export type StrategySignalType = "entry" | "exit";
export type OrderMode = "paper" | "live";
export type OrderSide = "buy" | "sell";
export type OrderType = "limit";
export type OrderLifecycleStatus =
  | "requested"
  | "accepted"
  | "partially_filled"
  | "filled"
  | "cancelled"
  | "rejected";
export type OrderRequestStatus =
  | "requested"
  | "rejected_duplicate"
  | "rejected_precheck"
  | "rejected_risk";

export type StrategyValidationMessage = {
  category: string;
  message: string;
};

export type StrategySummary = {
  id: string;
  name: string;
  description: string | null;
  strategyType: StrategyType;
  status: StrategyStatus;
  latestVersionId: string | null;
  latestVersionNumber: number | null;
  versionCount: number;
  universeCount: number;
  updatedAt: string;
};

export type StrategyVersion = {
  id: string;
  versionNumber: number;
  payloadFormat: PayloadFormat;
  payload: Record<string, unknown>;
  validationStatus: StrategyValidationStatus;
  validationErrors: StrategyValidationMessage[];
  validationWarnings: StrategyValidationMessage[];
  changeSummary: string | null;
  createdAt: string;
};

export type UniverseReference = {
  id: string;
  name: string;
  description: string | null;
};

export type StrategyDetail = {
  id: string;
  name: string;
  description: string | null;
  strategyType: StrategyType;
  status: StrategyStatus;
  latestVersionId: string | null;
  latestVersionNumber: number | null;
  versionCount: number;
  universeCount: number;
  latestValidationStatus: StrategyValidationStatus | null;
  latestValidationErrors: StrategyValidationMessage[];
  latestValidationWarnings: StrategyValidationMessage[];
  latestVersion: StrategyVersion | null;
  universes: UniverseReference[];
  createdAt: string;
  updatedAt: string;
};

export type StrategyExecutionLastRun = {
  runId: string;
  status: BacktestRunStatus;
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
  signalCount: number;
  errorMessage: string | null;
};

export type StrategyExecutionResponse = {
  mode: StrategyExecutionMode;
  enabled: boolean;
  scheduleTime: string;
  timezone: string;
  strategyStatus: StrategyStatus;
  lastRun: StrategyExecutionLastRun | null;
  nextRunAt: string | null;
};

export type StrategyExecutionRun = {
  runId: string;
  status: BacktestRunStatus;
  triggerType: StrategyExecutionTriggerType;
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
  symbolCount: number;
  signalCount: number;
  errorMessage: string | null;
  strategyVersionId: string;
};

export type StrategySignalEvent = {
  id: string;
  runId: string;
  strategyVersionId: string;
  symbol: string;
  signalType: StrategySignalType;
  tradingDate: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

export type OrderPrecheck = {
  passed: boolean;
  marketHours: boolean;
  strategyStatus: boolean;
  duplicateOrder: boolean;
  quantityValid: boolean;
  priceValid: boolean;
  reasonCodes: string[];
};

export type OrderCandidate = {
  signalEventId: string;
  executionRunId: string;
  strategyVersionId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  tradingDate: string;
  mode: OrderMode;
  alreadyRequested: boolean;
  precheck: OrderPrecheck;
  riskCheck: RiskCheck;
};

export type RiskCheck = {
  passed: boolean;
  reasonCodes: string[];
  projectedSymbolExposure: number | null;
  projectedStrategyExposure: number | null;
  projectedOpenPositions: number;
  currentDailyRealizedLoss: number;
};

export type OrderRequest = {
  id: string;
  signalEventId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  mode: OrderMode;
  status: OrderRequestStatus;
  currentStatus: OrderLifecycleStatus | OrderRequestStatus;
  filledQuantity: number;
  remainingQuantity: number;
  precheckPassed: boolean;
  failureReason: string | null;
  requestedAt: string;
};

export type OrderStatusEvent = {
  id: string;
  orderRequestId: string;
  status: OrderLifecycleStatus;
  reason: string | null;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export type OrderFillSource = "paper_manual" | "live_sync_reserved";

export type OrderFill = {
  id: string;
  orderRequestId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  filledAt: string;
  source: OrderFillSource;
};

export type StrategyPosition = {
  symbol: string;
  netQuantity: number;
  avgEntryPrice: number;
  lastFillAt: string | null;
};

export type StrategyRiskMode = "paper";

export type StrategyRiskConfig = {
  mode: StrategyRiskMode;
  perSymbolMaxNotional: number | null;
  strategyMaxExposure: number | null;
  maxOpenPositions: number | null;
  dailyLossLimit: number | null;
  strategyKillSwitchEnabled: boolean;
  updatedAt: string;
};

export type StrategyRiskEventScope = "strategy" | "global";
export type StrategyRiskEventType =
  | "order_blocked"
  | "strategy_kill_switch_changed"
  | "daily_loss_limit_tripped";

export type StrategyRiskEvent = {
  id: string;
  strategyId: string;
  orderRequestId: string | null;
  scope: StrategyRiskEventScope;
  eventType: StrategyRiskEventType;
  reasonCode: string;
  message: string;
  payload: Record<string, unknown>;
  occurredAt: string;
};

export type SystemRisk = {
  killSwitchEnabled: boolean;
  updatedAt: string | null;
};

export type SystemRiskEvent = {
  id: number;
  eventType: string;
  reasonCode: string;
  message: string;
  payload: Record<string, unknown>;
  occurredAt: string;
};

export type BrokerConnectionTestStatus = "success" | "failed";
export type BrokerConnectionEventType =
  | "config_saved"
  | "connection_test_succeeded"
  | "connection_test_failed"
  | "enabled_changed";

export type BrokerConnection = {
  brokerType: string;
  targetMode: OrderMode;
  enabled: boolean;
  isConfigured: boolean;
  maskedAppKey: string | null;
  maskedAccountNumber: string | null;
  maskedProductCode: string | null;
  lastConnectionTestAt: string | null;
  lastConnectionTestStatus: BrokerConnectionTestStatus | null;
  lastConnectionTestMessage: string | null;
};

export type SystemBrokerStatus = {
  currentSystemMode: OrderMode;
  paper: BrokerConnection;
  live: BrokerConnection;
  hasPaperConfig: boolean;
  hasLiveConfig: boolean;
  isCurrentModeConfigured: boolean;
};

export type BrokerConnectionEvent = {
  id: string;
  targetMode: OrderMode;
  eventType: BrokerConnectionEventType;
  message: string;
  payload: Record<string, unknown>;
  occurredAt: string;
};

export type BacktestHeadlineMetrics = {
  totalReturnRate: number;
  maxDrawdownRate: number;
  winRate: number;
  tradeCount: number;
  averagePnl: number;
  profitFactor: number;
};

export type BacktestRunSummary = {
  runId: string;
  strategyVersionId: string;
  status: BacktestRunStatus;
  requestedAt: string;
  completedAt: string | null;
  headlineMetrics: BacktestHeadlineMetrics | null;
};

export type BacktestEquityPoint = {
  tradingDate: string;
  equity: number;
  cash: number;
  drawdown: number;
};

export type BacktestTrade = {
  symbol: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  grossPnl: number;
  netPnl: number;
  pnlPercent: number;
  exitReason: "signal" | "stop_loss" | "take_profit" | "trailing_stop" | "end_of_period";
};

export type BacktestRunDetail = {
  runId: string;
  strategyId: string;
  strategyVersionId: string;
  status: BacktestRunStatus;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  config: Record<string, unknown>;
  symbols: string[];
  summary: Record<string, unknown> | null;
  equityCurve: BacktestEquityPoint[];
  trades: BacktestTrade[];
  errorMessage: string | null;
};

export type MarketCoverageSymbol = {
  symbol: string;
  covered: boolean;
  firstDate: string | null;
  lastDate: string | null;
};

export type MarketCoverage = {
  covered: boolean;
  symbols: MarketCoverageSymbol[];
};

export type StrategyValidateResponse = {
  valid: boolean;
  normalizedSpec: Record<string, unknown> | null;
  yamlPreview: string;
  errors: StrategyValidationMessage[];
  warnings: StrategyValidationMessage[];
  summary: string;
};

export type UniverseSummary = {
  id: string;
  name: string;
  description: string | null;
  symbolCount: number;
  strategyCount: number;
  updatedAt: string;
};

export type UniverseSymbol = {
  symbol: string;
  market: MarketType;
  displayName: string;
  sortOrder: number;
};

export type UniverseDetail = {
  id: string;
  name: string;
  description: string | null;
  symbolCount: number;
  strategyCount: number;
  symbols: UniverseSymbol[];
  createdAt: string;
  updatedAt: string;
};

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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });

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
  input: { enabled: boolean; scheduleTime: string },
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
