export type AppRoute =
  | { name: "dashboard" }
  | { name: "login" }
  | { name: "strategies" }
  | { name: "strategy-detail"; strategyId: string }
  | { name: "strategy-edit"; strategyId: string }
  | { name: "strategy-backtest"; strategyId: string }
  | { name: "backtest-result"; runId: string }
  | { name: "universes" }
  | { name: "universe-detail"; universeId: string }
  | { name: "broker" }
  | { name: "broker-ledger" }
  | { name: "orders" }
  | { name: "positions" }
  | { name: "logs" }
  | { name: "settings" }
  | { name: "not-found" };

export function parseRoute(path: string): AppRoute {
  if (path === "/") return { name: "dashboard" };
  if (path === "/login") return { name: "login" };
  if (path === "/strategies") return { name: "strategies" };
  const strategyMatch = path.match(/^\/strategies\/([^/]+)(?:\/(edit|backtest))?$/);
  if (strategyMatch?.[2] === "edit") {
    return { name: "strategy-edit", strategyId: strategyMatch[1] };
  }
  if (strategyMatch?.[2] === "backtest") {
    return { name: "strategy-backtest", strategyId: strategyMatch[1] };
  }
  if (strategyMatch) return { name: "strategy-detail", strategyId: strategyMatch[1] };
  const runMatch = path.match(/^\/backtests\/([^/]+)$/);
  if (runMatch) return { name: "backtest-result", runId: runMatch[1] };
  if (path === "/universes") return { name: "universes" };
  const universeMatch = path.match(/^\/universes\/([^/]+)$/);
  if (universeMatch) return { name: "universe-detail", universeId: universeMatch[1] };
  if (path === "/broker") return { name: "broker" };
  if (path === "/broker/ledger") return { name: "broker-ledger" };
  if (path === "/orders") return { name: "orders" };
  if (path === "/positions") return { name: "positions" };
  if (path === "/logs") return { name: "logs" };
  if (path === "/settings") return { name: "settings" };
  return { name: "not-found" };
}
