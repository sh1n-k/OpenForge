import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./client";

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns undefined for a successful empty response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("", {
          status: 200,
        }),
      ),
    );

    await expect(apiFetch<void>("/api/v1/strategies/archived", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("parses JSON response bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(apiFetch<{ ok: boolean }>("/api/v1/example")).resolves.toEqual({ ok: true });
  });
});
