import type {
  BacktestRunStatus,
  OrderLifecycleStatus,
  OrderMode,
  OrderRequestStatus,
  OrderSide,
  PayloadFormat,
  StrategyExecutionMode,
  StrategyExecutionTriggerType,
  StrategySignalType,
  StrategyStatus,
  StrategyType,
  StrategyValidationMessage,
  StrategyValidationStatus,
} from "./common";
import type { UniverseReference } from "./universe";

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

export type RiskCheck = {
  passed: boolean;
  reasonCodes: string[];
  projectedSymbolExposure: number | null;
  projectedStrategyExposure: number | null;
  projectedOpenPositions: number;
  currentDailyRealizedLoss: number;
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

export type OrderRequestWithEvents = {
  orderRequest: OrderRequest;
  statusEvents: OrderStatusEvent[];
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

export type StrategyValidateResponse = {
  valid: boolean;
  normalizedSpec: Record<string, unknown> | null;
  yamlPreview: string;
  errors: StrategyValidationMessage[];
  warnings: StrategyValidationMessage[];
  summary: string;
};
