import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import * as healthModule from "@/lib/health";

describe("Home page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the console shell with API status", async () => {
    vi.spyOn(healthModule, "loadHealthStatus").mockResolvedValue({
      status: "UP",
      appName: "OpenForge API",
      version: "0.0.1-SNAPSHOT",
      timestamp: "2026-03-31T22:30:00+09:00",
      database: {
        status: "UP",
        product: "PostgreSQL",
      },
      environment: "local",
      mode: "paper",
    });

    render(await Home());

    expect(
      screen.getByRole("heading", {
        name: "개인 자동매매 운영 콘솔의 1단계 부트스트랩",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("OpenForge API")).toBeInTheDocument();
    expect(screen.getByText("paper")).toBeInTheDocument();
  });
});

