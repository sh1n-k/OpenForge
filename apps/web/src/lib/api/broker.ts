import { apiFetch } from "./client";
import type { OrderMode } from "./types/common";
import type {
  BrokerConnection,
  BrokerConnectionEvent,
  BrokerLedgerBalance,
  BrokerLedgerMarket,
  BrokerLedgerProfit,
  BrokerLedgerStatus,
  BrokerLedgerSyncRun,
  BrokerLedgerTrade,
  SystemBrokerStatus,
} from "./types/broker";

export async function loadSystemBrokerStatus(options?: {
  suppressAuthRedirect?: boolean;
}) {
  return apiFetch<SystemBrokerStatus>("/api/v1/system/broker", {
    suppressAuthRedirect: options?.suppressAuthRedirect,
  });
}

export async function loadSystemBrokerEvents(limit = 20) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  return apiFetch<BrokerConnectionEvent[]>(
    `/api/v1/system/broker/events?${params.toString()}`,
  );
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
