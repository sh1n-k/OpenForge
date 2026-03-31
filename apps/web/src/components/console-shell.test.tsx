import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConsoleShell } from "@/components/console-shell";

describe("ConsoleShell", () => {
  it("shows degraded styling inputs when database status is not up", () => {
    render(
      <ConsoleShell
        environment="local"
        mode="paper"
        health={{
          status: "DOWN",
          appName: "OpenForge API",
          version: "0.0.1-SNAPSHOT",
          timestamp: "2026-03-31T22:30:00+09:00",
          database: {
            status: "DOWN",
            product: "PostgreSQL",
          },
          environment: "local",
          mode: "paper",
        }}
      />,
    );

    expect(screen.getAllByText("DOWN")).toHaveLength(2);
    expect(screen.getByText("Remote access: document first, no public ingress")).toBeInTheDocument();
  });
});

