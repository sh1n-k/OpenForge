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
      />,
    );

    expect(screen.getByText("자동 실행 설정")).toBeInTheDocument();
    expect(screen.getAllByText("paper").length).toBeGreaterThan(0);
    expect(screen.getByText("최근 실행 로그")).toBeInTheDocument();
    expect(screen.getByText("최근 시그널 이력")).toBeInTheDocument();

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
