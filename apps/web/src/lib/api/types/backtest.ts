import type { BacktestRunStatus } from "./common";

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
