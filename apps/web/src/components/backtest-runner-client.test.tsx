import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BacktestRunnerClient } from "@/components/backtest-runner-client";
import * as apiModule from "@/lib/api";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

describe("BacktestRunnerClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    refresh.mockReset();
  });

  it("keeps run button disabled when coverage is missing", async () => {
    vi.spyOn(apiModule, "loadMarketCoverage").mockResolvedValue({
      covered: false,
      symbols: [
        {
          symbol: "AAA",
          covered: false,
          firstDate: null,
          lastDate: null,
        },
      ],
    });

    render(
      <BacktestRunnerClient
        strategy={strategyFixture}
        versions={versionsFixture}
        linkedUniverses={[linkedUniverseFixture]}
        runs={[]}
      />,
    );

    await waitFor(() => {
      expect(apiModule.loadMarketCoverage).toHaveBeenCalled();
    });

    expect(
      screen.getByRole("button", {
        name: "백테스트 실행",
      }),
    ).toBeDisabled();
  });
});

const strategyFixture: apiModule.StrategyDetail = {
  id: "strategy-1",
  name: "Backtest Draft",
  description: "draft",
  strategyType: "builder",
  status: "draft",
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

const linkedUniverseFixture: apiModule.UniverseDetail = {
  id: "universe-1",
  name: "KR Core",
  description: null,
  symbolCount: 1,
  strategyCount: 1,
  symbols: [
    {
      symbol: "AAA",
      market: "domestic",
      displayName: "AAA",
      sortOrder: 0,
    },
  ],
  createdAt: "2026-03-31T22:30:00+09:00",
  updatedAt: "2026-03-31T22:30:00+09:00",
};
