<script lang="ts">
  import { onMount } from "svelte";
  import type { Component } from "svelte";
  import ListSection from "@/pages/shared/ListSection.svelte";
  import PageHeader from "@/lib/components/PageHeader.svelte";
  import type { BacktestRunDetail } from "@/lib/api";
  import { shortId } from "@/lib/format";

  export let run: BacktestRunDetail;

  $: equityData = run.equityCurve.map((point) => ({
    tradingDate: point.tradingDate,
    equity: point.equity,
    drawdown: point.drawdown,
  }));

  // uPlot은 ~50KB. 백테스트 결과 화면에서만 로드되도록 동적 import.
  let EquityChart: Component<{ data: typeof equityData; height?: number; showDrawdown?: boolean }> | null = null;
  let chartError: string | null = null;

  onMount(async () => {
    try {
      const mod = await import("@/lib/components/EquityChart.svelte");
      EquityChart = mod.default as typeof EquityChart;
    } catch (e) {
      chartError = e instanceof Error ? e.message : "차트 모듈을 불러오지 못했습니다.";
    }
  });
</script>

<section class="page-shell docs-page-shell">
  <PageHeader
    id="run-summary"
    eyebrow="Historical Check"
    title={`과거 데이터 점검 ${shortId(run.runId)}`}
    description={run.errorMessage ?? `상태: ${run.status}`}
  />
  <div id="run-charts" class="doc-panel grid-section">
    <div class="flex-between">
      <h2 class="section-title">자산 곡선</h2>
      <span class="section-count">{run.equityCurve.length}일</span>
    </div>
    {#if EquityChart}
      {@const Chart = EquityChart}
      <Chart data={equityData} />
    {:else if chartError}
      <p class="text-error">{chartError}</p>
    {:else}
      <div class="skeleton" style="height: 260px"></div>
    {/if}
    <details>
      <summary class="text-subtle">자산 곡선 표 펼치기</summary>
      <ListSection
        title=""
        rows={run.equityCurve as unknown as Record<string, unknown>[]}
        columns={["tradingDate", "equity", "cash", "drawdown"]}
      />
    </details>
  </div>
  <details id="run-config" class="doc-panel grid-section">
    <summary class="section-title">실행 설정</summary>
    <pre class="code-block">{JSON.stringify(run.config, null, 2)}</pre>
  </details>
  <ListSection
    id="run-trades"
    title="거래 이력"
    rows={run.trades as unknown as Record<string, unknown>[]}
    columns={["symbol", "entryDate", "exitDate", "quantity", "netPnl", "exitReason"]}
  />
</section>
