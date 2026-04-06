import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PageToc } from "@/components/page-toc";

let intersectionCallback:
  | ((entries: IntersectionObserverEntry[]) => void)
  | undefined;

class IntersectionObserverMock {
  constructor(
    callback: (entries: IntersectionObserverEntry[]) => void,
  ) {
    intersectionCallback = callback;
  }

  observe() {}

  disconnect() {}

  unobserve() {}
}

describe("PageToc", () => {
  beforeEach(() => {
    intersectionCallback = undefined;
    document.body.innerHTML = `
      <section id="overview"></section>
      <section id="details"></section>
      <section id="activity"></section>
    `;
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
  });

  it("marks the first section as current by default", () => {
    render(
      <PageToc
        sections={[
          { id: "overview", label: "개요" },
          { id: "details", label: "상세" },
          { id: "activity", label: "활동" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "개요" })).toHaveAttribute(
      "aria-current",
      "location",
    );
  });

  it("updates the active section when intersection changes", () => {
    render(
      <PageToc
        sections={[
          { id: "overview", label: "개요" },
          { id: "details", label: "상세" },
        ]}
      />,
    );

    const detailsSection = document.getElementById("details");
    expect(detailsSection).not.toBeNull();
    expect(intersectionCallback).toBeTypeOf("function");

    act(() => {
      intersectionCallback?.([
        {
          target: detailsSection!,
          isIntersecting: true,
          intersectionRatio: 0.7,
        } as IntersectionObserverEntry,
      ]);
    });

    expect(screen.getByRole("link", { name: "상세" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    expect(screen.getByRole("link", { name: "개요" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
