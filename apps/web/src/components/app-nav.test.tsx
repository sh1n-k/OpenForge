import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppNav } from "@/components/app-nav";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

vi.mock("@/lib/api", () => ({
  logout: vi.fn().mockResolvedValue(undefined),
  loadSystemBrokerStatus: vi.fn().mockResolvedValue({
    currentSystemMode: "paper",
    paper: { lastConnectionTestStatus: "success" },
    live: { lastConnectionTestStatus: null },
    isCurrentModeConfigured: true,
  }),
}));

describe("AppNav", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("marks the current primary route", () => {
    render(
      <AppNav
        pathname="/strategies"
      />,
    );

    expect(screen.getByRole("link", { name: /Strategies/ })).toHaveAttribute(
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
    expect(brokerPrimaryLink).toHaveAttribute("aria-current", "page");
  });

  it("filters nav items with local search", () => {
    render(
      <AppNav
        pathname="/"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("섹션 또는 페이지 검색"), {
      target: { value: "Broker" },
    });

    expect(screen.getByText("Broker")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("opens the command palette with the keyboard shortcut", () => {
    render(
      <AppNav
        pathname="/strategies/strategy-1/edit"
      />,
    );

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    expect(screen.getByRole("dialog", { name: "명령 팔레트" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("페이지, 액션, 섹션 검색")).toHaveFocus();
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
    expect(screen.getByText("Strategy Detail")).toBeInTheDocument();
    expect(screen.getByText("Strategy Editor")).toBeInTheDocument();
    expect(screen.getByText("Backtest Runner")).toBeInTheDocument();

    // Navigate via command palette
    fireEvent.click(screen.getByRole("button", { name: /검색/i }));
    fireEvent.click(screen.getByRole("option", { name: /Strategy Editor/ }));

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
});
