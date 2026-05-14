<script lang="ts">
  import ListSection from "@/pages/shared/ListSection.svelte";
  import KillSwitchToggle from "@/lib/components/KillSwitchToggle.svelte";
  import ConfirmDialog from "@/lib/components/ConfirmDialog.svelte";
  import Tabs from "@/lib/components/Tabs.svelte";
  import {
    archiveStrategy,
    approveRebalancePlan,
    cloneStrategy,
    createOrderRequest,
    createRebalancePlanFromLedger,
    replaceStrategyUniverses,
    sendRebalancePlan,
    syncRebalancePlan,
    updateStrategyExecution,
    updateStrategyRisk,
    type BrokerLedgerStatus,
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
  export let rebalancePlans: RebalancePlan[] = [];
  export let brokerLedgerStatus: BrokerLedgerStatus;
  export let runAction: (work: () => Promise<unknown>, success?: () => boolean | void) => Promise<void>;

  type TargetRow = {
    id: number;
    symbol: string;
    targetWeightPercent: number;
    price: string;
  };

  let selectedUniverseIds: string[] = strategy.universes.map((u) => u.id);
  let archiveConfirm = false;
  let rebalanceTargetRows: TargetRow[] = [
    { id: 1, symbol: "005930", targetWeightPercent: 50, price: "" },
    { id: 2, symbol: "000660", targetWeightPercent: 30, price: "" },
  ];
  let nextTargetRowId = 3;
  let rebalanceMode: "paper" | "live" = "paper";
  let rebalanceCashOverride = "";
  let rebalanceMaxAgeMinutes = 60;
  let rebalanceMarketOpen = true;
  let rebalanceHoliday = false;
  let rebalanceApprovedBy = "owner";
  let rebalanceMarketClosed = false;
  let liveConfirmationPhrase = "";
  let liveChecklistAccepted = false;
  $: selectedUniverseIds = strategy.universes.map((u) => u.id);
  $: targetWeightTotal = rebalanceTargetRows.reduce((sum, row) => sum + Number(row.targetWeightPercent || 0), 0);
  $: targetWeightValid = Math.abs(targetWeightTotal - 100) < 0.0001;
  $: ledgerSnapshotTime = brokerLedgerStatus?.latestSuccessfulSyncRun?.completedAt ?? brokerLedgerStatus?.latestSuccessfulSyncRun?.requestedAt ?? null;

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
    { id: "rebalance", label: "리밸런싱" },
    { id: "positions", label: "포지션" },
    { id: "activity", label: "활동" },
  ];
  let active = "overview";

  function parseRebalanceTargets() {
    return rebalanceTargetRows
      .map((row) => ({
        symbol: row.symbol.trim(),
        targetWeight: Number(row.targetWeightPercent) / 100,
        price: row.price.trim() === "" ? null : Number(row.price),
      }))
      .filter((row) => row.symbol);
  }

  function addTargetRow() {
    rebalanceTargetRows = [
      ...rebalanceTargetRows,
      { id: nextTargetRowId, symbol: "", targetWeightPercent: 0, price: "" },
    ];
    nextTargetRowId += 1;
  }

  function removeTargetRow(rowId: number) {
    rebalanceTargetRows = rebalanceTargetRows.filter((row) => row.id !== rowId);
  }

  function createLedgerPlan() {
    const cashOverride = rebalanceCashOverride.trim() === "" ? null : Number(rebalanceCashOverride);
    if (!targetWeightValid) return;
    void runAction(() =>
      createRebalancePlanFromLedger(strategy.id, {
        mode: rebalanceMode,
        maxSnapshotAgeMinutes: Number(rebalanceMaxAgeMinutes),
        cashOverride,
        marketOpen: rebalanceMarketOpen,
        holiday: rebalanceHoliday,
        targetWeights: parseRebalanceTargets(),
      }),
    );
  }

  function riskReasonText(plan: RebalancePlan) {
    const reasonCodes = plan.riskSummary.reasonCodes;
    return Array.isArray(reasonCodes) && reasonCodes.length > 0 ? reasonCodes.join(", ") : "통과";
  }

  function formatNumber(value: unknown) {
    return typeof value === "number" ? value.toLocaleString("ko-KR") : "-";
  }

  function orderReasonText(order: RebalancePlan["orders"][number]) {
    const reasonCodes = order.precheckSummary.reasonCodes;
    if (Array.isArray(reasonCodes) && reasonCodes.length > 0) return reasonCodes.join(", ");
    return order.brokerResponseMessage ?? "-";
  }
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
      <div class="split-grid">
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
            <div class="form-actions">
              <button
                class="button-primary"
                type="button"
                on:click={() => runAction(() => replaceStrategyUniverses(strategy.id, selectedUniverseIds))}
              >
                종목 그룹 저장
              </button>
            </div>
          {/if}
        </div>
        <div id="strategy-execution" class="doc-panel grid-section">
          <h2 class="section-title">자동 실행</h2>
          <p class="section-copy">다음 실행: {formatDateTime(execution.nextRunAt) ?? "대기 중"}</p>
          <p class="section-copy">실행 전 유효한 전략 버전, 국내 종목 그룹 연결, 종목 구성, 리스크 설정을 확인합니다.</p>
          <div class="form-actions">
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
        </div>
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
      <div class="split-grid">
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
    </div>
  {/if}

  {#if active === "rebalance"}
    <div class="grid-section" role="tabpanel" id="rebalance" aria-labelledby="tab-rebalance">
      <div class="split-grid">
        <form id="strategy-rebalance-create" class="doc-panel grid-section" on:submit|preventDefault={createLedgerPlan}>
          <h2 class="section-title">계획 생성</h2>
          <p class="section-copy">최신 원장: {formatDateTime(ledgerSnapshotTime) ?? "성공한 원장 없음"}</p>
          <label class="form-field" for="rebalance-mode">
            <span class="form-label">모드</span>
            <select id="rebalance-mode" bind:value={rebalanceMode}>
              <option value="paper">paper</option>
              <option value="live">live</option>
            </select>
          </label>
          <div class="target-weight-toolbar">
            <span class={targetWeightValid ? "text-primary" : "text-warning"}>목표 비중 합계 {targetWeightTotal.toFixed(2)}%</span>
            <button class="button-secondary" type="button" on:click={addTargetRow}>행 추가</button>
          </div>
          <div class="table-shell">
            <table class="doc-table doc-table-compact">
              <thead>
                <tr>
                  <th>종목</th>
                  <th>목표 %</th>
                  <th>가격</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {#each rebalanceTargetRows as row (row.id)}
                  <tr>
                    <td><input aria-label="종목" type="text" bind:value={row.symbol} /></td>
                    <td><input aria-label="목표 비중" type="number" min="0" max="100" step="0.01" bind:value={row.targetWeightPercent} /></td>
                    <td><input aria-label="가격" type="number" min="0" step="1" bind:value={row.price} /></td>
                    <td>
                      <button class="button-secondary" type="button" disabled={rebalanceTargetRows.length <= 1} on:click={() => removeTargetRow(row.id)}>삭제</button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <div class="form-row">
            <label class="form-field" for="rebalance-cash">
              <span class="form-label">현금 보정</span>
              <input id="rebalance-cash" type="number" min="0" step="1" bind:value={rebalanceCashOverride} />
            </label>
            <label class="form-field" for="rebalance-age">
              <span class="form-label">스냅샷 최대 분</span>
              <input id="rebalance-age" type="number" min="1" max="1440" bind:value={rebalanceMaxAgeMinutes} />
            </label>
          </div>
          <div class="checkbox-list">
            <label class="checkbox-row">
              <input type="checkbox" bind:checked={rebalanceMarketOpen} />
              <span>장 열림</span>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" bind:checked={rebalanceHoliday} />
              <span>휴장</span>
            </label>
          </div>
          <div class="form-actions">
            <button class="button-primary" type="submit" disabled={!targetWeightValid}>원장으로 계획 생성</button>
          </div>
        </form>

        <div class="doc-panel grid-section">
          <h2 class="section-title">운영 설정</h2>
          <label class="form-field" for="rebalance-approved-by">
            <span class="form-label">승인자</span>
            <input id="rebalance-approved-by" type="text" bind:value={rebalanceApprovedBy} />
          </label>
          <label class="checkbox-row">
            <input type="checkbox" bind:checked={rebalanceMarketClosed} />
            <span>동기화 시 장마감 처리</span>
          </label>
          <label class="checkbox-row">
            <input type="checkbox" bind:checked={liveChecklistAccepted} />
            <span>live 운영 체크리스트 완료</span>
          </label>
          <label class="form-field" for="live-confirmation-phrase">
            <span class="form-label">live 확인 문구</span>
            <input id="live-confirmation-phrase" type="text" bind:value={liveConfirmationPhrase} />
          </label>
        </div>
      </div>

      <div class="doc-panel grid-section">
        <h2 class="section-title">리밸런싱 계획</h2>
        {#if rebalancePlans.length === 0}
          <p class="section-copy">생성된 계획이 없습니다.</p>
        {:else}
          <div class="table-shell">
            <table class="doc-table doc-table-compact">
              <thead>
                <tr>
                  <th>상태</th>
                  <th>모드</th>
                  <th>위험</th>
                  <th>주문</th>
                  <th>계획 시각</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {#each rebalancePlans as plan}
                  <tr>
                    <td>{plan.status}</td>
                    <td>{plan.mode}</td>
                    <td>{plan.failureReason ?? riskReasonText(plan)}</td>
                    <td>{plan.orders.length}</td>
                    <td>{formatDateTime(plan.plannedAt)}</td>
                    <td>
                      <div class="inline-actions">
                        <button
                          class="button-secondary"
                          type="button"
                          disabled={plan.status !== "planned"}
                          on:click={() =>
                            runAction(() =>
                              approveRebalancePlan(strategy.id, plan.id, {
                                approvedBy: rebalanceApprovedBy,
                                confirmLiveRisk: plan.mode === "live",
                                liveChecklistAccepted,
                                liveConfirmationPhrase,
                              }),
                            )}
                        >
                          승인
                        </button>
                        <button
                          class="button-secondary"
                          type="button"
                          disabled={plan.status !== "approved"}
                          on:click={() => runAction(() => sendRebalancePlan(strategy.id, plan.id))}
                        >
                          전송
                        </button>
                        <button
                          class="button-secondary"
                          type="button"
                          disabled={!["sent", "unknown"].includes(plan.status)}
                          on:click={() => runAction(() => syncRebalancePlan(strategy.id, plan.id, { marketClosed: rebalanceMarketClosed }))}
                        >
                          동기화
                        </button>
                      </div>
                    </td>
                  </tr>
                  {#if plan.orders.length > 0}
                    <tr class="rebalance-order-row">
                      <td colspan="6">
                        <div class="order-strip">
                          {#each plan.orders as order}
                            <span>{order.symbol} {order.side} {order.quantity}주 · {formatNumber(order.notional)} · {order.status} · {orderReasonText(order)}</span>
                          {/each}
                        </div>
                      </td>
                    </tr>
                  {/if}
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
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
      <div class="split-grid">
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
