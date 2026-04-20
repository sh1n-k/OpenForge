import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrokerPageClient } from "@/components/broker/broker-page-client";
import type { BrokerLedgerStatus, BrokerLedgerSyncRun } from "@/lib/api";

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
  tradeCount: 24,
  balanceCount: 8,
  profitCount: 12,
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

describe("BrokerPageClient", () => {
  it("renders source note and summary cards", () => {
    render(
      <BrokerPageClient initialStatus={statusFixture} initialRuns={[syncRunFixture]} />,
    );

    expect(screen.getByText("계좌 원장")).toBeInTheDocument();
    expect(screen.getByText(/HTS, MTS, 다른 프로그램/)).toBeInTheDocument();
    expect(screen.getByText("최신 주문/체결")).toBeInTheDocument();
    expect(screen.getAllByText("24").length).toBeGreaterThanOrEqual(1);
  });

  it("renders sync history", () => {
    render(
      <BrokerPageClient initialStatus={statusFixture} initialRuns={[syncRunFixture]} />,
    );

    expect(screen.getByText("동기화 이력")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        (_, element) =>
          element?.textContent?.includes("거래 24 / 잔고 8 / 손익 12") ?? false,
      ).length,
    ).toBeGreaterThan(0);
  });
});
