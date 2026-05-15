import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import DataTable from "./DataTable.svelte";

describe("DataTable", () => {
  it("renders row values and first-column link", () => {
    render(DataTable, {
      props: {
        title: "Strategies",
        rows: [{ id: "s1", name: "Mean Reversion", active: true }],
        columns: ["name", "active"],
        linkPrefix: "/strategies",
        linkKey: "id",
      },
    });

    const link = screen.getByRole("link", { name: "Mean Reversion" });
    expect(screen.getByRole("heading", { name: "Strategies" })).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/strategies/s1");
    expect(screen.getByText("예")).toBeTruthy();
  });

  it("invokes row actions", async () => {
    const action = vi.fn();
    render(DataTable, {
      props: {
        title: "Rows",
        rows: [{ id: "r1", name: "Row 1" }],
        columns: ["name"],
        actionLabel: "Run",
        action,
      },
    });

    await fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(action).toHaveBeenCalledWith({ id: "r1", name: "Row 1" });
  });
});
