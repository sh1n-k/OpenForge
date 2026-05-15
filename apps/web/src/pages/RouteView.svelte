<script lang="ts">
  import {
    loadAllFills,
    loadAllOrders,
    loadAllPositions,
    loadBacktest,
    loadBrokerLedgerBalances,
    loadBrokerLedgerProfits,
    loadBrokerLedgerStatus,
    loadBrokerLedgerSyncRuns,
    loadBrokerLedgerTrades,
    loadDashboard,
    loadStrategies,
    loadStrategy,
    loadStrategyBacktests,
    loadStrategyExecution,
    loadStrategyExecutionRuns,
    loadStrategyOrderCandidates,
    loadStrategyOrderRequestsWithEvents,
    loadStrategyPositions,
    loadStrategyRisk,
    loadStrategyRiskEvents,
    loadStrategySignals,
    loadStrategyVersions,
    loadRebalancePlans,
    loadSystemActivity,
    loadSystemBrokerEvents,
    loadSystemBrokerStatus,
    loadSystemRisk,
    loadSystemRiskEvents,
    loadUniverse,
    loadUniverses,
    type ActivityEvent,
    type BacktestRunDetail,
    type BacktestRunSummary,
    type BrokerConnectionEvent,
    type BrokerLedgerBalance,
    type BrokerLedgerProfit,
    type BrokerLedgerStatus,
    type BrokerLedgerSyncRun,
    type BrokerLedgerTrade,
    type CrossStrategyFill,
    type CrossStrategyOrderRequest,
    type CrossStrategyPosition,
    type DashboardResponse,
    type OrderCandidate,
    type OrderRequest,
    type OrderRequestWithEvents,
    type RebalancePlan,
    type StrategyDetail,
    type StrategyExecutionResponse,
    type StrategyExecutionRun,
    type StrategyPosition,
    type StrategyRiskConfig,
    type StrategyRiskEvent,
    type StrategySignalEvent,
    type StrategySummary,
    type StrategyVersion,
    type SystemBrokerStatus,
    type SystemRisk,
    type SystemRiskEvent,
    type UniverseDetail,
    type UniverseSummary,
  } from "@/lib/api";
  import { loadHealthStatus, type HealthSnapshot } from "@/lib/health";
  import type { AppRoute } from "@/router";
  import { demoDashboard, demoSystemRisk } from "@/pages/dashboard/demo-data";

  import DashboardPage from "@/pages/dashboard/DashboardPage.svelte";
  import StrategiesPage from "@/pages/strategies/StrategiesPage.svelte";
  import StrategyDetailPage from "@/pages/strategies/StrategyDetailPage.svelte";
  import StrategyEditPage from "@/pages/strategies/StrategyEditPage.svelte";
  import StrategyBacktestPage from "@/pages/strategies/StrategyBacktestPage.svelte";
  import BacktestResultPage from "@/pages/backtests/BacktestResultPage.svelte";
  import UniversesPage from "@/pages/universes/UniversesPage.svelte";
  import UniverseDetailPage from "@/pages/universes/UniverseDetailPage.svelte";
  import BrokerPage from "@/pages/broker/BrokerPage.svelte";
  import BrokerLedgerPage from "@/pages/broker/BrokerLedgerPage.svelte";
  import OrdersPage from "@/pages/orders/OrdersPage.svelte";
  import PositionsPage from "@/pages/positions/PositionsPage.svelte";
  import LogsPage from "@/pages/logs/LogsPage.svelte";
  import SettingsPage from "@/pages/settings/SettingsPage.svelte";
  import NotFoundPage from "@/pages/NotFoundPage.svelte";

  export let route: AppRoute;

  let loading = true;
  let error: string | null = null;
  let data: Record<string, unknown> = {};
  let loadToken = 0;

  $: routeKey = JSON.stringify(route);
  $: if (routeKey) {
    void loadRoute(route);
  }

  async function loadRoute(nextRoute: AppRoute) {
    const token = ++loadToken;
    loading = true;
    error = null;
    data = {};
    try {
      const next = await fetchRouteData(nextRoute);
      if (token !== loadToken) return;
      data = next;
    } catch (e) {
      if (token !== loadToken) return;
      error = e instanceof Error ? e.message : "화면 데이터를 불러오지 못했습니다.";
    } finally {
      if (token === loadToken) loading = false;
    }
  }

  async function fetchRouteData(nextRoute: AppRoute): Promise<Record<string, unknown>> {
    switch (nextRoute.name) {
      case "dashboard": {
        if (
          import.meta.env.DEV &&
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("demo") === "1"
        ) {
          return { dashboard: demoDashboard(), systemRisk: demoSystemRisk() };
        }
        const dashboard = await loadDashboard();
        return {
          dashboard,
          systemRisk: {
            killSwitchEnabled: dashboard.globalKillSwitchEnabled,
            updatedAt: null,
          },
        };
      }
      case "strategies":
        return { strategies: await loadStrategies() };
      case "strategy-detail": {
        const strategyId = nextRoute.strategyId;
        const [
          strategy,
          versions,
          execution,
          runs,
          signals,
          orderCandidates,
          riskConfig,
          riskEvents,
          positions,
          requestsWithEvents,
          universes,
          rebalancePlans,
          brokerLedgerStatus,
        ] = await Promise.all([
          loadStrategy(strategyId),
          loadStrategyVersions(strategyId),
          loadStrategyExecution(strategyId),
          loadStrategyExecutionRuns(strategyId),
          loadStrategySignals(strategyId),
          loadStrategyOrderCandidates(strategyId),
          loadStrategyRisk(strategyId),
          loadStrategyRiskEvents(strategyId),
          loadStrategyPositions(strategyId),
          loadStrategyOrderRequestsWithEvents(strategyId),
          loadUniverses(),
          loadRebalancePlans(strategyId),
          loadBrokerLedgerStatus(),
        ]);
        return {
          strategy,
          versions,
          execution,
          runs,
          signals,
          orderCandidates,
          orderRequests: requestsWithEvents.map((item) => item.orderRequest),
          riskConfig,
          riskEvents,
          positions,
          requestsWithEvents,
          universes,
          rebalancePlans,
          brokerLedgerStatus,
        };
      }
      case "strategy-edit": {
        const strategy = await loadStrategy(nextRoute.strategyId);
        return { strategy };
      }
      case "strategy-backtest": {
        const [strategy, runs] = await Promise.all([
          loadStrategy(nextRoute.strategyId),
          loadStrategyBacktests(nextRoute.strategyId),
        ]);
        return { strategy, runs };
      }
      case "backtest-result":
        return { run: await loadBacktest(nextRoute.runId) };
      case "universes":
        return { universes: await loadUniverses() };
      case "universe-detail":
        return { universe: await loadUniverse(nextRoute.universeId) };
      case "broker": {
        const [status, runs] = await Promise.all([loadBrokerLedgerStatus(), loadBrokerLedgerSyncRuns(20)]);
        return { status, runs };
      }
      case "broker-ledger": {
        const status = await loadBrokerLedgerStatus();
        const syncRunId = status.latestSuccessfulSyncRun?.id ?? undefined;
        const [trades, balances, profits] = syncRunId
          ? await Promise.all([
              loadBrokerLedgerTrades({ syncRunId, limit: 200 }),
              loadBrokerLedgerBalances({ syncRunId, limit: 200 }),
              loadBrokerLedgerProfits({ syncRunId, limit: 200 }),
            ])
          : [[], [], []];
        return { status, trades, balances, profits };
      }
      case "orders": {
        const [orders, fills] = await Promise.all([loadAllOrders(), loadAllFills()]);
        return { orders, fills };
      }
      case "positions":
        return { positions: await loadAllPositions() };
      case "logs":
        return { events: await loadSystemActivity() };
      case "settings": {
        const [systemBroker, systemBrokerEvents, systemRisk, systemRiskEvents, health] = await Promise.all([
          loadSystemBrokerStatus(),
          loadSystemBrokerEvents(),
          loadSystemRisk(),
          loadSystemRiskEvents(),
          loadHealthStatus(),
        ]);
        return { systemBroker, systemBrokerEvents, systemRisk, systemRiskEvents, health };
      }
      default:
        return {};
    }
  }

  function refresh() {
    void loadRoute(route);
  }

  async function runAction(work: () => Promise<unknown>, success?: () => boolean | void) {
    try {
      error = null;
      await work();
      const shouldRefresh = success?.() !== false;
      if (!shouldRefresh) return;
      refresh();
    } catch (e) {
      error = e instanceof Error ? e.message : "요청 처리 중 오류가 발생했습니다.";
    }
  }
</script>

{#if loading}
  <section class="page-shell docs-page-shell">
    <div class="empty-state"><p class="empty-state-message">데이터를 불러오는 중입니다.</p></div>
  </section>
{:else if error}
  <section class="page-shell docs-page-shell">
    <div class="doc-panel doc-panel-error">
      <h1 class="section-title">오류</h1>
      <p class="section-copy">{error}</p>
      <button class="button-secondary" type="button" on:click={refresh}>다시 시도</button>
    </div>
  </section>
{:else if route.name === "dashboard"}
  <DashboardPage
    dashboard={data.dashboard as DashboardResponse}
    risk={data.systemRisk as SystemRisk}
    {runAction}
  />
{:else if route.name === "strategies"}
  <StrategiesPage strategies={data.strategies as StrategySummary[]} {runAction} />
{:else if route.name === "strategy-detail"}
  <StrategyDetailPage
    strategy={data.strategy as StrategyDetail}
    versions={data.versions as StrategyVersion[]}
    execution={data.execution as StrategyExecutionResponse}
    runs={data.runs as StrategyExecutionRun[]}
    signals={data.signals as StrategySignalEvent[]}
    orderCandidates={data.orderCandidates as OrderCandidate[]}
    orderRequests={data.orderRequests as OrderRequest[]}
    riskConfig={data.riskConfig as StrategyRiskConfig}
    riskEvents={data.riskEvents as StrategyRiskEvent[]}
    positions={data.positions as StrategyPosition[]}
    requestsWithEvents={data.requestsWithEvents as OrderRequestWithEvents[]}
    availableUniverses={data.universes as UniverseSummary[]}
    rebalancePlans={data.rebalancePlans as RebalancePlan[]}
    brokerLedgerStatus={data.brokerLedgerStatus as BrokerLedgerStatus}
    {runAction}
  />
{:else if route.name === "strategy-edit"}
  <StrategyEditPage strategy={data.strategy as StrategyDetail} {runAction} />
{:else if route.name === "strategy-backtest"}
  <StrategyBacktestPage
    strategy={data.strategy as StrategyDetail}
    runs={data.runs as BacktestRunSummary[]}
    {runAction}
  />
{:else if route.name === "backtest-result"}
  <BacktestResultPage run={data.run as BacktestRunDetail} />
{:else if route.name === "universes"}
  <UniversesPage universes={data.universes as UniverseSummary[]} {runAction} />
{:else if route.name === "universe-detail"}
  <UniverseDetailPage universe={data.universe as UniverseDetail} {runAction} />
{:else if route.name === "broker"}
  <BrokerPage
    status={data.status as BrokerLedgerStatus}
    runs={data.runs as BrokerLedgerSyncRun[]}
    {runAction}
  />
{:else if route.name === "broker-ledger"}
  <BrokerLedgerPage
    trades={(data.trades as BrokerLedgerTrade[]) ?? []}
    balances={(data.balances as BrokerLedgerBalance[]) ?? []}
    profits={(data.profits as BrokerLedgerProfit[]) ?? []}
  />
{:else if route.name === "orders"}
  <OrdersPage
    orders={data.orders as CrossStrategyOrderRequest[]}
    fills={data.fills as CrossStrategyFill[]}
  />
{:else if route.name === "positions"}
  <PositionsPage positions={data.positions as CrossStrategyPosition[]} />
{:else if route.name === "logs"}
  <LogsPage events={data.events as ActivityEvent[]} />
{:else if route.name === "settings"}
  <SettingsPage
    systemBroker={data.systemBroker as SystemBrokerStatus}
    systemBrokerEvents={data.systemBrokerEvents as BrokerConnectionEvent[]}
    systemRisk={data.systemRisk as SystemRisk}
    systemRiskEvents={data.systemRiskEvents as SystemRiskEvent[]}
    health={data.health as HealthSnapshot}
    {runAction}
  />
{:else}
  <NotFoundPage />
{/if}
