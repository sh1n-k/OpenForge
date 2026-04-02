import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UniverseDetailClient } from "@/components/universe-detail-client";
import * as apiModule from "@/lib/api";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

describe("UniverseDetailClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    push.mockReset();
    refresh.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("searches and collects symbols within the selected market scope", async () => {
    const searchSpy = vi.spyOn(apiModule, "searchSymbols").mockResolvedValue({
      query: "AAPL",
      total: 1,
      items: [
        {
          code: "AAPL",
          name: "Apple",
          exchange: "nasdaq",
          marketScope: "us",
        },
      ],
    });
    const collectSpy = vi.spyOn(apiModule, "collectSymbols").mockResolvedValue({
      marketScope: "us",
      success: true,
      totalCount: 1,
      exchangeCounts: [{ exchange: "nasdaq", count: 1 }],
      errors: [],
    });
    vi.spyOn(apiModule, "replaceUniverseSymbols").mockResolvedValue(
      universeFixture,
    );

    render(
      <UniverseDetailClient
        universe={universeFixture}
        symbolMasterStatus={{
          markets: [
            {
              marketScope: "us",
              totalCount: 0,
              collectedAt: null,
              needsUpdate: true,
              exchangeCounts: [],
            },
          ],
        }}
      />,
    );

    expect(screen.getAllByText("미국").length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("티커 또는 이름 (예: AAPL, Apple)"), {
        target: { value: "AAPL" },
      });
      vi.advanceTimersByTime(300);
    });

    expect(searchSpy).toHaveBeenCalledWith("AAPL", "us");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "마스터 최신화" }));
    });

    expect(collectSpy).toHaveBeenCalledWith("us");
  });

  it("stores exchange when saving symbols", async () => {
    const replaceSpy = vi.spyOn(apiModule, "replaceUniverseSymbols").mockResolvedValue(
      universeFixture,
    );

    render(
      <UniverseDetailClient
        universe={universeFixture}
        symbolMasterStatus={{
          markets: [
            {
              marketScope: "us",
              totalCount: 1,
              collectedAt: null,
              needsUpdate: false,
              exchangeCounts: [{ exchange: "nasdaq", count: 1 }],
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "종목 리스트 저장" }));

    expect(replaceSpy).toHaveBeenCalledWith("u-us", [
      {
        symbol: "AAPL",
        exchange: "nasdaq",
        displayName: "Apple",
        market: "us",
        sortOrder: 0,
      },
    ]);
  });
});

const universeFixture: apiModule.UniverseDetail = {
  id: "u-us",
  name: "US Core",
  description: "US basket",
  marketScope: "us",
  symbolCount: 1,
  strategyCount: 0,
  symbols: [
    {
      symbol: "AAPL",
      market: "us",
      exchange: "nasdaq",
      displayName: "Apple",
      sortOrder: 0,
    },
  ],
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
};
