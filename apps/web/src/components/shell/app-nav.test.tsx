import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppNav } from "@/components/shell/app-nav";
import { systemBrokerStatusUpdatedEvent } from "@/lib/system-status-events";

const push = vi.fn();
const { loadSystemBrokerStatus } = vi.hoisted(() => ({
  loadSystemBrokerStatus: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

vi.mock("@/lib/api", () => ({
  logout: vi.fn().mockResolvedValue(undefined),
  loadSystemBrokerStatus,
}));

describe("AppNav", () => {
  beforeEach(() => {
    push.mockReset();
    loadSystemBrokerStatus.mockReset();
    loadSystemBrokerStatus.mockResolvedValue({
      currentSystemMode: "paper",
      paper: { lastConnectionTestStatus: "success" },
      live: { lastConnectionTestStatus: null },
      isCurrentModeConfigured: true,
    });
  });

  it("marks the current primary route", () => {
    render(
      <AppNav
        pathname="/strategies"
      />,
    );

    expect(screen.getByRole("link", { name: /전략/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks broker as active for broker ledger routes", () => {
    render(
      <AppNav
        pathname="/broker/ledger"
      />,
    );

    const brokerPrimaryLink = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === "/broker");

    expect(brokerPrimaryLink).toBeDefined();
    expect(brokerPrimaryLink).not.toHaveAttribute("aria-current");
  });

  it("renders broker ledger as an inline subnav item on broker pages", () => {
    render(
      <AppNav
        pathname="/broker"
      />,
    );

    const brokerLedgerLink = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === "/broker/ledger");

    expect(brokerLedgerLink).toBeDefined();
    expect(screen.queryByText("현재 작업")).not.toBeInTheDocument();
  });

  it("marks broker ledger subnav item as active on broker ledger route", () => {
    render(
      <AppNav
        pathname="/broker/ledger"
      />,
    );

    const brokerLedgerLink = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === "/broker/ledger");

    expect(brokerLedgerLink).toBeDefined();
    expect(brokerLedgerLink).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("현재 작업")).not.toBeInTheDocument();
  });

  it("filters nav items with local search", () => {
    render(
      <AppNav
        pathname="/"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("페이지 필터"), {
      target: { value: "브로커" },
    });

    expect(screen.getByText("브로커")).toBeInTheDocument();
    expect(screen.queryByText("대시보드")).not.toBeInTheDocument();
  });

  it("opens the command palette with the keyboard shortcut", () => {
    render(
      <AppNav
        pathname="/strategies/strategy-1/edit"
      />,
    );

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    expect(screen.getByRole("dialog", { name: "명령 팔레트" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("페이지, 작업, 섹션 검색")).toHaveFocus();
  });

  it("opens and closes the docs mobile drawer", () => {
    render(
      <AppNav
        pathname="/"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "메뉴" }));
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("button", { name: "닫기" })).not.toBeInTheDocument();
  });

  it("shows context commands in sidebar for strategy pages and navigates from the palette", () => {
    render(
      <AppNav
        pathname="/strategies/strategy-1/backtest"
      />,
    );

    // Context commands should appear in the sidebar
    expect(screen.getByText("전략 상세")).toBeInTheDocument();
    expect(screen.getByText("전략 편집")).toBeInTheDocument();
    expect(screen.getByText("백테스트 실행")).toBeInTheDocument();

    // Navigate via command palette
    fireEvent.click(screen.getByRole("button", { name: /빠른 이동/i }));
    fireEvent.click(screen.getByRole("option", { name: /전략 편집/ }));

    expect(push).toHaveBeenCalledWith("/strategies/strategy-1/edit");
  });

  it("renders grouped nav sections", () => {
    render(
      <AppNav
        pathname="/"
      />,
    );

    expect(screen.getByText("개요")).toBeInTheDocument();
    expect(screen.getByText("전략 관리")).toBeInTheDocument();
    expect(screen.getByText("운영")).toBeInTheDocument();
  });

  it("renders Settings in the footer", () => {
    render(
      <AppNav
        pathname="/settings"
      />,
    );

    const settingsLink = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === "/settings");

    expect(settingsLink).toBeDefined();
  });

  it("reloads broker status after a system status update event", async () => {
    render(
      <AppNav
        pathname="/settings"
      />,
    );

    await waitFor(() => {
      expect(loadSystemBrokerStatus).toHaveBeenCalledTimes(1);
    });

    window.dispatchEvent(new CustomEvent(systemBrokerStatusUpdatedEvent));

    await waitFor(() => {
      expect(loadSystemBrokerStatus).toHaveBeenCalledTimes(2);
    });
  });
});
