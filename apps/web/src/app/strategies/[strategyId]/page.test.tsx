import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StrategyDetailPage from "@/app/strategies/[strategyId]/page";
import * as apiModule from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const strategyFixture: apiModule.StrategyDetail = {
  id: "strategy-1",
  name: "Strategy Detail Fixture",
  description: "fixture",
  strategyType: "builder",
  status: "running",
  latestVersionId: "version-1",
  latestVersionNumber: 1,
  versionCount: 1,
  universeCount: 1,
  latestValidationStatus: "valid",
  latestValidationErrors: [],
  latestValidationWarnings: [],
  latestVersion: {
    id: "version-1",
    versionNumber: 1,
    payloadFormat: "builder_json",
    payload: {},
    validationStatus: "valid",
    validationErrors: [],
    validationWarnings: [],
    changeSummary: null,
    createdAt: "2026-04-01T09:00:00+09:00",
  },
  universes: [
    {
      id: "universe-1",
      name: "KR Core",
      description: null,
      marketScope: "domestic",
    },
  ],
  createdAt: "2026-04-01T09:00:00+09:00",
  updatedAt: "2026-04-01T09:00:00+09:00",
};

const executionFixture: apiModule.StrategyExecutionResponse = {
  mode: "paper",
  enabled: true,
  scheduleTime: "09:00",
  timezone: "Asia/Seoul",
  strategyStatus: "running",
  lastRun: null,
  nextRunAt: "2026-04-02T09:00:00+09:00",
};

const riskFixture: apiModule.StrategyRiskConfig = {
  mode: "paper",
  perSymbolMaxNotional: null,
  strategyMaxExposure: null,
  maxOpenPositions: null,
  dailyLossLimit: null,
  strategyKillSwitchEnabled: false,
  updatedAt: "2026-04-01T09:00:00+09:00",
};

function orderRequestWithEvents(index: number): apiModule.OrderRequestWithEvents {
  return {
    orderRequest: {
      id: `order-${index}`,
      signalEventId: `signal-${index}`,
      symbol: `AAA${index.toString().padStart(3, "0")}`,
      side: "buy",
      quantity: 1,
      price: 12,
      mode: "paper",
      status: "requested",
      currentStatus: "requested",
      filledQuantity: 0,
      remainingQuantity: 1,
      precheckPassed: true,
      failureReason: null,
      requestedAt: "2026-04-01T09:00:00+09:00",
    },
    statusEvents: [
      {
        id: `event-${index}`,
        orderRequestId: `order-${index}`,
        status: "requested",
        reason: null,
        occurredAt: "2026-04-01T09:00:00+09:00",
        payload: {},
      },
    ],
  };
}

function mockBaseLoaders() {
  vi.spyOn(apiModule, "loadStrategy").mockResolvedValue(strategyFixture);
  vi.spyOn(apiModule, "loadStrategyVersions").mockResolvedValue([
    strategyFixture.latestVersion!,
  ]);
  vi.spyOn(apiModule, "loadUniverses").mockResolvedValue([
    {
      id: "universe-1",
      name: "KR Core",
      description: null,
      marketScope: "domestic",
      symbolCount: 1,
      createdAt: "2026-04-01T09:00:00+09:00",
      updatedAt: "2026-04-01T09:00:00+09:00",
    },
  ]);
  vi.spyOn(apiModule, "loadStrategyExecution").mockResolvedValue(executionFixture);
  vi.spyOn(apiModule, "loadStrategyExecutionRuns").mockResolvedValue([]);
  vi.spyOn(apiModule, "loadStrategySignals").mockResolvedValue([]);
  vi.spyOn(apiModule, "loadStrategyOrderCandidates").mockResolvedValue([]);
  vi.spyOn(apiModule, "loadStrategyRisk").mockResolvedValue(riskFixture);
  vi.spyOn(apiModule, "loadStrategyRiskEvents").mockResolvedValue([]);
  vi.spyOn(apiModule, "loadStrategyFills").mockResolvedValue([]);
  vi.spyOn(apiModule, "loadStrategyPositions").mockResolvedValue([]);
}

describe("StrategyDetailPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockBaseLoaders();
  });

  it("renders empty order request state when aggregate response is empty", async () => {
    vi.spyOn(apiModule, "loadStrategyOrderRequestsWithEvents").mockResolvedValue([]);

    render(
      await StrategyDetailPage({
        params: Promise.resolve({ strategyId: "strategy-1" }),
      }),
    );

    expect(screen.getByText("주문 요청이 아직 없습니다.")).toBeInTheDocument();
  });

  it("renders aggregated order request history for 10 items", async () => {
    vi.spyOn(apiModule, "loadStrategyOrderRequestsWithEvents").mockResolvedValue(
      Array.from({ length: 10 }, (_, index) => orderRequestWithEvents(index + 1)),
    );

    render(
      await StrategyDetailPage({
        params: Promise.resolve({ strategyId: "strategy-1" }),
      }),
    );

    expect(screen.getByText("AAA001 / buy")).toBeInTheDocument();
    expect(screen.getByText("AAA010 / buy")).toBeInTheDocument();
  });

  it("renders aggregated order request history for 100 items", async () => {
    vi.spyOn(apiModule, "loadStrategyOrderRequestsWithEvents").mockResolvedValue(
      Array.from({ length: 100 }, (_, index) => orderRequestWithEvents(index + 1)),
    );

    render(
      await StrategyDetailPage({
        params: Promise.resolve({ strategyId: "strategy-1" }),
      }),
    );

    expect(screen.getByText("AAA001 / buy")).toBeInTheDocument();
    expect(screen.getByText("AAA100 / buy")).toBeInTheDocument();
  });

  it("falls back to empty order request state when aggregate loader fails", async () => {
    vi.spyOn(apiModule, "loadStrategyOrderRequestsWithEvents").mockRejectedValue(
      new Error("aggregate failed"),
    );

    render(
      await StrategyDetailPage({
        params: Promise.resolve({ strategyId: "strategy-1" }),
      }),
    );

    expect(screen.getByText("주문 요청이 아직 없습니다.")).toBeInTheDocument();
  });
});
