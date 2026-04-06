import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UniverseDetailView } from "@/components/universe-detail-view";

describe("UniverseDetailView", () => {
  it("renders linked summary and symbols", () => {
    render(
      <UniverseDetailView
        universe={{
          id: "u-1",
          name: "Semis KR",
          description: "Korean semiconductor basket",
          marketScope: "domestic",
          symbolCount: 2,
          strategyCount: 1,
          symbols: [
            {
              symbol: "005930",
              market: "domestic",
              exchange: "kospi",
              displayName: "삼성전자",
              sortOrder: 0,
            },
            {
              symbol: "000660",
              market: "domestic",
              exchange: "kospi",
              displayName: "SK하이닉스",
              sortOrder: 1,
            },
          ],
          createdAt: "2026-03-31T22:30:00+09:00",
          updatedAt: "2026-03-31T22:30:00+09:00",
        }}
      />,
    );

    expect(screen.getByText("Semis KR")).toBeInTheDocument();
    expect(screen.getAllByText("국내").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        (_, element) => element?.textContent?.includes("2개 종목") ?? false,
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("삼성전자")).toBeInTheDocument();
    expect(screen.getByText("SK하이닉스")).toBeInTheDocument();
    expect(screen.getAllByText(/kospi/).length).toBeGreaterThan(0);
  });
});
