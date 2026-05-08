import { render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RouteView from "./RouteView.svelte";
import {
  loadAllFills,
  loadAllOrders,
  loadAllPositions,
  loadBrokerLedgerBalances,
  loadBrokerLedgerProfits,
  loadBrokerLedgerStatus,
  loadBrokerLedgerSyncRuns,
  loadBrokerLedgerTrades,
  loadDashboard,
  loadStrategies,
  loadStrategy,
  loadStrategyBacktests,
  loadStrategyFills,
  loadStrategyVersions,
  loadSystemRisk,
  loadUniverse,
  loadUniverses,
  searchSymbols,
} from "@/lib/api";

vi.mock("@/lib/api", () => {
  const ok = vi.fn().mockResolvedValue({});
  return {
    addStrategyVersion: ok,
    archiveStrategy: ok,
    archiveUniverse: ok,
    cloneStrategy: ok,
    collectSymbols: ok,
    createBacktest: ok,
    createOrderRequest: ok,
    createStrategy: ok,
    createUniverse: ok,
    importDailyBars: ok,
    loadAllFills: vi.fn().mockResolvedValue([]),
    loadAllOrders: vi.fn().mockResolvedValue([]),
    loadAllPositions: vi.fn().mockResolvedValue([]),
    loadBacktest: ok,
    loadBrokerLedgerBalances: vi.fn().mockResolvedValue([]),
    loadBrokerLedgerProfits: vi.fn().mockResolvedValue([]),
    loadBrokerLedgerStatus: vi.fn().mockResolvedValue({
      liveConfigured: false,
      latestSuccessfulSyncRun: { id: "sync-1" },
    }),
    loadBrokerLedgerSyncRuns: vi.fn().mockResolvedValue([]),
    loadBrokerLedgerTrades: vi.fn().mockResolvedValue([]),
    loadDashboard: vi.fn().mockResolvedValue({
      runningStrategyCount: 0,
      todayOrderCount: 0,
      todayPnl: 0,
      strategySummaries: [],
      recentFills: [],
      currentPositions: [],
      recentErrors: [],
      health: { apiStatus: "UP", dbStatus: "UP" },
    }),
    loadMarketCoverage: ok,
    loadStrategies: vi.fn().mockResolvedValue([]),
    loadStrategy: vi.fn().mockResolvedValue({
      id: "strategy-1",
      name: "Strategy 1",
      description: "test strategy",
      strategyType: "builder",
      latestVersion: null,
    }),
    loadStrategyBacktests: vi.fn().mockResolvedValue([]),
    loadStrategyExecution: ok,
    loadStrategyExecutionRuns: vi.fn().mockResolvedValue([]),
    loadStrategyFills: vi.fn().mockResolvedValue([]),
    loadStrategyOrderCandidates: vi.fn().mockResolvedValue([]),
    loadStrategyOrderRequests: vi.fn().mockResolvedValue([]),
    loadStrategyOrderRequestsWithEvents: vi.fn().mockResolvedValue([]),
    loadStrategyPositions: vi.fn().mockResolvedValue([]),
    loadStrategyRisk: ok,
    loadStrategyRiskEvents: vi.fn().mockResolvedValue([]),
    loadStrategySignals: vi.fn().mockResolvedValue([]),
    loadStrategyVersions: vi.fn().mockResolvedValue([]),
    loadSystemActivity: vi.fn().mockResolvedValue([]),
    loadSystemBrokerEvents: vi.fn().mockResolvedValue([]),
    loadSystemBrokerStatus: ok,
    loadSystemRisk: vi.fn().mockResolvedValue({ killSwitchEnabled: false }),
    loadSystemRiskEvents: vi.fn().mockResolvedValue([]),
    loadUniverse: vi.fn().mockResolvedValue({
      id: "universe-1",
      name: "Universe 1",
      description: "test universe",
      marketScope: "domestic",
      symbolCount: 0,
      symbols: [],
    }),
    loadUniverses: vi.fn().mockResolvedValue([]),
    replaceUniverseSymbols: ok,
    searchSymbols: vi.fn().mockResolvedValue({ items: [] }),
    startBrokerLedgerSync: ok,
    testBrokerConnection: ok,
    updateBrokerConnectionConfig: ok,
    updateStrategyExecution: ok,
    updateStrategyRisk: ok,
    updateSystemRiskKillSwitch: ok,
    updateUniverse: ok,
    validateStrategy: ok,
  };
});

vi.mock("@/lib/health", () => ({
  loadHealthStatus: vi.fn().mockResolvedValue({
    appName: "OpenForge",
    version: "test",
    status: "UP",
  }),
}));

describe("RouteView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads dashboard data once on initial render", async () => {
    render(RouteView, { props: { route: { name: "dashboard" } } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "운영 대시보드" })).toBeTruthy();
    });

    expect(loadDashboard).toHaveBeenCalledTimes(1);
    expect(loadSystemRisk).toHaveBeenCalledTimes(1);
  });

  it("loads only rendered data on the strategy backtest route", async () => {
    render(RouteView, { props: { route: { name: "strategy-backtest", strategyId: "strategy-1" } } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Strategy 1 백테스트" })).toBeTruthy();
    });

    expect(loadStrategy).toHaveBeenCalledWith("strategy-1");
    expect(loadStrategyBacktests).toHaveBeenCalledWith("strategy-1");
    expect(loadStrategyVersions).not.toHaveBeenCalled();
    expect(loadUniverses).not.toHaveBeenCalled();
  });

  it("does not preload symbol search results on universe detail", async () => {
    render(RouteView, { props: { route: { name: "universe-detail", universeId: "universe-1" } } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Universe 1" })).toBeTruthy();
    });

    expect(loadUniverse).toHaveBeenCalledWith("universe-1");
    expect(searchSymbols).not.toHaveBeenCalled();
  });

  it("loads order pages without the unused strategy registry", async () => {
    render(RouteView, { props: { route: { name: "orders" } } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "주문" })).toBeTruthy();
    });

    expect(loadAllOrders).toHaveBeenCalledTimes(1);
    expect(loadAllFills).toHaveBeenCalledTimes(1);
    expect(loadStrategies).not.toHaveBeenCalled();
  });

  it("loads positions without the unused strategy registry", async () => {
    render(RouteView, { props: { route: { name: "positions" } } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "포지션" })).toBeTruthy();
    });

    expect(loadAllPositions).toHaveBeenCalledTimes(1);
    expect(loadStrategies).not.toHaveBeenCalled();
  });

  it("does not fetch unused broker sync history on ledger page", async () => {
    render(RouteView, { props: { route: { name: "broker-ledger" } } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "브로커 원장" })).toBeTruthy();
    });

    expect(loadBrokerLedgerStatus).toHaveBeenCalledTimes(1);
    expect(loadBrokerLedgerTrades).toHaveBeenCalledTimes(1);
    expect(loadBrokerLedgerBalances).toHaveBeenCalledTimes(1);
    expect(loadBrokerLedgerProfits).toHaveBeenCalledTimes(1);
    expect(loadBrokerLedgerSyncRuns).not.toHaveBeenCalled();
  });

  it("does not fetch unrendered strategy detail collections", async () => {
    render(RouteView, { props: { route: { name: "strategy-detail", strategyId: "strategy-1" } } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Strategy 1" })).toBeTruthy();
    });

    expect(loadStrategyFills).not.toHaveBeenCalled();
    expect(loadUniverses).not.toHaveBeenCalled();
  });
});
