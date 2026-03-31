import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BacktestResultClient } from "@/components/backtest-result-client";
import * as apiModule from "@/lib/api";

describe("BacktestResultClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("polls until a queued run becomes completed", async () => {
    vi.spyOn(apiModule, "loadBacktest").mockResolvedValue({
      ...runFixture,
      status: "completed",
      summary: {
        totalReturnRate: 0.12,
        maxDrawdownRate: 0.05,
        winRate: 0.6,
        tradeCount: 3,
        averagePnl: 12345,
        profitFactor: 1.8,
      },
    });

    render(<BacktestResultClient initialRun={runFixture} />);

    await waitFor(() => {
      expect(apiModule.loadBacktest).toHaveBeenCalledWith("run-1");
    });

    await waitFor(() => {
      expect(screen.getByText("12.00%")).toBeInTheDocument();
    });
  });
});

const runFixture: apiModule.BacktestRunDetail = {
  runId: "run-1",
  strategyId: "strategy-1",
  strategyVersionId: "version-1",
  status: "queued",
  requestedAt: "2026-03-31T22:30:00+09:00",
  startedAt: null,
  completedAt: null,
  config: {
    startDate: "2026-01-01",
    endDate: "2026-03-31",
  },
  symbols: ["AAA"],
  summary: null,
  equityCurve: [],
  trades: [],
  errorMessage: null,
};
