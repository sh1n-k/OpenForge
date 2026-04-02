import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardClient } from "@/components/dashboard-client";
import type { DashboardResponse, SystemRisk } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const dashboardFixture: DashboardResponse = {
  runningStrategyCount: 2,
  todayOrderCount: 5,
  todayPnl: 12500,
  positionCount: 3,
  strategySummaries: [
    {
      id: "s1",
      name: "Alpha Strategy",
      strategyType: "builder",
      status: "running",
      executionEnabled: true,
      lastRunStatus: "completed",
      lastRunAt: "2026-04-01T09:00:00+09:00",
      positionCount: 2,
      todayOrderCount: 3,
    },
  ],
  recentFills: [],
  currentPositions: [],
  recentErrors: [],
  globalKillSwitchEnabled: true,
  health: { apiStatus: "UP", dbStatus: "UP" },
};

const systemRiskActive: SystemRisk = {
  killSwitchEnabled: true,
  updatedAt: "2026-04-01T08:00:00+09:00",
};

const systemRiskInactive: SystemRisk = {
  killSwitchEnabled: false,
  updatedAt: null,
};

describe("DashboardClient", () => {
  it("should_render_metric_cards_when_dashboard_data_provided", () => {
    render(
      <DashboardClient dashboard={dashboardFixture} systemRisk={systemRiskActive} />,
    );

    expect(screen.getByText("실행 중 전략")).toBeInTheDocument();
    expect(screen.getAllByText("금일 주문").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("금일 손익")).toBeInTheDocument();
    expect(screen.getByText("보유 포지션")).toBeInTheDocument();
  });

  it("should_render_strategy_in_table_when_strategy_exists", () => {
    render(
      <DashboardClient dashboard={dashboardFixture} systemRisk={systemRiskActive} />,
    );

    expect(screen.getByText("Alpha Strategy")).toBeInTheDocument();
    expect(screen.getByText("running")).toBeInTheDocument();
  });

  it("should_show_kill_switch_active_label_when_enabled", () => {
    render(
      <DashboardClient dashboard={dashboardFixture} systemRisk={systemRiskActive} />,
    );

    expect(screen.getByRole("button", { name: "자동매매 가동 중" })).toBeInTheDocument();
  });

  it("should_show_kill_switch_stopped_label_when_disabled", () => {
    render(
      <DashboardClient
        dashboard={{ ...dashboardFixture, globalKillSwitchEnabled: false }}
        systemRisk={systemRiskInactive}
      />,
    );

    expect(screen.getByRole("button", { name: "전체 중지됨" })).toBeInTheDocument();
  });

  it("should_show_empty_strategy_message_when_no_strategies", () => {
    render(
      <DashboardClient
        dashboard={{ ...dashboardFixture, strategySummaries: [] }}
        systemRisk={systemRiskActive}
      />,
    );

    expect(screen.getByText("등록된 전략이 없습니다")).toBeInTheDocument();
  });

  it("should_show_empty_fills_message_when_no_recent_fills", () => {
    render(
      <DashboardClient
        dashboard={{ ...dashboardFixture, recentFills: [] }}
        systemRisk={systemRiskActive}
      />,
    );

    expect(screen.getByText("체결 내역이 없습니다")).toBeInTheDocument();
  });

  it("should_show_empty_positions_message_when_no_positions", () => {
    render(
      <DashboardClient
        dashboard={{ ...dashboardFixture, currentPositions: [] }}
        systemRisk={systemRiskActive}
      />,
    );

    expect(screen.getByText("보유 포지션이 없습니다")).toBeInTheDocument();
  });

  it("should_show_no_errors_message_when_no_recent_errors", () => {
    render(
      <DashboardClient
        dashboard={{ ...dashboardFixture, recentErrors: [] }}
        systemRisk={systemRiskActive}
      />,
    );

    expect(screen.getByText("최근 오류가 없습니다")).toBeInTheDocument();
  });
});
