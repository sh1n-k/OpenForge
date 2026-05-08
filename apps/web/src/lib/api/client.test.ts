import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./client";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

describe("apiFetch", () => {
  it("returns undefined for 204 responses", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiFetch<void>("/api/empty")).resolves.toBeUndefined();
  });

  it("returns undefined for empty successful responses", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 200 }));

    await expect(apiFetch<void>("/api/empty-ok")).resolves.toBeUndefined();
  });

  it("parses successful json responses", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(apiFetch<{ ok: boolean }>("/api/ok")).resolves.toEqual({
      ok: true,
    });
  });
});
