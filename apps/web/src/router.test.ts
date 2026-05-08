import { describe, expect, it } from "vitest";
import { parseRoute } from "./router";

describe("parseRoute", () => {
  it("maps primary routes", () => {
    expect(parseRoute("/")).toEqual({ name: "dashboard" });
    expect(parseRoute("/strategies")).toEqual({ name: "strategies" });
    expect(parseRoute("/broker/ledger")).toEqual({ name: "broker-ledger" });
  });

  it("extracts route params", () => {
    expect(parseRoute("/strategies/strategy-1")).toEqual({
      name: "strategy-detail",
      strategyId: "strategy-1",
    });
    expect(parseRoute("/strategies/strategy-1/edit")).toEqual({
      name: "strategy-edit",
      strategyId: "strategy-1",
    });
    expect(parseRoute("/backtests/run-1")).toEqual({
      name: "backtest-result",
      runId: "run-1",
    });
  });

  it("returns not-found for unsupported paths", () => {
    expect(parseRoute("/unknown")).toEqual({ name: "not-found" });
  });
});
