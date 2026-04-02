import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrokerLedgerPageClient } from "@/components/broker-ledger-page-client";
import type {
  BrokerLedgerBalance,
  BrokerLedgerProfit,
  BrokerLedgerStatus,
  BrokerLedgerSyncRun,
  BrokerLedgerTrade,
} from "@/lib/api";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const syncRunFixture: BrokerLedgerSyncRun = {
  id: "run-1",
  brokerType: "kis",
  status: "succeeded",
  overseasExchanges: ["NASD", "NYSE"],
  requestedAt: "2026-04-02T08:00:00+09:00",
  startedAt: "2026-04-02T08:00:01+09:00",
  completedAt: "2026-04-02T08:00:10+09:00",
  startDate: "2026-03-01",
  endDate: "2026-03-31",
  markets: ["domestic", "overseas"],
  tradeCount: 1,
  balanceCount: 1,
  profitCount: 1,
  errorMessage: null,
  createdAt: "2026-04-02T08:00:00+09:00",
  updatedAt: "2026-04-02T08:00:10+09:00",
};

const statusFixture: BrokerLedgerStatus = {
  brokerType: "kis",
  liveConfigured: true,
  latestSyncRun: syncRunFixture,
  latestSuccessfulSyncRun: syncRunFixture,
};

const tradeFixture: BrokerLedgerTrade = {
  id: "trade-1",
  syncRunId: "run-1",
  market: "domestic",
  overseasExchange: null,
  rowKind: "item",
  sourceApi: "domestic_inquire_daily_ccld",
  symbol: "005930",
  symbolName: "삼성전자",
  side: "buy",
  orderStatus: "filled",
  orderNumber: "1001",
  executionNumber: "2001",
  quantity: 10,
  price: 69900,
  filledQuantity: 10,
  remainingQuantity: 0,
  realizedPnl: null,
  currency: "KRW",
  capturedAt: "2026-04-01T09:00:03+09:00",
};

const balanceFixture: BrokerLedgerBalance = {
  id: "balance-1",
  syncRunId: "run-1",
  market: "domestic",
  overseasExchange: null,
  rowKind: "item",
  sourceApi: "domestic_inquire_balance_rlz_pl",
  symbol: "005930",
  symbolName: "삼성전자",
  quantity: 10,
  averagePrice: 69900,
  currentPrice: 71000,
  valuationAmount: 710000,
  unrealizedPnl: 11000,
  realizedPnl: 0,
  profitRate: 1.57,
  currency: "KRW",
  capturedAt: "2026-04-02T15:30:00+09:00",
};

const profitFixture: BrokerLedgerProfit = {
  id: "profit-1",
  syncRunId: "run-1",
  market: "overseas",
  overseasExchange: "NASD",
  rowKind: "item",
  sourceApi: "overseas_inquire_period_profit",
  symbol: "AAPL",
  symbolName: "Apple",
  quantity: 1,
  realizedPnl: 250,
  profitRate: 2.4,
  buyAmount: 10000,
  sellAmount: 10250,
  fees: 10,
  taxes: 5,
  currency: "USD",
  capturedAt: "2026-04-01T16:00:00+09:00",
};

describe("BrokerLedgerPageClient", () => {
  it("renders source note and all ledger sections", () => {
    render(
      <BrokerLedgerPageClient
        initialStatus={statusFixture}
        initialRuns={[syncRunFixture]}
        initialTrades={[tradeFixture]}
        initialBalances={[balanceFixture]}
        initialProfits={[profitFixture]}
      />,
    );

    expect(screen.getByText("원장 상세")).toBeInTheDocument();
    expect(screen.getByText(/전략 매핑 없이 계좌 사실 데이터/)).toBeInTheDocument();
    expect(screen.getAllByText("거래 원장").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("잔고 스냅샷").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("손익 스냅샷").length).toBeGreaterThanOrEqual(1);
  });

  it("renders ledger rows", () => {
    render(
      <BrokerLedgerPageClient
        initialStatus={statusFixture}
        initialRuns={[syncRunFixture]}
        initialTrades={[tradeFixture]}
        initialBalances={[balanceFixture]}
        initialProfits={[profitFixture]}
      />,
    );

    expect(screen.getAllByText("005930").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
  });
});
