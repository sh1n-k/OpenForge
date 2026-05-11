<script lang="ts">
  import ListSection from "@/pages/shared/ListSection.svelte";
  import Metric from "@/lib/components/Metric.svelte";
  import KillSwitchToggle from "@/lib/components/KillSwitchToggle.svelte";
  import StatusChip from "@/lib/components/StatusChip.svelte";
  import { updateSystemRiskKillSwitch, type DashboardResponse, type SystemRisk } from "@/lib/api";
  import { statusVariant } from "@/pages/_helpers/status-class";

  export let dashboard: DashboardResponse;
  export let risk: SystemRisk;
  export let runAction: (work: () => Promise<unknown>, success?: () => boolean | void) => Promise<void>;
</script>

<section class="page-shell docs-page-shell">
  <header id="dashboard-summary" class="page-intro">
    <p class="page-eyebrow">Dashboard</p>
    <h1 class="page-title">운영 대시보드</h1>
    <p class="page-description">자동매매 상태, 전략 실행 현황, 주문 및 포지션 흐름을 한 화면에서 확인합니다.</p>
  </header>
  <div class="summary-grid summary-grid-columns-3">
    <Metric label="전략" value={dashboard.runningStrategyCount} copy="실행 중" />
    <Metric label="오늘 주문" value={dashboard.todayOrderCount} copy="요청 수" />
    <Metric label="오늘 손익" value={dashboard.todayPnl} copy="실현 손익" />
  </div>
  <KillSwitchToggle
    enabled={risk.killSwitchEnabled}
    scope="system"
    onToggle={(next) => runAction(() => updateSystemRiskKillSwitch({ enabled: next }))}
  />
  <ListSection
    id="dashboard-strategies"
    title="전략 현황"
    rows={dashboard.strategySummaries}
    columns={["name", "status", "executionEnabled", "lastRunStatus"]}
    linkPrefix="/strategies"
    linkKey="id"
  />
  <ListSection
    id="dashboard-fills"
    title="최근 체결"
    rows={dashboard.recentFills}
    columns={["strategyName", "symbol", "side", "quantity", "price", "filledAt"]}
  />
  <ListSection
    id="dashboard-positions"
    title="현재 포지션"
    rows={dashboard.currentPositions}
    columns={["strategyName", "symbol", "netQuantity", "avgEntryPrice", "lastFillAt"]}
  />
  <ListSection
    id="dashboard-errors"
    title="최근 오류"
    rows={dashboard.recentErrors}
    columns={["source", "strategyName", "message", "occurredAt"]}
  />
  <div id="dashboard-health" class="dashboard-health-bar">
    <span>API {dashboard.health.apiStatus} / DB {dashboard.health.dbStatus}</span>
    <StatusChip variant={statusVariant(dashboard.health.apiStatus)} label={dashboard.health.apiStatus} />
  </div>
</section>
