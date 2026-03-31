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
