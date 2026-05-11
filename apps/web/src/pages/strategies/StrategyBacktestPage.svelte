<script lang="ts">
  import ListSection from "@/pages/shared/ListSection.svelte";
  import PageHeader from "@/lib/components/PageHeader.svelte";
  import {
    createBacktest,
    importDailyBars,
    loadMarketCoverage,
    type BacktestRunSummary,
    type MarketCoverage,
    type StrategyDetail,
  } from "@/lib/api";

  export let strategy: StrategyDetail;
  export let runs: BacktestRunSummary[] = [];
  export let runAction: (work: () => Promise<unknown>, success?: () => boolean | void) => Promise<void>;

  let form = {
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    initialCapital: 10000000,
    commissionRate: 0.00015,
    taxRate: 0.0023,
    slippageRate: 0,
    symbols: "",
  };
  let coverage: MarketCoverage | null = null;

  function parseSymbols(): string[] {
    return form.symbols
      .split(/[,\s]+/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  async function submitBacktest() {
    await runAction(async () => {
      const result = await createBacktest({
        strategyId: strategy.id,
        startDate: form.startDate,
        endDate: form.endDate,
        initialCapital: Number(form.initialCapital),
        commissionRate: Number(form.commissionRate),
        taxRate: Number(form.taxRate),
        slippageRate: Number(form.slippageRate),
        symbols: parseSymbols(),
      });
      window.history.pushState({}, "", `/backtests/${result.runId}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
  }

  async function checkCoverage() {
    coverage = await loadMarketCoverage({
      symbols: parseSymbols(),
      startDate: form.startDate,
      endDate: form.endDate,
    });
  }
</script>

<section class="page-shell docs-page-shell">
  <PageHeader
    id="backtest-summary"
    eyebrow="Historical Check"
    title={`${strategy.name} 과거 데이터 점검`}
    description="보조 점검 기능입니다. 여러 종목은 균등 자본으로 독립 시뮬레이션하며 자동 실행 수량 정책과 다를 수 있습니다."
  />
  <form id="backtest-config" class="doc-panel grid-section" on:submit|preventDefault={submitBacktest}>
    <div class="form-row">
      <label class="form-field"><span class="form-label">시작일</span><input type="date" bind:value={form.startDate} /></label>
      <label class="form-field"><span class="form-label">종료일</span><input type="date" bind:value={form.endDate} /></label>
      <label class="form-field"><span class="form-label">초기 자본</span><input type="number" bind:value={form.initialCapital} /></label>
    </div>
    <label class="form-field"><span class="form-label">종목 코드</span><input bind:value={form.symbols} placeholder="005930, 000660" /></label>
    <div class="page-actions">
      <button class="button-secondary" type="button" on:click={checkCoverage}>커버리지 확인</button>
      <button class="button-primary" type="submit">과거 데이터 점검 실행</button>
    </div>
  </form>
  <div id="backtest-datasets" class="doc-panel">
    <input
      type="file"
      on:change={(event) => {
        const file = (event.currentTarget as HTMLInputElement).files?.[0];
        if (file) void runAction(() => importDailyBars(file));
      }}
    />
  </div>
  {#if coverage}
    <ListSection
      id="backtest-coverage"
      title="커버리지"
      rows={coverage.symbols}
      columns={["symbol", "covered", "firstDate", "lastDate"]}
    />
  {/if}
  <ListSection
    id="backtest-runs"
    title="점검 이력"
    rows={runs}
    columns={["runId", "status", "requestedAt", "completedAt"]}
    linkPrefix="/backtests"
    linkKey="runId"
  />
</section>
