import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrategiesPageClient } from "@/components/strategies-page-client";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh,
  }),
}));

describe("StrategiesPageClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    refresh.mockReset();
  });

  it("renders strategy registry page with strategy count", () => {
    render(<StrategiesPageClient strategies={[]} />);

    expect(screen.getByText("Strategy Registry")).toBeInTheDocument();
    expect(screen.getByText("0 strategies")).toBeInTheDocument();
  });
});
