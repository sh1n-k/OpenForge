import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrategyDetailClient } from "@/components/strategy-detail-client";
import * as apiModule from "@/lib/api";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

describe("StrategyDetailClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    refresh.mockReset();
  });

  it("renders execution history and saves execution settings", async () => {
    const updateExecution = vi
      .spyOn(apiModule, "updateStrategyExecution")
      .mockResolvedValue(executionFixture);

    render(
      <StrategyDetailClient
        strategy={strategyFixture}
        versions={versionsFixture}
        universes={universesFixture}
        execution={executionFixture}
        runs={runsFixture}
        signals={signalsFixture}
        orderCandidates={orderCandidatesFixture}
        orderRequests={orderRequestsFixture}
        fills={fillsFixture}
        positions={positionsFixture}
        statusEventsByRequestId={statusEventsByRequestIdFixture}
      />,
    );

    expect(screen.getByText("자동 실행 설정")).toBeInTheDocument();
    expect(screen.getAllByText("paper").length).toBeGreaterThan(0);
    expect(screen.getByText("최근 실행 로그")).toBeInTheDocument();
    expect(screen.getByText("최근 시그널 이력")).toBeInTheDocument();
    expect(screen.getByText("체결 이력")).toBeInTheDocument();
    expect(screen.getByText("현재 포지션")).toBeInTheDocument();
    expect(screen.getByText(/current partially_filled/)).toBeInTheDocument();
    expect(
      screen.getAllByText((_, element) =>
        element?.textContent?.includes("filled 1 / 2 / remaining 1") ?? false,
      ),
    ).not.toHaveLength(0);
    expect(screen.getByText("accepted")).toBeInTheDocument();

    const scheduleInput = screen.getByLabelText("실행 시각");
    expect(scheduleInput).toHaveValue("09:30");

    fireEvent.change(scheduleInput, { target: { value: "10:15" } });
    fireEvent.click(screen.getByRole("button", { name: "자동 실행 저장" }));

    await waitFor(() => {
      expect(updateExecution).toHaveBeenCalledWith("strategy-1", {
        enabled: true,
        scheduleTime: "10:15",
      });
    });
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("renders order candidates and creates a paper order request", async () => {
    const createOrderRequest = vi
      .spyOn(apiModule, "createOrderRequest")
      .mockResolvedValue(orderRequestFixture);

    render(
      <StrategyDetailClient
        strategy={strategyFixture}
        versions={versionsFixture}
        universes={universesFixture}
        execution={executionFixture}
        runs={runsFixture}
        signals={signalsFixture}
        orderCandidates={orderCandidatesFixture}
        orderRequests={orderRequestsFixture}
        fills={fillsFixture}
        positions={positionsFixture}
        statusEventsByRequestId={statusEventsByRequestIdFixture}
      />,
    );

    expect(screen.getByText("주문 후보")).toBeInTheDocument();
    expect(screen.getByText("주문 요청 이력")).toBeInTheDocument();
    expect(screen.getAllByText("AAA / buy").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("requested").length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", {
        name: "paper 주문 생성",
      }),
    );

    await waitFor(() => {
      expect(createOrderRequest).toHaveBeenCalledWith("strategy-1", {
        signalEventId: "signal-1",
        mode: "paper",
      });
    });
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("registers a manual fill for an order request", async () => {
    const createOrderFill = vi
      .spyOn(apiModule, "createOrderFill")
      .mockResolvedValue(undefined);

    render(
      <StrategyDetailClient
        strategy={strategyFixture}
        versions={versionsFixture}
        universes={universesFixture}
        execution={executionFixture}
        runs={runsFixture}
        signals={signalsFixture}
        orderCandidates={orderCandidatesFixture}
        orderRequests={orderRequestsFixture}
        fills={fillsFixture}
        positions={positionsFixture}
        statusEventsByRequestId={statusEventsByRequestIdFixture}
      />,
    );

    fireEvent.change(screen.getByLabelText("체결 수량"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("체결 가격"), {
      target: { value: "124.25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "체결 등록" }));

    await waitFor(() => {
      expect(createOrderFill).toHaveBeenCalledWith("strategy-1", "order-1", {
        quantity: 1,
        price: 124.25,
        filledAt: expect.any(String),
      });
    });
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("disables order creation when precheck fails", () => {
    render(
      <StrategyDetailClient
        strategy={strategyFixture}
        versions={versionsFixture}
        universes={universesFixture}
        execution={executionFixture}
        runs={runsFixture}
        signals={signalsFixture}
        orderCandidates={[
          {
            ...orderCandidatesFixture[0],
            alreadyRequested: true,
            precheck: {
              ...orderCandidatesFixture[0].precheck,
              passed: false,
              duplicateOrder: true,
              reasonCodes: ["duplicate_order"],
            },
          },
        ]}
        orderRequests={[]}
        fills={[]}
        positions={[]}
        statusEventsByRequestId={{}}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "paper 주문 생성",
      }),
    ).toBeDisabled();
  });
});

const strategyFixture: apiModule.StrategyDetail = {
  id: "strategy-1",
  name: "Paper Strategy",
  description: "paper draft",
  strategyType: "builder",
  status: "backtest_completed",
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
    changeSummary: "initial",
    createdAt: "2026-03-31T22:30:00+09:00",
  },
  universes: [{ id: "universe-1", name: "KR Core", description: null }],
  createdAt: "2026-03-31T22:30:00+09:00",
  updatedAt: "2026-03-31T22:30:00+09:00",
};

const versionsFixture: apiModule.StrategyVersion[] = [
  {
    id: "version-1",
    versionNumber: 1,
    payloadFormat: "builder_json",
    payload: {},
    validationStatus: "valid",
    validationErrors: [],
    validationWarnings: [],
    changeSummary: "initial",
    createdAt: "2026-03-31T22:30:00+09:00",
  },
];

const universesFixture: apiModule.UniverseSummary[] = [
  {
    id: "universe-1",
    name: "KR Core",
    description: null,
    symbolCount: 1,
    strategyCount: 1,
    updatedAt: "2026-03-31T22:30:00+09:00",
  },
];

const executionFixture: apiModule.StrategyExecutionResponse = {
  mode: "paper",
  enabled: true,
  scheduleTime: "09:30",
  timezone: "Asia/Seoul",
  strategyStatus: "running",
  lastRun: {
    runId: "run-1",
    status: "completed",
    scheduledDate: "2026-04-01",
    startedAt: "2026-04-01T09:30:00+09:00",
    completedAt: "2026-04-01T09:31:00+09:00",
    signalCount: 2,
    errorMessage: null,
  },
  nextRunAt: "2026-04-02T09:30:00+09:00",
};

const runsFixture: apiModule.StrategyExecutionRun[] = [
  {
    runId: "run-1",
    status: "completed",
    triggerType: "scheduled",
    scheduledDate: "2026-04-01",
    startedAt: "2026-04-01T09:30:00+09:00",
    completedAt: "2026-04-01T09:31:00+09:00",
    symbolCount: 1,
    signalCount: 2,
    errorMessage: null,
    strategyVersionId: "version-1",
  },
];

const signalsFixture: apiModule.StrategySignalEvent[] = [
  {
    id: "signal-1",
    runId: "run-1",
    strategyVersionId: "version-1",
    symbol: "AAA",
    signalType: "entry",
    tradingDate: "2026-04-01",
    createdAt: "2026-04-01T09:30:05+09:00",
    payload: {
      reason: "cross_above",
    },
  },
];

const orderCandidatesFixture: apiModule.OrderCandidate[] = [
  {
    signalEventId: "signal-1",
    executionRunId: "run-1",
    strategyVersionId: "version-1",
    symbol: "AAA",
    side: "buy",
    quantity: 2,
    price: 123.45,
    tradingDate: "2026-04-01",
    mode: "paper",
    alreadyRequested: false,
    precheck: {
      passed: true,
      marketHours: true,
      strategyStatus: true,
      duplicateOrder: false,
      quantityValid: true,
      priceValid: true,
      reasonCodes: [],
    },
  },
];

const orderRequestsFixture: apiModule.OrderRequest[] = [
  {
    id: "order-1",
    signalEventId: "signal-1",
    symbol: "AAA",
    side: "buy",
    quantity: 2,
    price: 123.45,
    mode: "paper",
    status: "requested",
    currentStatus: "partially_filled",
    filledQuantity: 1,
    remainingQuantity: 1,
    precheckPassed: true,
    failureReason: null,
    requestedAt: "2026-04-01T09:31:00+09:00",
  },
];

const orderRequestFixture: apiModule.OrderRequest = {
  ...orderRequestsFixture[0],
  id: "order-2",
  requestedAt: "2026-04-01T09:32:00+09:00",
};

const statusEventsByRequestIdFixture: Record<string, apiModule.OrderStatusEvent[]> = {
  "order-1": [
    {
      id: "status-1",
      orderRequestId: "order-1",
      status: "requested",
      reason: null,
      occurredAt: "2026-04-01T09:31:00+09:00",
      payload: {},
    },
    {
      id: "status-2",
      orderRequestId: "order-1",
      status: "accepted",
      reason: "paper fill received",
      occurredAt: "2026-04-01T09:31:30+09:00",
      payload: {
        source: "paper_manual",
      },
    },
  ],
};

const fillsFixture: apiModule.OrderFill[] = [
  {
    id: "fill-1",
    orderRequestId: "order-1",
    symbol: "AAA",
    side: "buy",
    quantity: 1,
    price: 123.45,
    filledAt: "2026-04-01T09:31:30+09:00",
    source: "paper_manual",
  },
];

const positionsFixture: apiModule.StrategyPosition[] = [
  {
    symbol: "AAA",
    netQuantity: 1,
    avgEntryPrice: 123.45,
    lastFillAt: "2026-04-01T09:31:30+09:00",
  },
];
