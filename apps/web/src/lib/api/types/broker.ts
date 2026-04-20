import type { OrderMode } from "./common";

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

export type BrokerLedgerMarket = "domestic" | "overseas";
export type BrokerLedgerSyncRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed";
export type BrokerLedgerRowKind = "item" | "summary";

export type BrokerLedgerSyncRun = {
  id: string;
  brokerType: string;
  status: BrokerLedgerSyncRunStatus;
  overseasExchanges: string[];
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  startDate: string;
  endDate: string;
  markets: BrokerLedgerMarket[];
  tradeCount: number;
  balanceCount: number;
  profitCount: number;
  errorMessage: string | null;
};

export type BrokerLedgerStatus = {
  brokerType: string;
  liveConfigured: boolean;
  latestSyncRun: BrokerLedgerSyncRun | null;
  latestSuccessfulSyncRun: BrokerLedgerSyncRun | null;
};

export type BrokerLedgerTrade = {
  id: string;
  syncRunId: string;
  market: BrokerLedgerMarket;
  overseasExchange: string | null;
  rowKind: BrokerLedgerRowKind;
  sourceApi: string;
  symbol: string | null;
  symbolName: string | null;
  side: string | null;
  orderStatus: string | null;
  orderNumber: string | null;
  executionNumber: string | null;
  quantity: number | null;
  price: number | null;
  filledQuantity: number | null;
  remainingQuantity: number | null;
  realizedPnl: number | null;
  currency: string | null;
  capturedAt: string;
};

export type BrokerLedgerBalance = {
  id: string;
  syncRunId: string;
  market: BrokerLedgerMarket;
  overseasExchange: string | null;
  rowKind: BrokerLedgerRowKind;
  sourceApi: string;
  symbol: string | null;
  symbolName: string | null;
  quantity: number | null;
  averagePrice: number | null;
  currentPrice: number | null;
  valuationAmount: number | null;
  unrealizedPnl: number | null;
  realizedPnl: number | null;
  profitRate: number | null;
  currency: string | null;
  capturedAt: string;
};

export type BrokerLedgerProfit = {
  id: string;
  syncRunId: string;
  market: BrokerLedgerMarket;
  overseasExchange: string | null;
  rowKind: BrokerLedgerRowKind;
  sourceApi: string;
  symbol: string | null;
  symbolName: string | null;
  quantity: number | null;
  realizedPnl: number;
  profitRate: number | null;
  buyAmount: number | null;
  sellAmount: number | null;
  fees: number | null;
  taxes: number | null;
  currency: string | null;
  capturedAt: string;
};
