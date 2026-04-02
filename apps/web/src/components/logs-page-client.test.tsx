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
  it("should_render_event_in_timeline_when_events_exist", () => {
    render(<LogsPageClient events={[eventFixture]} />);

    expect(screen.getByText("주문이 요청되었습니다")).toBeInTheDocument();
    expect(screen.getByText("order")).toBeInTheDocument();
    expect(screen.getByText("info")).toBeInTheDocument();
  });

  it("should_render_category_filter_buttons_when_rendered", () => {
    render(<LogsPageClient events={[]} />);

    expect(screen.getByRole("button", { name: "실행" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "시그널" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "주문" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "리스크" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "브로커" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "시스템" })).toBeInTheDocument();
  });

  it("should_show_empty_event_message_when_no_events", () => {
    render(<LogsPageClient events={[]} />);

    expect(screen.getByText("이벤트가 없습니다")).toBeInTheDocument();
  });

  it("should_show_error_count_chip_when_error_events_exist", () => {
    render(<LogsPageClient events={[eventFixture, errorEventFixture]} />);

    expect(screen.getByText("1 errors")).toBeInTheDocument();
  });

  it("should_render_total_event_count_chip", () => {
    render(<LogsPageClient events={[eventFixture, errorEventFixture]} />);

    expect(screen.getByText("2 events")).toBeInTheDocument();
  });
});
