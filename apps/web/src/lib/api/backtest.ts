import { apiFetch } from "./client";
import type { BacktestRunStatus } from "./types/common";
import type {
  BacktestRunDetail,
  BacktestRunSummary,
  MarketCoverage,
} from "./types/backtest";

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
  return apiFetch<{ runId: string; status: BacktestRunStatus }>(
    "/api/v1/backtests",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function loadBacktest(runId: string) {
  return apiFetch<BacktestRunDetail>(`/api/v1/backtests/${runId}`);
}

export async function loadStrategyBacktests(strategyId: string) {
  return apiFetch<BacktestRunSummary[]>(
    `/api/v1/strategies/${strategyId}/backtests`,
  );
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
  return apiFetch<MarketCoverage>(
    `/api/v1/market-data/coverage?${params.toString()}`,
  );
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
