import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RouteView from "./RouteView.svelte";
import {
  approveRebalancePlan,
  createRebalancePlanFromLedger,
  loadAllFills,
  loadAllOrders,
  loadAllPositions,
  loadBrokerLedgerBalances,
  loadBrokerLedgerProfits,
  loadBrokerLedgerStatus,
  loadBrokerLedgerSyncRuns,
  loadBrokerLedgerTrades,
  loadDashboard,
  loadRebalancePlans,
  loadStrategies,
  loadStrategy,
  loadStrategyBacktests,
  loadStrategyFills,
  loadStrategyOrderRequests,
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
    approveRebalancePlan: ok,
    archiveStrategy: ok,
    archiveUniverse: ok,
    cloneStrategy: ok,
    collectSymbols: ok,
    createBacktest: ok,
    createOrderRequest: ok,
    createRebalancePlanFromLedger: vi.fn().mockResolvedValue({}),
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
      positionCount: 0,
      globalKillSwitchEnabled: false,
      strategySummaries: [],
      recentFills: [],
      currentPositions: [],
      recentErrors: [],
      health: { apiStatus: "UP", dbStatus: "UP" },
    }),
    loadMarketCoverage: ok,
    loadRebalancePlans: vi.fn().mockResolvedValue([]),
    loadStrategies: vi.fn().mockResolvedValue([]),
    loadStrategy: vi.fn().mockResolvedValue({
      id: "strategy-1",
      name: "Strategy 1",
      description: "test strategy",
      strategyType: "builder",
      latestVersion: null,
      universes: [],
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
    replaceStrategyUniverses: ok,
    replaceUniverseSymbols: ok,
    searchSymbols: vi.fn().mockResolvedValue({ items: [] }),
    sendRebalancePlan: ok,
    startBrokerLedgerSync: ok,
    syncRebalancePlan: ok,
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
    window.history.replaceState(null, "", "/");
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("loads dashboard data once on initial render", async () => {
    render(RouteView, { props: { route: { name: "dashboard" } } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "운영 대시보드" })).toBeTruthy();
    });

    expect(loadDashboard).toHaveBeenCalledTimes(1);
    expect(loadSystemRisk).not.toHaveBeenCalled();
  });

  it("loads only rendered data on the strategy backtest route", async () => {
    render(RouteView, { props: { route: { name: "strategy-backtest", strategyId: "strategy-1" } } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Strategy 1 과거 데이터 점검" })).toBeTruthy();
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

  it("loads strategy detail data needed for execution management", async () => {
    render(RouteView, { props: { route: { name: "strategy-detail", strategyId: "strategy-1" } } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Strategy 1" })).toBeTruthy();
    });

    expect(loadStrategyFills).not.toHaveBeenCalled();
    expect(loadStrategyOrderRequests).not.toHaveBeenCalled();
    expect(loadUniverses).toHaveBeenCalledTimes(1);
    expect(loadRebalancePlans).toHaveBeenCalledWith("strategy-1");
  });

  it("shows rebalance operating evidence and requires the live approval phrase", async () => {
    vi.mocked(loadBrokerLedgerStatus).mockResolvedValueOnce({
      brokerType: "kis",
      liveConfigured: false,
      latestSuccessfulSyncRun: {
        id: "sync-1",
        brokerType: "kis",
        status: "succeeded",
        overseasExchanges: [],
        requestedAt: "2026-05-14T05:59:00Z",
        startedAt: "2026-05-14T05:59:30Z",
        completedAt: "2026-05-14T06:00:00Z",
        startDate: "2026-05-14",
        endDate: "2026-05-14",
        markets: ["domestic"],
        tradeCount: 0,
        balanceCount: 1,
        profitCount: 0,
        errorMessage: null,
      },
      latestSyncRun: null,
    });
    vi.mocked(loadRebalancePlans).mockResolvedValueOnce([
      {
        id: "plan-1",
        strategyId: "strategy-1",
        strategyVersionId: "version-1",
        mode: "live",
        status: "planned",
        accountSnapshot: {},
        targetWeights: [],
        settingsSnapshot: {},
        riskSummary: { reasonCodes: [] },
        approvalRequired: true,
        adminApproved: false,
        approvedAt: null,
        approvedBy: null,
        liveChecklistAccepted: false,
        failureReason: null,
        plannedAt: "2026-05-14T05:00:00Z",
        sentAt: null,
        syncedAt: null,
        orders: [
          {
            id: "order-1",
            symbol: "005930",
            side: "buy",
            quantity: 1,
            price: 100000,
            notional: 100000,
            estimatedFee: 0,
            estimatedTax: 0,
            status: "rejected_precheck",
            idempotencyKey: "key-1",
            brokerOrderNumber: null,
            brokerResponseCode: null,
            brokerResponseMessage: null,
            requestedAt: null,
            filledQuantity: 0,
            remainingQuantity: 1,
            precheckSummary: { reasonCodes: ["live_default_order_notional"] },
          },
          {
            id: "order-2",
            symbol: "000660",
            side: "buy",
            quantity: 1,
            price: 100000,
            notional: 100000,
            estimatedFee: 0,
            estimatedTax: 0,
            status: "rejected",
            idempotencyKey: "key-2",
            brokerOrderNumber: null,
            brokerResponseCode: "ERROR",
            brokerResponseMessage: "mock broker API error",
            requestedAt: null,
            filledQuantity: 0,
            remainingQuantity: 1,
            precheckSummary: { reasonCodes: [] },
          },
        ],
      },
    ]);

    render(RouteView, { props: { route: { name: "strategy-detail", strategyId: "strategy-1" } } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Strategy 1" })).toBeTruthy();
    });
    await fireEvent.click(screen.getByRole("tab", { name: "리밸런싱" }));

    expect(screen.getByText("목표 비중 합계 80.00%")).toBeTruthy();
    expect((screen.getByRole("button", { name: "원장으로 계획 생성" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText((content) => content.includes("최신 원장:") && content.includes("2026"))).toBeTruthy();
    expect(screen.getByText((content) => content.includes("live_default_order_notional"))).toBeTruthy();
    expect(screen.getByText((content) => content.includes("mock broker API error"))).toBeTruthy();

    expect((screen.getByRole("button", { name: "승인" }) as HTMLButtonElement).disabled).toBe(true);

    await fireEvent.click(screen.getByLabelText("live 운영 체크리스트 완료"));
    await fireEvent.input(screen.getByPlaceholderText("LIVE 리밸런싱 위험 확인"), {
      target: { value: "LIVE 리밸런싱 위험 확인" },
    });

    await waitFor(() => {
      expect((screen.getByRole("button", { name: "승인" }) as HTMLButtonElement).disabled).toBe(false);
    });
    await fireEvent.click(screen.getByRole("button", { name: "승인" }));
    expect(approveRebalancePlan).toHaveBeenCalledWith("strategy-1", "plan-1", {
      approvedBy: "owner",
      confirmLiveRisk: true,
      liveChecklistAccepted: true,
      liveConfirmationPhrase: "LIVE 리밸런싱 위험 확인",
    });
  });

  it("shows rebalance plan creation failure reason from the API", async () => {
    vi.mocked(createRebalancePlanFromLedger).mockRejectedValueOnce(new Error("Broker ledger snapshot is stale"));

    render(RouteView, { props: { route: { name: "strategy-detail", strategyId: "strategy-1" } } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Strategy 1" })).toBeTruthy();
    });
    await fireEvent.click(screen.getByRole("tab", { name: "리밸런싱" }));
    await fireEvent.input(screen.getAllByLabelText("목표 비중")[1], {
      target: { value: "50" },
    });

    await waitFor(() => {
      expect((screen.getByRole("button", { name: "원장으로 계획 생성" }) as HTMLButtonElement).disabled).toBe(false);
    });
    await fireEvent.click(screen.getByRole("button", { name: "원장으로 계획 생성" }));

    await waitFor(() => {
      expect(screen.getByText("Broker ledger snapshot is stale")).toBeTruthy();
    });
    expect(createRebalancePlanFromLedger).toHaveBeenCalledWith(
      "strategy-1",
      expect.objectContaining({
        mode: "paper",
        targetWeights: [
          { symbol: "005930", targetWeight: 0.5, price: null },
          { symbol: "000660", targetWeight: 0.5, price: null },
        ],
      }),
    );
  });
});
