import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StrategyListView } from "@/components/strategy-list-view";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("StrategyListView", () => {
  it("renders empty state", () => {
    render(<StrategyListView strategies={[]} />);

    expect(screen.getByText("저장된 전략이 없습니다")).toBeInTheDocument();
  });

  it("renders strategy cards", () => {
    render(
      <StrategyListView
        strategies={[
          {
            id: "s-1",
            name: "Momentum KR",
            description: "Korean momentum draft",
            strategyType: "builder",
            status: "draft",
            latestVersionId: "v-1",
            latestVersionNumber: 2,
            versionCount: 2,
            universeCount: 1,
            updatedAt: "2026-03-31T22:30:00+09:00",
          },
        ]}
      />,
    );

    expect(screen.getByText("Momentum KR")).toBeInTheDocument();
    expect(screen.getByText("Korean momentum draft")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText("초안")).toBeInTheDocument();
  });
});
