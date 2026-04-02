import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

    expect(screen.getByText("KR Core")).toBeInTheDocument();
    expect(screen.queryByText("US Core")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /미국/ }));

    expect(screen.getByText("US Core")).toBeInTheDocument();
    expect(screen.queryByText("KR Core")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "US Growth" } });
    fireEvent.change(screen.getByLabelText("설명 (선택)"), {
      target: { value: "US market basket" },
    });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "us" } });
    fireEvent.click(screen.getByRole("button", { name: "유니버스 생성" }));

    await waitFor(() => {
      expect(createUniverseSpy).toHaveBeenCalledWith({
        name: "US Growth",
        description: "US market basket",
        marketScope: "us",
      });
    });
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
