<script lang="ts">
  import ListSection from "@/pages/shared/ListSection.svelte";
  import Metric from "@/pages/shared/Metric.svelte";
  import PageHeader from "@/pages/shared/PageHeader.svelte";
  import type { AppRoute } from "@/router";
  import {
    addStrategyVersion,
    archiveStrategy,
    archiveUniverse,
    cloneStrategy,
    collectSymbols,
    createBacktest,
    createOrderRequest,
    createStrategy,
    createUniverse,
    importDailyBars,
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
    loadMarketCoverage,
    loadStrategies,
    loadStrategy,
    loadStrategyBacktests,
    loadStrategyExecution,
    loadStrategyExecutionRuns,
    loadStrategyOrderCandidates,
    loadStrategyOrderRequests,
    loadStrategyOrderRequestsWithEvents,
    loadStrategyPositions,
    loadStrategyRisk,
    loadStrategyRiskEvents,
    loadStrategySignals,
    loadStrategyVersions,
    loadSystemActivity,
    loadSystemBrokerEvents,
    loadSystemBrokerStatus,
    loadSystemRisk,
    loadSystemRiskEvents,
    loadUniverse,
    loadUniverses,
    replaceStrategyUniverses,
    replaceUniverseSymbols,
    searchSymbols,
    startBrokerLedgerSync,
    testBrokerConnection,
    updateBrokerConnectionConfig,
    updateStrategyExecution,
    updateStrategyRisk,
    updateSystemRiskKillSwitch,
    updateUniverse,
    validateStrategy,
    type ActivityEvent,
    type BacktestRunDetail,
    type BacktestRunSummary,
    type BrokerLedgerBalance,
    type BrokerConnectionEvent,
    type BrokerLedgerMarket,
    type BrokerLedgerProfit,
    type BrokerLedgerStatus,
    type BrokerLedgerSyncRun,
    type BrokerLedgerTrade,
    type CrossStrategyFill,
    type CrossStrategyOrderRequest,
    type CrossStrategyPosition,
    type DashboardResponse,
    type MarketCoverage,
    type OrderCandidate,
    type OrderRequest,
    type OrderRequestWithEvents,
    type StrategyDetail,
    type StrategyExecutionResponse,
    type StrategyExecutionRun,
    type StrategyPosition,
    type StrategyRiskConfig,
    type StrategyRiskEvent,
    type StrategySignalEvent,
    type StrategySummary,
    type StrategyValidateResponse,
    type StrategyVersion,
    type SymbolSearchItem,
    type SystemBrokerStatus,
    type SystemRisk,
    type SystemRiskEvent,
    type UniverseDetail,
    type UniverseSummary,
  } from "@/lib/api";
  import { loadHealthStatus, type HealthSnapshot } from "@/lib/health";
  import {
    deriveBuilderState,
    deriveCodeSource,
    makeBuilderPayload,
    makeCodePayload,
  } from "@/lib/strategy-editor";
  import { formatDateTime, shortId } from "@/lib/format";

  export let route: AppRoute;

  let loading = true;
  let error: string | null = null;
  let data: Record<string, unknown> = {};
  let loadToken = 0;

  let strategyForm = { name: "", description: "", strategyType: "builder" as "builder" | "code" };
  let universeForm = { name: "", description: "", marketScope: "domestic" as "domestic" | "us" };
  let backtestForm = {
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    initialCapital: 10000000,
    commissionRate: 0.00015,
    taxRate: 0.0023,
    slippageRate: 0,
    symbols: "",
  };
  let brokerSyncForm = { startDate: "2025-01-01", endDate: "2025-12-31", domestic: true, overseas: false };
  let brokerConfigForm = {
    targetMode: "paper" as "paper" | "live",
    appKey: "",
    appSecret: "",
    accountNumber: "",
    productCode: "",
    enabled: true,
  };
  let symbolQuery = "";
  let symbolResults: SymbolSearchItem[] = [];
  let symbolText = "";
  let selectedUniverseIds: string[] = [];
  let editorMode = "builder" as "builder" | "code";
  let codeSource = "";
  let changeSummary = "";
  let validation: StrategyValidateResponse | null = null;

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
      data = await fetchRouteData(nextRoute);
      seedForms(nextRoute);
    } catch (e) {
      error = e instanceof Error ? e.message : "화면 데이터를 불러오지 못했습니다.";
    } finally {
      if (token === loadToken) loading = false;
    }
  }

  async function fetchRouteData(nextRoute: AppRoute): Promise<Record<string, unknown>> {
    switch (nextRoute.name) {
      case "dashboard": {
        const [dashboard, systemRisk] = await Promise.all([loadDashboard(), loadSystemRisk()]);
        return { dashboard, systemRisk };
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
          orderRequests,
          riskConfig,
          riskEvents,
          positions,
          requestsWithEvents,
          universes,
        ] = await Promise.all([
          loadStrategy(strategyId),
          loadStrategyVersions(strategyId),
          loadStrategyExecution(strategyId),
          loadStrategyExecutionRuns(strategyId),
          loadStrategySignals(strategyId),
          loadStrategyOrderCandidates(strategyId),
          loadStrategyOrderRequests(strategyId),
          loadStrategyRisk(strategyId),
          loadStrategyRiskEvents(strategyId),
          loadStrategyPositions(strategyId),
          loadStrategyOrderRequestsWithEvents(strategyId),
          loadUniverses(),
        ]);
        return { strategy, versions, execution, runs, signals, orderCandidates, orderRequests, riskConfig, riskEvents, positions, requestsWithEvents, universes };
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
        return { strategy, runs, coverage: null };
      }
      case "backtest-result":
        return { run: await loadBacktest(nextRoute.runId) };
      case "universes":
        return { universes: await loadUniverses() };
      case "universe-detail": {
        return { universe: await loadUniverse(nextRoute.universeId) };
      }
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
      case "positions": {
        return { positions: await loadAllPositions() };
      }
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

  function seedForms(nextRoute: AppRoute) {
    if (nextRoute.name === "universe-detail") {
      const universe = data.universe as UniverseDetail | undefined;
      symbolText = universe?.symbols.map((s) => `${s.symbol},${s.exchange},${s.displayName}`).join("\n") ?? "";
    }
    if (nextRoute.name === "strategy-edit") {
      const strategy = data.strategy as StrategyDetail | undefined;
      if (!strategy) return;
      editorMode = strategy.strategyType;
      codeSource = deriveCodeSource(strategy);
      validation = null;
    }
    if (nextRoute.name === "strategy-detail") {
      const strategy = data.strategy as StrategyDetail | undefined;
      selectedUniverseIds = strategy?.universes.map((universe) => universe.id) ?? [];
    }
  }

  function statusClass(value: string | null | undefined) {
    if (value === "running" || value === "completed" || value === "success" || value === "valid" || value === "UP") return "status-chip status-chip-success";
    if (value?.includes("failed") || value?.includes("invalid") || value === "DOWN" || value === "error") return "status-chip status-chip-error";
    if (value === "queued" || value === "draft" || value === "stopped") return "status-chip status-chip-warning";
    return "status-chip status-chip-info";
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

  async function submitStrategy() {
    await runAction(async () => {
      const payload = strategyForm.strategyType === "builder"
        ? { builderState: { metadata: { name: strategyForm.name, description: strategyForm.description }, indicators: [], entry: { logic: "AND", conditions: [] }, exit: { logic: "AND", conditions: [] }, risk: {} } }
        : { source: `version: "1.0"\nmetadata:\n  name: "${strategyForm.name}"\nstrategy:\n  id: "${strategyForm.name.toLowerCase().replace(/\s+/g, "_")}"` };
      await createStrategy({
        name: strategyForm.name,
        description: strategyForm.description,
        strategyType: strategyForm.strategyType,
        initialPayload: {
          payloadFormat: strategyForm.strategyType === "builder" ? "builder_json" : "code_text",
          payload,
          changeSummary: "Initial version",
        },
      });
    }, () => {
      strategyForm = { name: "", description: "", strategyType: "builder" };
    });
  }

  async function submitUniverse() {
    await runAction(async () => {
      await createUniverse(universeForm);
    }, () => {
      universeForm = { name: "", description: "", marketScope: "domestic" };
    });
  }

  function parseSymbolRows(universe: UniverseDetail) {
    return symbolText
      .split(/\r?\n/)
      .map((line, index) => {
        const [symbol, exchange = "", displayName = symbol] = line.split(",").map((part) => part.trim());
        if (!symbol) return null;
        return {
          symbol,
          exchange,
          displayName,
          market: universe.marketScope,
          sortOrder: index,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  async function submitEditor() {
    const strategy = data.strategy as StrategyDetail;
    const builderState = deriveBuilderState(strategy);
    const payload = editorMode === "builder" ? makeBuilderPayload(builderState) : makeCodePayload(codeSource);
    await runAction(async () => {
      validation = await validateStrategy({
        strategyType: editorMode,
        payloadFormat: editorMode === "builder" ? "builder_json" : "code_text",
        payload,
      });
      if (!validation.valid) return;
      await addStrategyVersion(strategy.id, {
        payloadFormat: editorMode === "builder" ? "builder_json" : "code_text",
        payload,
        changeSummary,
      });
    });
  }

  async function submitBacktest() {
    const strategy = data.strategy as StrategyDetail;
    const symbols = backtestForm.symbols.split(/[,\s]+/).map((value) => value.trim()).filter(Boolean);
    await runAction(async () => {
      const result = await createBacktest({
        strategyId: strategy.id,
        startDate: backtestForm.startDate,
        endDate: backtestForm.endDate,
        initialCapital: Number(backtestForm.initialCapital),
        commissionRate: Number(backtestForm.commissionRate),
        taxRate: Number(backtestForm.taxRate),
        slippageRate: Number(backtestForm.slippageRate),
        symbols,
      });
      window.history.pushState({}, "", `/backtests/${result.runId}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
  }

  async function checkCoverage() {
    const symbols = backtestForm.symbols.split(/[,\s]+/).map((value) => value.trim()).filter(Boolean);
    const coverage = await loadMarketCoverage({ symbols, startDate: backtestForm.startDate, endDate: backtestForm.endDate });
    data = { ...data, coverage };
  }

  function toggleUniverseSelection(universeId: string, checked: boolean) {
    selectedUniverseIds = checked
      ? [...new Set([...selectedUniverseIds, universeId])]
      : selectedUniverseIds.filter((id) => id !== universeId);
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
  {@const dashboard = data.dashboard as DashboardResponse}
  {@const risk = data.systemRisk as SystemRisk}
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
    <div class={`dashboard-killswitch ${risk.killSwitchEnabled ? "dashboard-killswitch-off" : "dashboard-killswitch-on"}`}>
      <div class="dashboard-killswitch-body">
        <span class="dashboard-killswitch-label">{risk.killSwitchEnabled ? "신규 주문 차단 중" : "정상 운영 중"}</span>
        <p class="dashboard-killswitch-description">전역 킬스위치 상태를 변경합니다.</p>
      </div>
      <button class={risk.killSwitchEnabled ? "button-secondary" : "button-danger"} type="button" on:click={() => runAction(() => updateSystemRiskKillSwitch({ enabled: !risk.killSwitchEnabled }))}>
        {risk.killSwitchEnabled ? "차단 해제" : "신규 주문 차단"}
      </button>
    </div>
    <ListSection id="dashboard-strategies" title="전략 현황" rows={dashboard.strategySummaries} columns={["name", "status", "executionEnabled", "lastRunStatus"]} linkPrefix="/strategies" linkKey="id" />
    <ListSection id="dashboard-fills" title="최근 체결" rows={dashboard.recentFills} columns={["strategyName", "symbol", "side", "quantity", "price", "filledAt"]} />
    <ListSection id="dashboard-positions" title="현재 포지션" rows={dashboard.currentPositions} columns={["strategyName", "symbol", "netQuantity", "avgEntryPrice", "lastFillAt"]} />
    <ListSection id="dashboard-errors" title="최근 오류" rows={dashboard.recentErrors} columns={["source", "strategyName", "message", "occurredAt"]} />
    <div id="dashboard-health" class="dashboard-health-bar">
      <span>API {dashboard.health.apiStatus} / DB {dashboard.health.dbStatus}</span>
      <span class={statusClass(dashboard.health.apiStatus)}>{dashboard.health.apiStatus}</span>
    </div>
  </section>
{:else if route.name === "strategies"}
  {@const strategies = data.strategies as StrategySummary[]}
  <section class="page-shell docs-page-shell">
    <PageHeader id="strategies-summary" eyebrow="Strategies" title="전략" description="전략 레지스트리와 실행 상태를 관리합니다." />
    <form id="strategies-create" class="doc-panel grid-section" on:submit|preventDefault={submitStrategy}>
      <h2 class="section-title">전략 생성</h2>
      <div class="form-row">
        <label class="form-field"><span class="form-label">이름</span><input bind:value={strategyForm.name} required /></label>
        <label class="form-field"><span class="form-label">유형</span><select bind:value={strategyForm.strategyType}><option value="builder">빌더형</option><option value="code">코드형</option></select></label>
      </div>
      <label class="form-field"><span class="form-label">설명</span><input bind:value={strategyForm.description} /></label>
      <button class="button-primary" type="submit">생성</button>
    </form>
    <ListSection id="strategies-registry" title="전략 레지스트리" rows={strategies} columns={["name", "strategyType", "status", "latestVersionNumber", "universeCount", "updatedAt"]} linkPrefix="/strategies" linkKey="id" />
  </section>
{:else if route.name === "strategy-detail"}
  {@const strategy = data.strategy as StrategyDetail}
  {@const execution = data.execution as StrategyExecutionResponse}
  {@const riskConfig = data.riskConfig as StrategyRiskConfig}
  {@const availableUniverses = data.universes as UniverseSummary[]}
  <section class="page-shell docs-page-shell">
    <header id="strategy-overview" class="doc-panel">
      <div class="page-intro-row">
        <div>
          <p class="page-eyebrow">전략 작업대</p>
          <h1 class="page-title">{strategy.name}</h1>
          <p class="page-description">{strategy.description ?? "설명 없음"}</p>
        </div>
        <div class="page-actions">
          <a class="button-secondary" href={`/strategies/${strategy.id}/edit`}>편집</a>
          <a class="button-secondary" href={`/strategies/${strategy.id}/backtest`}>과거 데이터 점검</a>
          <button class="button-secondary" type="button" on:click={() => runAction(() => cloneStrategy(strategy.id))}>복제</button>
          <button class="button-danger" type="button" on:click={() => runAction(() => archiveStrategy(strategy.id), () => { window.location.href = "/strategies"; return false; })}>보관</button>
        </div>
      </div>
    </header>
    <div id="strategy-universes" class="doc-panel grid-section">
      <h2 class="section-title">종목 그룹</h2>
      <p class="section-copy">자동 실행은 연결된 국내 종목 그룹의 종목을 대상으로 전략 신호를 계산합니다.</p>
      {#if availableUniverses.length === 0}
        <p class="section-copy">사용 가능한 종목 그룹이 없습니다.</p>
      {:else}
        <div class="checkbox-list">
          {#each availableUniverses as item}
            <label class="checkbox-row">
              <input
                type="checkbox"
                checked={selectedUniverseIds.includes(item.id)}
                on:change={(event) => toggleUniverseSelection(item.id, event.currentTarget.checked)}
              />
              <span>{item.name}</span>
              <span class="section-copy">{item.marketScope} / {item.symbolCount}개</span>
            </label>
          {/each}
        </div>
        <button class="button-primary" type="button" on:click={() => runAction(() => replaceStrategyUniverses(strategy.id, selectedUniverseIds))}>종목 그룹 저장</button>
      {/if}
    </div>
    <div id="strategy-execution" class="doc-panel grid-section">
      <h2 class="section-title">자동 실행</h2>
      <p class="section-copy">다음 실행: {formatDateTime(execution.nextRunAt) ?? "대기 중"}</p>
      <p class="section-copy">실행 전 유효한 전략 버전, 국내 종목 그룹 연결, 종목 구성, 리스크 설정을 확인합니다.</p>
      <button class={execution.enabled ? "button-danger" : "button-primary"} type="button" on:click={() => runAction(() => updateStrategyExecution(strategy.id, { enabled: !execution.enabled, scheduleTime: execution.scheduleTime, timezone: execution.timezone, mode: "paper" }))}>
        {execution.enabled ? "실행 중지" : "실행 활성화"}
      </button>
    </div>
    <div id="strategy-risk" class="doc-panel grid-section">
      <h2 class="section-title">리스크</h2>
      <p>전략 킬스위치: {riskConfig.strategyKillSwitchEnabled ? "활성" : "비활성"}</p>
      <button class={riskConfig.strategyKillSwitchEnabled ? "button-secondary" : "button-danger"} type="button" on:click={() => runAction(() => updateStrategyRisk(strategy.id, { ...riskConfig, strategyKillSwitchEnabled: !riskConfig.strategyKillSwitchEnabled }))}>
        {riskConfig.strategyKillSwitchEnabled ? "차단 해제" : "전략 주문 차단"}
      </button>
    </div>
    <ListSection id="strategy-versions" title="버전" rows={data.versions as StrategyVersion[]} columns={["versionNumber", "payloadFormat", "validationStatus", "changeSummary", "createdAt"]} />
    <ListSection id="strategy-orders" title="주문 후보" rows={data.orderCandidates as OrderCandidate[]} columns={["symbol", "side", "quantity", "price", "mode", "alreadyRequested"]} actionLabel="주문 요청" action={(row) => runAction(() => createOrderRequest(strategy.id, { signalEventId: (row as OrderCandidate).signalEventId, mode: "paper" }))} />
    <ListSection title="주문 요청" rows={data.orderRequests as OrderRequest[]} columns={["symbol", "side", "quantity", "price", "currentStatus", "requestedAt"]} />
    <ListSection title="포지션" rows={data.positions as StrategyPosition[]} columns={["symbol", "netQuantity", "avgEntryPrice", "lastFillAt"]} />
    <ListSection id="strategy-activity" title="실행 로그" rows={data.runs as StrategyExecutionRun[]} columns={["runId", "status", "scheduledDate", "signalCount", "errorMessage"]} />
    <ListSection title="시그널" rows={data.signals as StrategySignalEvent[]} columns={["symbol", "signalType", "tradingDate", "createdAt"]} />
    <ListSection title="상태 이벤트" rows={(data.requestsWithEvents as OrderRequestWithEvents[]).flatMap((item) => item.statusEvents)} columns={["status", "reason", "occurredAt"]} />
    <ListSection title="리스크 이벤트" rows={data.riskEvents as StrategyRiskEvent[]} columns={["scope", "eventType", "reasonCode", "message", "occurredAt"]} />
  </section>
{:else if route.name === "strategy-edit"}
  {@const strategy = data.strategy as StrategyDetail}
  <section class="page-shell docs-page-shell">
    <PageHeader id="editor-summary" eyebrow="Editor" title={`${strategy.name} 편집`} description="전략 정의를 검증하고 새 버전을 추가합니다." />
    <div id="editor-builder" class="doc-panel grid-section">
      <div class="settings-tabs">
        <button class:settings-tab-active={editorMode === "builder"} class="settings-tab" type="button" on:click={() => (editorMode = "builder")}>빌더</button>
        <button class:settings-tab-active={editorMode === "code"} class="settings-tab" type="button" on:click={() => (editorMode = "code")}>코드</button>
      </div>
      {#if editorMode === "builder"}
        <pre class="code-block">{JSON.stringify(makeBuilderPayload(deriveBuilderState(strategy)), null, 2)}</pre>
      {:else}
        <textarea bind:value={codeSource} rows="18"></textarea>
      {/if}
      <label id="editor-note" class="form-field"><span class="form-label">변경 메모</span><input bind:value={changeSummary} /></label>
      <button class="button-primary" type="button" on:click={submitEditor}>검증 후 버전 추가</button>
    </div>
    {#if validation}
      <div id="editor-validation" class={validation.valid ? "doc-panel doc-panel-info" : "doc-panel doc-panel-error"}>
        <h2 class="section-title">{validation.valid ? "검증 통과" : "검증 실패"}</h2>
        <p class="section-copy">{validation.summary}</p>
      </div>
    {/if}
  </section>
{:else if route.name === "strategy-backtest"}
  {@const strategy = data.strategy as StrategyDetail}
  <section class="page-shell docs-page-shell">
    <PageHeader id="backtest-summary" eyebrow="Historical Check" title={`${strategy.name} 과거 데이터 점검`} description="보조 점검 기능입니다. 여러 종목은 균등 자본으로 독립 시뮬레이션하며 자동 실행 수량 정책과 다를 수 있습니다." />
    <form id="backtest-config" class="doc-panel grid-section" on:submit|preventDefault={submitBacktest}>
      <div class="form-row">
        <label class="form-field"><span class="form-label">시작일</span><input type="date" bind:value={backtestForm.startDate} /></label>
        <label class="form-field"><span class="form-label">종료일</span><input type="date" bind:value={backtestForm.endDate} /></label>
        <label class="form-field"><span class="form-label">초기 자본</span><input type="number" bind:value={backtestForm.initialCapital} /></label>
      </div>
      <label class="form-field"><span class="form-label">종목 코드</span><input bind:value={backtestForm.symbols} placeholder="005930, 000660" /></label>
      <div class="page-actions">
        <button class="button-secondary" type="button" on:click={checkCoverage}>커버리지 확인</button>
        <button class="button-primary" type="submit">과거 데이터 점검 실행</button>
      </div>
    </form>
    <div id="backtest-datasets" class="doc-panel">
      <input type="file" on:change={(event) => { const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (file) void runAction(() => importDailyBars(file)); }} />
    </div>
    {#if data.coverage}
      <ListSection id="backtest-coverage" title="커버리지" rows={(data.coverage as MarketCoverage).symbols} columns={["symbol", "covered", "firstDate", "lastDate"]} />
    {/if}
    <ListSection id="backtest-runs" title="점검 이력" rows={data.runs as BacktestRunSummary[]} columns={["runId", "status", "requestedAt", "completedAt"]} linkPrefix="/backtests" linkKey="runId" />
  </section>
{:else if route.name === "backtest-result"}
  {@const run = data.run as BacktestRunDetail}
  <section class="page-shell docs-page-shell">
    <PageHeader id="run-summary" eyebrow="Historical Check" title={`과거 데이터 점검 ${shortId(run.runId)}`} description={run.errorMessage ?? `상태: ${run.status}`} />
    <ListSection id="run-charts" title="자산 곡선" rows={run.equityCurve} columns={["tradingDate", "equity", "cash", "drawdown"]} />
    <pre id="run-config" class="code-block">{JSON.stringify(run.config, null, 2)}</pre>
    <ListSection id="run-trades" title="거래 이력" rows={run.trades} columns={["symbol", "entryDate", "exitDate", "quantity", "netPnl", "exitReason"]} />
  </section>
{:else if route.name === "universes"}
  {@const universes = data.universes as UniverseSummary[]}
  <section class="page-shell docs-page-shell">
    <PageHeader id="universes-summary" eyebrow="Symbol Groups" title="종목 그룹" description="전략에 연결할 종목 묶음을 관리합니다." />
    <form id="universes-create" class="doc-panel grid-section" on:submit|preventDefault={submitUniverse}>
      <div class="form-row">
        <label class="form-field"><span class="form-label">이름</span><input bind:value={universeForm.name} required /></label>
        <label class="form-field"><span class="form-label">시장</span><select bind:value={universeForm.marketScope}><option value="domestic">국내</option><option value="us">미국</option></select></label>
      </div>
      <label class="form-field"><span class="form-label">설명</span><input bind:value={universeForm.description} /></label>
      <button class="button-primary" type="submit">생성</button>
    </form>
    <ListSection id="universes-registry" title="레지스트리" rows={universes} columns={["name", "marketScope", "symbolCount", "strategyCount", "updatedAt"]} linkPrefix="/universes" linkKey="id" />
  </section>
{:else if route.name === "universe-detail"}
  {@const universe = data.universe as UniverseDetail}
  <section class="page-shell docs-page-shell">
    <PageHeader id="universe-overview" eyebrow="Symbol Group" title={universe.name} description={universe.description ?? "설명 없음"} />
    <form id="universe-basic-info" class="doc-panel grid-section" on:submit|preventDefault={() => runAction(() => updateUniverse(universe.id, { name: universe.name, description: universe.description ?? undefined }))}>
      <p>시장: {universe.marketScope} / 종목 {universe.symbolCount}개</p>
      <button class="button-danger" type="button" on:click={() => runAction(() => archiveUniverse(universe.id), () => { window.location.href = "/universes"; return false; })}>보관</button>
    </form>
    <div id="universe-symbols" class="doc-panel grid-section">
      <h2 class="section-title">종목 구성</h2>
      <textarea bind:value={symbolText} rows="10"></textarea>
      <div class="page-actions">
        <button class="button-primary" type="button" on:click={() => runAction(() => replaceUniverseSymbols(universe.id, parseSymbolRows(universe)))}>저장</button>
        <button class="button-secondary" type="button" on:click={() => runAction(() => collectSymbols(universe.marketScope))}>마스터 수집</button>
      </div>
      <div class="form-row">
        <input bind:value={symbolQuery} placeholder="종목 검색" />
        <button class="button-secondary" type="button" on:click={async () => (symbolResults = (await searchSymbols(symbolQuery, universe.marketScope)).items)}>검색</button>
      </div>
      <ListSection title="검색 결과" rows={symbolResults} columns={["code", "name", "exchange", "marketScope"]} />
    </div>
  </section>
{:else if route.name === "broker"}
  {@const status = data.status as BrokerLedgerStatus}
  <section class="page-shell docs-page-shell">
    <PageHeader id="broker-summary" eyebrow="Broker" title="브로커" description={`실전 설정: ${status.liveConfigured ? "완료" : "미설정"}`} />
    <form id="broker-sync" class="doc-panel grid-section" on:submit|preventDefault={() => runAction(() => startBrokerLedgerSync({ startDate: brokerSyncForm.startDate, endDate: brokerSyncForm.endDate, markets: [brokerSyncForm.domestic ? "domestic" : null, brokerSyncForm.overseas ? "overseas" : null].filter(Boolean) as BrokerLedgerMarket[] }))}>
      <div class="form-row">
        <input type="date" bind:value={brokerSyncForm.startDate} />
        <input type="date" bind:value={brokerSyncForm.endDate} />
      </div>
      <button class="button-primary" type="submit">동기화 시작</button>
    </form>
    <ListSection id="broker-sync-runs" title="동기화 이력" rows={data.runs as BrokerLedgerSyncRun[]} columns={["status", "startDate", "endDate", "tradeCount", "balanceCount", "profitCount"]} />
  </section>
{:else if route.name === "broker-ledger"}
  <section class="page-shell docs-page-shell">
    <PageHeader id="broker-ledger-summary" eyebrow="Broker Ledger" title="브로커 원장" description="최근 성공 동기화 기준 원장을 조회합니다." />
    <ListSection id="broker-ledger-trades" title="거래 원장" rows={data.trades as BrokerLedgerTrade[]} columns={["market", "symbol", "symbolName", "side", "quantity", "price", "realizedPnl"]} />
    <ListSection id="broker-ledger-balances" title="잔고 스냅샷" rows={data.balances as BrokerLedgerBalance[]} columns={["market", "symbol", "symbolName", "quantity", "averagePrice", "valuationAmount", "unrealizedPnl"]} />
    <ListSection id="broker-ledger-profits" title="손익 스냅샷" rows={data.profits as BrokerLedgerProfit[]} columns={["market", "symbol", "symbolName", "realizedPnl", "profitRate", "currency"]} />
  </section>
{:else if route.name === "orders"}
  <section class="page-shell docs-page-shell">
    <PageHeader id="orders-summary" eyebrow="Orders" title="주문" description="전체 전략의 주문 요청과 체결 내역입니다." />
    <ListSection id="orders-requests" title="주문 요청" rows={data.orders as CrossStrategyOrderRequest[]} columns={["strategyName", "symbol", "side", "quantity", "price", "status", "requestedAt"]} />
    <ListSection id="orders-fills" title="체결 내역" rows={data.fills as CrossStrategyFill[]} columns={["strategyName", "symbol", "side", "quantity", "price", "realizedPnl", "filledAt"]} />
  </section>
{:else if route.name === "positions"}
  <section class="page-shell docs-page-shell">
    <PageHeader id="positions-summary" eyebrow="Positions" title="포지션" description="전체 전략의 현재 보유 현황입니다." />
    <ListSection id="positions-detail" title="전략별 보유" rows={data.positions as CrossStrategyPosition[]} columns={["strategyName", "symbol", "netQuantity", "avgEntryPrice", "lastFillAt"]} />
  </section>
{:else if route.name === "logs"}
  <section class="page-shell docs-page-shell">
    <PageHeader id="logs-summary" eyebrow="Logs" title="로그" description="실행 로그와 오류 이벤트를 확인합니다." />
    <ListSection id="logs-timeline" title="이벤트 타임라인" rows={data.events as ActivityEvent[]} columns={["category", "severity", "strategyName", "summary", "occurredAt"]} />
  </section>
{:else if route.name === "settings"}
  {@const broker = data.systemBroker as SystemBrokerStatus}
  {@const risk = data.systemRisk as SystemRisk}
  {@const health = data.health as HealthSnapshot}
  <section class="page-shell docs-page-shell">
    <PageHeader id="settings-summary" eyebrow="Settings" title="시스템 설정" description="브로커 연결, 전역 리스크, 시스템 상태를 관리합니다." />
    <div id="settings-broker" class="doc-panel grid-section">
      <h2 class="section-title">브로커 연결</h2>
      <p>현재 모드: {broker.currentSystemMode} / 설정 완료: {broker.isCurrentModeConfigured ? "예" : "아니오"}</p>
      <div class="form-row">
        <select bind:value={brokerConfigForm.targetMode}><option value="paper">paper</option><option value="live">live</option></select>
        <input bind:value={brokerConfigForm.appKey} placeholder="appKey" />
        <input bind:value={brokerConfigForm.appSecret} placeholder="appSecret" />
        <input bind:value={brokerConfigForm.accountNumber} placeholder="accountNumber" />
        <input bind:value={brokerConfigForm.productCode} placeholder="productCode" />
      </div>
      <div class="page-actions">
        <button class="button-primary" type="button" on:click={() => runAction(() => updateBrokerConnectionConfig(brokerConfigForm))}>저장</button>
        <button class="button-secondary" type="button" on:click={() => runAction(() => testBrokerConnection({ targetMode: brokerConfigForm.targetMode }))}>연결 테스트</button>
      </div>
      <ListSection title="브로커 이벤트" rows={data.systemBrokerEvents as BrokerConnectionEvent[]} columns={["targetMode", "eventType", "message", "occurredAt"]} />
    </div>
    <div id="settings-risk" class="doc-panel grid-section">
      <h2 class="section-title">전역 리스크</h2>
      <p>킬스위치: {risk.killSwitchEnabled ? "활성" : "비활성"}</p>
      <button class={risk.killSwitchEnabled ? "button-secondary" : "button-danger"} type="button" on:click={() => runAction(() => updateSystemRiskKillSwitch({ enabled: !risk.killSwitchEnabled }))}>{risk.killSwitchEnabled ? "해제" : "활성화"}</button>
      <ListSection title="리스크 이벤트" rows={data.systemRiskEvents as SystemRiskEvent[]} columns={["eventType", "reasonCode", "message", "occurredAt"]} />
    </div>
    <div id="settings-system" class="dashboard-health-bar">
      <span>{health.appName} {health.version}</span>
      <span class={statusClass(health.status)}>{health.status}</span>
    </div>
  </section>
{:else}
  <section class="page-shell docs-page-shell">
    <div class="empty-state">
      <p class="empty-state-message">요청한 화면을 찾을 수 없습니다.</p>
      <a class="button-primary" href="/">대시보드로 이동</a>
    </div>
  </section>
{/if}
