<script lang="ts">
  import DataTable from "@/lib/components/DataTable.svelte";
  import KillSwitchToggle from "@/lib/components/KillSwitchToggle.svelte";
  import StatusChip from "@/lib/components/StatusChip.svelte";
  import { updateSystemRiskKillSwitch, type DashboardResponse, type SystemRisk } from "@/lib/api";
  import { statusVariant } from "@/pages/_helpers/status-class";

  export let dashboard: DashboardResponse;
  export let risk: SystemRisk;
  export let runAction: (work: () => Promise<unknown>, success?: () => boolean | void) => Promise<void>;

  $: pnl = dashboard.todayPnl;
  $: pnlClass = pnl > 0 ? "value-positive" : pnl < 0 ? "value-negative" : "value-neutral";
  $: pnlDisplay = pnl < 0 ? pnl.toLocaleString() : Math.abs(pnl).toLocaleString();
</script>

<section class="page-shell docs-page-shell">
  <header id="dashboard-summary" class="page-intro">
    <p class="page-eyebrow">Dashboard</p>
    <h1 class="page-title">운영 대시보드</h1>
    <p class="page-description">자동매매 상태, 전략 실행 현황, 주문 및 포지션 흐름을 한 화면에서 확인합니다.</p>
    <div class="header-metrics" id="dashboard-health">
      <span class="metric-inline">
        <span class="metric-inline-label">전략</span>
        <span class="metric-inline-value">{dashboard.runningStrategyCount}</span>
      </span>
      <span class="metric-inline">
        <span class="metric-inline-label">오늘 주문</span>
        <span class="metric-inline-value">{dashboard.todayOrderCount.toLocaleString()}</span>
      </span>
      <span class="metric-inline">
        <span class="metric-inline-label">오늘 손익</span>
        <span class="metric-inline-value {pnlClass}">{pnlDisplay}</span>
      </span>
      <span class="metric-inline">
        <span class="metric-inline-label">API</span>
        <StatusChip variant={statusVariant(dashboard.health.apiStatus)} label={dashboard.health.apiStatus} />
      </span>
      <span class="metric-inline">
        <span class="metric-inline-label">DB</span>
        <StatusChip variant={statusVariant(dashboard.health.dbStatus)} label={dashboard.health.dbStatus} />
      </span>
    </div>
  </header>
  <KillSwitchToggle
    enabled={risk.killSwitchEnabled}
    scope="system"
    onToggle={(next) => runAction(() => updateSystemRiskKillSwitch({ enabled: next }))}
  />
  <div class="split-grid">
    <DataTable
      id="dashboard-strategies"
      title="전략 현황"
      rows={dashboard.strategySummaries}
      columns={["name", "status", "executionEnabled", "lastRunStatus"]}
      linkPrefix="/strategies"
      linkKey="id"
    />
    <DataTable
      id="dashboard-positions"
      title="현재 포지션"
      rows={dashboard.currentPositions}
      columns={["strategyName", "symbol", "netQuantity", "avgEntryPrice", "lastFillAt"]}
    />
    <DataTable
      id="dashboard-fills"
      title="최근 체결"
      rows={dashboard.recentFills}
      columns={["strategyName", "symbol", "side", "quantity", "price", "filledAt"]}
    />
    <DataTable
      id="dashboard-errors"
      title="최근 오류"
      rows={dashboard.recentErrors}
      columns={["source", "strategyName", "message", "occurredAt"]}
    />
  </div>
</section>
