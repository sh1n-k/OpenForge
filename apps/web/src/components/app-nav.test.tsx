import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppNav } from "@/components/app-nav";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

describe("AppNav", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("marks the current primary route on docs screens", () => {
    render(
      <AppNav
        pathname="/strategies"
        mode="docs"
      />,
    );

    expect(screen.getByRole("link", { name: /Strategies/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("filters page sections with local search on docs screens", () => {
    render(
      <AppNav
        pathname="/settings"
        mode="docs"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("섹션 또는 페이지 검색"), {
      target: { value: "브로커" },
    });

    expect(screen.getByText("브로커 연결")).toBeInTheDocument();
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });

  it("opens the command palette with the keyboard shortcut", () => {
    render(
      <AppNav
        pathname="/strategies/strategy-1/edit"
        mode="workbench"
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
        mode="docs"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "메뉴" }));
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("button", { name: "닫기" })).not.toBeInTheDocument();
  });

  it("shows compact workbench chrome and can navigate from the palette", () => {
    render(
      <AppNav
        pathname="/strategies/strategy-1/backtest"
        mode="workbench"
      />,
    );

    expect(screen.getByText("Workbench")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "탐색" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /검색/i }));
    fireEvent.click(screen.getByRole("option", { name: /Strategy Editor/ }));

    expect(push).toHaveBeenCalledWith("/strategies/strategy-1/edit");
  });
});
