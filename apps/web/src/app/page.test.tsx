import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/page";
import * as apiModule from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const dashboardFixture: apiModule.DashboardResponse = {
  runningStrategyCount: 2,
  todayOrderCount: 5,
  todayPnl: 12500,
  positionCount: 3,
  strategySummaries: [
    {
      id: "s1",
      name: "Test Strategy",
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

const systemRiskFixture: apiModule.SystemRisk = {
  killSwitchEnabled: true,
  updatedAt: "2026-04-01T08:00:00+09:00",
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the dashboard with summary metrics", async () => {
    vi.spyOn(apiModule, "loadDashboard").mockResolvedValue(dashboardFixture);
    vi.spyOn(apiModule, "loadSystemRisk").mockResolvedValue(systemRiskFixture);

    render(await DashboardPage());

    expect(
      screen.getByRole("heading", { name: "운영 대시보드" }),
    ).toBeInTheDocument();
    // Summary metrics are present (may appear more than once across cards and tables)
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1); // runningStrategyCount
    expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1); // todayOrderCount
    expect(screen.getByText("Test Strategy")).toBeInTheDocument();
    expect(screen.getAllByText("신규 주문 차단 중").length).toBeGreaterThanOrEqual(1);
  });

  it("shows kill switch as stopped when disabled", async () => {
    vi.spyOn(apiModule, "loadDashboard").mockResolvedValue({
      ...dashboardFixture,
      globalKillSwitchEnabled: false,
    });
    vi.spyOn(apiModule, "loadSystemRisk").mockResolvedValue({
      killSwitchEnabled: false,
      updatedAt: null,
    });

    render(await DashboardPage());

    expect(screen.getAllByText("정상 운영 중").length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state messages when no data", async () => {
    vi.spyOn(apiModule, "loadDashboard").mockResolvedValue({
      ...dashboardFixture,
      strategySummaries: [],
      recentFills: [],
      currentPositions: [],
      recentErrors: [],
    });
    vi.spyOn(apiModule, "loadSystemRisk").mockResolvedValue(systemRiskFixture);

    render(await DashboardPage());

    expect(screen.getByText("등록된 전략이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("체결 내역이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("보유 포지션이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("최근 오류가 없습니다")).toBeInTheDocument();
  });
});
