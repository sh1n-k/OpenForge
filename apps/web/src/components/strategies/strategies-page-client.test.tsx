import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrategiesPageClient } from "@/components/strategies/strategies-page-client";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("StrategiesPageClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    refresh.mockReset();
  });

  it("renders strategy registry page with empty state", () => {
    render(<StrategiesPageClient strategies={[]} />);

    expect(screen.getByText("전략 레지스트리")).toBeInTheDocument();
    expect(screen.getByText("저장된 전략이 없습니다")).toBeInTheDocument();
  });

  it("renders creation form with name and type fields", () => {
    render(<StrategiesPageClient strategies={[]} />);

    expect(screen.getByRole("button", { name: "전략 생성" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("예: SMA 골든크로스")).toBeInTheDocument();
    expect(screen.getByText("빌더형")).toBeInTheDocument();
    expect(screen.getByText("코드형")).toBeInTheDocument();
  });
});
