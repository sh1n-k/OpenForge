import type {
  OrderMode,
  OrderRequestStatus,
  OrderSide,
  StrategyStatus,
  StrategyType,
} from "./common";
import type { OrderFillSource } from "./strategy";

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
