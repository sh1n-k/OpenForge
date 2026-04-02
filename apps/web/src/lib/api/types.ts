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

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export type DashboardStrategySummary = {
  id: string;
  name: string;
  strategyType: StrategyType;
  status: StrategyStatus;
  executionEnabled: boolean;
  lastRunStatus: string | null;
  lastRunAt: string | null;
  positionCount: number;
  todayOrderCount: number;
};

export type DashboardFillItem = {
  id: string;
  strategyId: string;
  strategyName: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  realizedPnl: number;
  filledAt: string;
};

export type DashboardPositionItem = {
  strategyId: string;
  strategyName: string;
  symbol: string;
  netQuantity: number;
  avgEntryPrice: number;
  lastFillAt: string | null;
};

export type DashboardErrorItem = {
  source: string;
  strategyId: string | null;
  strategyName: string | null;
  message: string;
  occurredAt: string;
};

export type DashboardResponse = {
  runningStrategyCount: number;
  todayOrderCount: number;
  todayPnl: number;
  positionCount: number;
  strategySummaries: DashboardStrategySummary[];
  recentFills: DashboardFillItem[];
  currentPositions: DashboardPositionItem[];
  recentErrors: DashboardErrorItem[];
  globalKillSwitchEnabled: boolean;
  health: { apiStatus: string; dbStatus: string };
};

// ---------------------------------------------------------------------------
// Cross-strategy
// ---------------------------------------------------------------------------

export type CrossStrategyOrderRequest = {
  id: string;
  strategyId: string;
  strategyName: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  mode: OrderMode;
  status: OrderRequestStatus;
  precheckPassed: boolean;
  failureReason: string | null;
  requestedAt: string;
};

export type CrossStrategyFill = {
  id: string;
  orderRequestId: string;
  strategyId: string;
  strategyName: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  realizedPnl: number;
  filledAt: string;
  source: OrderFillSource;
};

export type CrossStrategyPosition = {
  strategyId: string;
  strategyName: string;
  symbol: string;
  netQuantity: number;
  avgEntryPrice: number;
  lastFillAt: string | null;
};

// ---------------------------------------------------------------------------
// Activity events
// ---------------------------------------------------------------------------

export type ActivityEvent = {
  id: string;
  category: "execution" | "signal" | "order" | "risk" | "broker" | "system";
  strategyId: string | null;
  strategyName: string | null;
  summary: string;
  severity: "info" | "warn" | "error";
  occurredAt: string;
};
