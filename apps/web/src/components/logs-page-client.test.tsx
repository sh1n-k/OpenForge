import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LogsPageClient } from "@/components/logs-page-client";
import type { ActivityEvent } from "@/lib/api";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const eventFixture: ActivityEvent = {
  id: "e1",
  category: "order",
  strategyId: "s1",
  strategyName: "Alpha Strategy",
  summary: "주문이 요청되었습니다",
  severity: "info",
  occurredAt: "2026-04-01T09:30:00+09:00",
};

const errorEventFixture: ActivityEvent = {
  id: "e2",
  category: "risk",
  strategyId: null,
  strategyName: null,
  summary: "리스크 한도 초과",
  severity: "error",
  occurredAt: "2026-04-01T09:35:00+09:00",
};

describe("LogsPageClient", () => {
  it("renders event with korean labels", () => {
    render(<LogsPageClient events={[eventFixture]} />);

    expect(screen.getByText("주문이 요청되었습니다")).toBeInTheDocument();
    expect(screen.getAllByText("주문").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("정보").length).toBeGreaterThanOrEqual(1);
  });

  it("renders category and severity filter selects", () => {
    render(<LogsPageClient events={[]} />);

    expect(screen.getByRole("combobox", { name: "카테고리" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "심각도" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "실행" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "시그널" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "리스크" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "브로커" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "시스템" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "오류" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "경고" })).toBeInTheDocument();
  });

  it("shows empty message when no events", () => {
    render(<LogsPageClient events={[]} />);

    expect(screen.getByText("기록된 이벤트가 없습니다")).toBeInTheDocument();
  });

  it("shows error count in metric card", () => {
    render(<LogsPageClient events={[eventFixture, errorEventFixture]} />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows strategy link for events with strategyId", () => {
    render(<LogsPageClient events={[eventFixture]} />);

    expect(screen.getByText("Alpha Strategy")).toBeInTheDocument();
  });
});
