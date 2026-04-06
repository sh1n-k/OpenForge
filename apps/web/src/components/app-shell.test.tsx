import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/app-shell";

const usePathname = vi.fn();
const appNavMock = vi.fn();
const pageTocMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

vi.mock("@/components/app-nav", () => ({
  AppNav: ({ pathname }: { pathname: string }) => {
    appNavMock(pathname);
    return <div data-testid="app-nav">{pathname}</div>;
  },
}));

vi.mock("@/components/page-toc", () => ({
  PageToc: ({ sections }: { sections: Array<{ id: string; label: string }> }) => {
    pageTocMock(sections);
    return <div data-testid="page-toc">{sections.map((section) => section.label).join(",")}</div>;
  },
}));

describe("AppShell", () => {
  beforeEach(() => {
    usePathname.mockReset();
    appNavMock.mockReset();
    pageTocMock.mockReset();
  });

  it("shows toc for docs routes with enough sections", () => {
    usePathname.mockReturnValue("/");

    const { container } = render(
      <AppShell>
        <div>dashboard</div>
      </AppShell>,
    );

    expect(container.querySelector(".app-shell-docs")).toBeInTheDocument();
    expect(container.querySelector(".app-main-with-toc")).toBeInTheDocument();
    expect(screen.getByTestId("page-toc")).toBeInTheDocument();
    expect(appNavMock).toHaveBeenCalledWith("/");
  });

  it("hides toc for workbench routes and applies workbench layout class", () => {
    usePathname.mockReturnValue("/strategies/strategy-1/edit");

    const { container } = render(
      <AppShell>
        <div>editor</div>
      </AppShell>,
    );

    expect(container.querySelector(".app-shell-workbench")).toBeInTheDocument();
    expect(container.querySelector(".app-main-workbench")).toBeInTheDocument();
    expect(screen.queryByTestId("page-toc")).not.toBeInTheDocument();
    expect(pageTocMock).not.toHaveBeenCalled();
  });

  it("renders login without the navigation shell", () => {
    usePathname.mockReturnValue("/login");

    const { container } = render(
      <AppShell>
        <div>login form</div>
      </AppShell>,
    );

    expect(container.querySelector(".app-shell")).not.toBeInTheDocument();
    expect(screen.getByText("login form")).toBeInTheDocument();
    expect(appNavMock).not.toHaveBeenCalled();
  });
});
