export type StrategyType = "builder" | "code";
export type StrategyStatus =
  | "draft"
  | "backtest_completed"
  | "running"
  | "stopped";
export type PayloadFormat = "builder_json" | "code_text";
export type UniverseMarketScope = "domestic" | "us";
export type MarketType = UniverseMarketScope;
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
