import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PositionsPageClient } from "@/components/positions/positions-page-client";
import type { CrossStrategyPosition, StrategySummary } from "@/lib/api";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const positionFixture: CrossStrategyPosition = {
  strategyId: "s1",
  strategyName: "Alpha Strategy",
  symbol: "005930",
  netQuantity: 10,
  avgEntryPrice: 70000,
  lastFillAt: "2026-04-01T09:31:00+09:00",
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

describe("PositionsPageClient", () => {
  it("should_render_position_in_table_when_positions_exist", () => {
    render(
      <PositionsPageClient
        positions={[positionFixture]}
        strategies={[strategySummaryFixture]}
      />,
    );

    expect(screen.getByText("005930")).toBeInTheDocument();
    expect(screen.getAllByText("Alpha Strategy").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText(/OpenForge 내부 체결로 계산한 포지션만 표시합니다/)).toBeInTheDocument();
  });

  it("should_render_summary_metrics_when_positions_exist", () => {
    render(
      <PositionsPageClient
        positions={[positionFixture]}
        strategies={[strategySummaryFixture]}
      />,
    );

    expect(screen.getByText("총 포지션")).toBeInTheDocument();
    expect(screen.getByText("보유 종목")).toBeInTheDocument();
    expect(screen.getByText("관련 전략")).toBeInTheDocument();
  });

  it("should_show_empty_position_message_when_no_positions", () => {
    render(
      <PositionsPageClient positions={[]} strategies={[]} />,
    );

    expect(screen.getByText("보유 포지션이 없습니다")).toBeInTheDocument();
  });

  it("should_show_zero_metrics_when_no_positions", () => {
    render(
      <PositionsPageClient positions={[]} strategies={[]} />,
    );

    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });
});
