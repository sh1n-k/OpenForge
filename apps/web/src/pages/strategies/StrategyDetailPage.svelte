<script lang="ts">
  import ListSection from "@/pages/shared/ListSection.svelte";
  import KillSwitchToggle from "@/lib/components/KillSwitchToggle.svelte";
  import ConfirmDialog from "@/lib/components/ConfirmDialog.svelte";
  import Tabs from "@/lib/components/Tabs.svelte";
  import {
    archiveStrategy,
    cloneStrategy,
    createOrderRequest,
    replaceStrategyUniverses,
    updateStrategyExecution,
    updateStrategyRisk,
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
    type StrategyVersion,
    type UniverseSummary,
  } from "@/lib/api";
  import { formatDateTime } from "@/lib/format";

  export let strategy: StrategyDetail;
  export let versions: StrategyVersion[] = [];
  export let execution: StrategyExecutionResponse;
  export let runs: StrategyExecutionRun[] = [];
  export let signals: StrategySignalEvent[] = [];
  export let orderCandidates: OrderCandidate[] = [];
  export let orderRequests: OrderRequest[] = [];
  export let riskConfig: StrategyRiskConfig;
  export let riskEvents: StrategyRiskEvent[] = [];
  export let positions: StrategyPosition[] = [];
  export let requestsWithEvents: OrderRequestWithEvents[] = [];
  export let availableUniverses: UniverseSummary[] = [];
  export let runAction: (work: () => Promise<unknown>, success?: () => boolean | void) => Promise<void>;

  let selectedUniverseIds: string[] = strategy.universes.map((u) => u.id);
  let archiveConfirm = false;
  $: selectedUniverseIds = strategy.universes.map((u) => u.id);

  function toggleUniverseSelection(universeId: string, checked: boolean) {
    selectedUniverseIds = checked
      ? [...new Set([...selectedUniverseIds, universeId])]
      : selectedUniverseIds.filter((id) => id !== universeId);
  }

  function performArchive() {
    archiveConfirm = false;
    void runAction(
      () => archiveStrategy(strategy.id),
      () => {
        window.location.href = "/strategies";
        return false;
      },
    );
  }

  const tabs = [
    { id: "overview", label: "개요" },
    { id: "versions", label: "버전" },
    { id: "orders", label: "시그널·주문" },
    { id: "positions", label: "포지션" },
    { id: "activity", label: "활동" },
  ];
  let active = "overview";
</script>

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
        <button class="button-danger" type="button" on:click={() => (archiveConfirm = true)}>보관</button>
      </div>
    </div>
  </header>

  <Tabs {tabs} bind:active label="전략 상세 섹션" syncHash />

  {#if active === "overview"}
    <div class="grid-section" role="tabpanel" id="overview" aria-labelledby="tab-overview">
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
          <button
            class="button-primary"
            type="button"
            on:click={() => runAction(() => replaceStrategyUniverses(strategy.id, selectedUniverseIds))}
          >
            종목 그룹 저장
          </button>
        {/if}
      </div>
      <div id="strategy-execution" class="doc-panel grid-section">
        <h2 class="section-title">자동 실행</h2>
        <p class="section-copy">다음 실행: {formatDateTime(execution.nextRunAt) ?? "대기 중"}</p>
        <p class="section-copy">실행 전 유효한 전략 버전, 국내 종목 그룹 연결, 종목 구성, 리스크 설정을 확인합니다.</p>
        <button
          class={execution.enabled ? "button-danger" : "button-primary"}
          type="button"
          on:click={() =>
            runAction(() =>
              updateStrategyExecution(strategy.id, {
                enabled: !execution.enabled,
                scheduleTime: execution.scheduleTime,
                timezone: execution.timezone,
                mode: "paper",
              }),
            )}
        >
          {execution.enabled ? "실행 중지" : "실행 활성화"}
        </button>
      </div>
      <div id="strategy-risk" class="doc-panel grid-section">
        <h2 class="section-title">리스크</h2>
        <KillSwitchToggle
          enabled={riskConfig.strategyKillSwitchEnabled}
          scope="strategy"
          onToggle={(next) =>
            runAction(() =>
              updateStrategyRisk(strategy.id, {
                ...riskConfig,
                strategyKillSwitchEnabled: next,
              }),
            )}
        />
      </div>
    </div>
  {/if}

  {#if active === "versions"}
    <div class="grid-section" role="tabpanel" id="versions" aria-labelledby="tab-versions">
      <ListSection
        id="strategy-versions"
        title="버전"
        rows={versions}
        columns={["versionNumber", "payloadFormat", "validationStatus", "changeSummary", "createdAt"]}
      />
    </div>
  {/if}

  {#if active === "orders"}
    <div class="grid-section" role="tabpanel" id="orders" aria-labelledby="tab-orders">
      <ListSection
        id="strategy-orders"
        title="주문 후보"
        rows={orderCandidates}
        columns={["symbol", "side", "quantity", "price", "mode", "alreadyRequested"]}
        actionLabel="주문 요청"
        action={(row) =>
          runAction(() =>
            createOrderRequest(strategy.id, { signalEventId: (row as OrderCandidate).signalEventId, mode: "paper" }),
          )}
      />
      <ListSection
        title="주문 요청"
        rows={orderRequests}
        columns={["symbol", "side", "quantity", "price", "currentStatus", "requestedAt"]}
      />
      <ListSection
        title="시그널"
        rows={signals}
        columns={["symbol", "signalType", "tradingDate", "createdAt"]}
      />
      <ListSection
        title="상태 이벤트"
        rows={requestsWithEvents.flatMap((item) => item.statusEvents)}
        columns={["status", "reason", "occurredAt"]}
      />
    </div>
  {/if}

  {#if active === "positions"}
    <div class="grid-section" role="tabpanel" id="positions" aria-labelledby="tab-positions">
      <ListSection
        title="포지션"
        rows={positions}
        columns={["symbol", "netQuantity", "avgEntryPrice", "lastFillAt"]}
      />
    </div>
  {/if}

  {#if active === "activity"}
    <div class="grid-section" role="tabpanel" id="activity" aria-labelledby="tab-activity">
      <ListSection
        id="strategy-activity"
        title="실행 로그"
        rows={runs}
        columns={["runId", "status", "scheduledDate", "signalCount", "errorMessage"]}
      />
      <ListSection
        title="리스크 이벤트"
        rows={riskEvents}
        columns={["scope", "eventType", "reasonCode", "message", "occurredAt"]}
      />
    </div>
  {/if}
</section>

<ConfirmDialog
  open={archiveConfirm}
  title="전략을 보관합니까?"
  message={`"${strategy.name}" 전략을 보관 처리합니다. 보관된 전략은 목록에서 사라지며, 실행이 자동으로 중단됩니다.`}
  confirmLabel="보관"
  variant="danger"
  on:confirm={performArchive}
  on:cancel={() => (archiveConfirm = false)}
/>
