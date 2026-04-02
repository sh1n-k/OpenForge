import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrdersPageClient } from "@/components/orders-page-client";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
import type {
  CrossStrategyFill,
  CrossStrategyOrderRequest,
  StrategySummary,
} from "@/lib/api";

const orderFixture: CrossStrategyOrderRequest = {
  id: "o1",
  strategyId: "s1",
  strategyName: "Alpha Strategy",
  symbol: "005930",
  side: "buy",
  quantity: 10,
  price: 70000,
  mode: "paper",
  status: "requested",
  precheckPassed: true,
  failureReason: null,
  requestedAt: "2026-04-01T09:30:00+09:00",
};

const fillFixture: CrossStrategyFill = {
  id: "f1",
  orderRequestId: "o1",
  strategyId: "s1",
  strategyName: "Alpha Strategy",
  symbol: "005930",
  side: "buy",
  quantity: 10,
  price: 70000,
  realizedPnl: 5000,
  filledAt: "2026-04-01T09:31:00+09:00",
  source: "paper_manual",
};

const strategySummaryFixture: StrategySummary = {
  id: "s1",
  name: "Alpha Strategy",
  description: null,
  strategyType: "builder",
  status: "running",
  latestVersionId: "v1",
  latestVersionNumber: 1,
  versionCount: 1,
  universeCount: 1,
  updatedAt: "2026-04-01T08:00:00+09:00",
};

describe("OrdersPageClient", () => {
  it("should_render_order_table_when_orders_exist", () => {
    render(
      <OrdersPageClient
        orders={[orderFixture]}
        fills={[]}
        strategies={[]}
      />,
    );

    expect(screen.getByText("005930")).toBeInTheDocument();
    expect(screen.getByText("Alpha Strategy")).toBeInTheDocument();
    expect(screen.getByText("요청")).toBeInTheDocument();
    expect(screen.getByText(/OpenForge 내부 주문 기록만 표시합니다/)).toBeInTheDocument();
  });

  it("should_render_fill_table_when_fills_exist", () => {
    render(
      <OrdersPageClient
        orders={[]}
        fills={[fillFixture]}
        strategies={[]}
      />,
    );

    expect(screen.getByText("005930")).toBeInTheDocument();
    expect(screen.getByText("모의(수동)")).toBeInTheDocument();
  });

  it("should_show_empty_order_message_when_no_orders", () => {
    render(
      <OrdersPageClient orders={[]} fills={[]} strategies={[]} />,
    );

    expect(screen.getByText("주문 내역이 없습니다")).toBeInTheDocument();
  });

  it("should_show_empty_fill_message_when_no_fills", () => {
    render(
      <OrdersPageClient orders={[]} fills={[]} strategies={[]} />,
    );

    expect(screen.getByText("체결 내역이 없습니다")).toBeInTheDocument();
  });

  it("should_render_strategy_filter_select_when_strategies_provided", () => {
    render(
      <OrdersPageClient
        orders={[]}
        fills={[]}
        strategies={[strategySummaryFixture]}
      />,
    );

    expect(screen.getByText("전략 필터")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Alpha Strategy" })).toBeInTheDocument();
  });
});
