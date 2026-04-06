import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UniversesPageClient } from "@/components/universes-page-client";
import * as apiModule from "@/lib/api";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

describe("UniversesPageClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    refresh.mockReset();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("filters by market tab and creates a universe with the selected market", async () => {
    const createUniverseSpy = vi.spyOn(apiModule, "createUniverse").mockResolvedValue({
      id: "created",
      name: "US Growth",
      description: "US market basket",
      marketScope: "us",
      symbolCount: 0,
      strategyCount: 0,
      symbols: [],
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: "2026-04-01T00:00:00Z",
    });

    render(<UniversesPageClient universes={universesFixture} />);
    const listTablist = screen.getByRole("tablist", { name: "유니버스 시장 탭" });
    const createTablist = screen.getByRole("tablist", { name: "생성 시장 선택" });

    expect(screen.getByText("KR Core")).toBeInTheDocument();
    expect(screen.queryByText("US Core")).not.toBeInTheDocument();

    fireEvent.click(within(listTablist).getByRole("tab", { name: /^미국 시장/ }));

    expect(screen.getByText("US Core")).toBeInTheDocument();
    expect(screen.queryByText("KR Core")).not.toBeInTheDocument();

    fireEvent.click(within(createTablist).getByRole("tab", { name: "미국 시장" }));
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "US Growth" } });
    fireEvent.change(screen.getByLabelText("설명 (선택)"), {
      target: { value: "US market basket" },
    });
    fireEvent.click(screen.getByRole("button", { name: "유니버스 생성" }));

    await waitFor(() => {
      expect(createUniverseSpy).toHaveBeenCalledWith({
        name: "US Growth",
        description: "US market basket",
        marketScope: "us",
      });
    });
  });

  it("presets create form market and focuses name input from empty state CTA", () => {
    render(
      <UniversesPageClient
        universes={universesFixture.filter((universe) => universe.marketScope === "domestic")}
      />,
    );
    const listTablist = screen.getByRole("tablist", { name: "유니버스 시장 탭" });
    const createTablist = screen.getByRole("tablist", { name: "생성 시장 선택" });

    fireEvent.click(within(listTablist).getByRole("tab", { name: /^미국 시장/ }));
    fireEvent.click(screen.getByRole("button", { name: "미국 유니버스 생성" }));

    expect(within(createTablist).getByRole("tab", { name: "미국 시장" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText("이름")).toHaveFocus();
  });
});

const universesFixture: apiModule.UniverseSummary[] = [
  {
    id: "u-kr",
    name: "KR Core",
    description: "Domestic basket",
    marketScope: "domestic",
    symbolCount: 2,
    strategyCount: 1,
    updatedAt: "2026-04-01T00:00:00Z",
  },
  {
    id: "u-us",
    name: "US Core",
    description: "US basket",
    marketScope: "us",
    symbolCount: 3,
    strategyCount: 0,
    updatedAt: "2026-04-01T00:00:00Z",
  },
];
