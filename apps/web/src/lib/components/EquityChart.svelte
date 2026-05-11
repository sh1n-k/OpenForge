<script lang="ts" context="module">
  export interface EquityPoint {
    tradingDate: string;
    equity: number;
    drawdown: number;
  }
</script>

<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import uPlot, { type Options } from "uplot";
  import "uplot/dist/uPlot.min.css";
  import { baseAxisStyle, readChartTheme, type ChartTheme } from "@/lib/charts/uplot-theme";
  import { subscribeTheme } from "@/lib/theme";

  export let data: EquityPoint[] = [];
  export let height = 260;
  export let showDrawdown = true;

  let container: HTMLDivElement;
  let chart: uPlot | null = null;
  let unsubscribe: (() => void) | null = null;

  function buildSeries(points: EquityPoint[]): uPlot.AlignedData {
    const xs = points.map((p) => Math.floor(new Date(p.tradingDate).getTime() / 1000));
    const equity = points.map((p) => p.equity);
    const drawdown = points.map((p) => p.drawdown);
    return [xs, equity, drawdown];
  }

  function buildOptions(theme: ChartTheme, width: number): Options {
    const axis = baseAxisStyle(theme);
    const axes: NonNullable<Options["axes"]> = [
      { ...axis },
      { ...axis, label: "자산", labelGap: 8 },
    ];
    const series: NonNullable<Options["series"]> = [
      {},
      {
        label: "자산",
        stroke: theme.primary,
        width: 1.6,
        fill: `${theme.primary}1f`,
        points: { show: false },
      },
    ];
    if (showDrawdown) {
      axes.push({
        ...axis,
        side: 1,
        scale: "dd",
        label: "낙폭(%)",
        values: (_u, vals) => vals.map((v) => `${(v * 100).toFixed(1)}%`),
      });
      series.push({
        label: "낙폭",
        scale: "dd",
        stroke: theme.error,
        width: 1.2,
        dash: [4, 3],
        points: { show: false },
      });
    }
    return {
      width,
      height,
      padding: [12, 12, 4, 4],
      legend: { show: true },
      cursor: { lock: false, drag: { x: true, y: false } },
      scales: {
        x: { time: true },
        y: { auto: true },
        dd: { auto: true },
      },
      axes,
      series,
    };
  }

  function rebuild() {
    if (!container) return;
    const theme = readChartTheme();
    const opts = buildOptions(theme, container.clientWidth);
    if (chart) {
      chart.destroy();
      chart = null;
    }
    if (data.length === 0) return;
    chart = new uPlot(opts, buildSeries(data), container);
  }

  onMount(() => {
    rebuild();
    unsubscribe = subscribeTheme(() => rebuild());
    const handleResize = () => {
      if (chart && container) chart.setSize({ width: container.clientWidth, height });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  onDestroy(() => {
    chart?.destroy();
    chart = null;
    unsubscribe?.();
  });

  $: if (chart && data.length > 0) {
    chart.setData(buildSeries(data));
  } else if (!chart && container && data.length > 0) {
    rebuild();
  }
</script>

<div class="equity-chart" bind:this={container} style={`min-height:${height}px`}>
  {#if data.length === 0}
    <p class="empty-state-message">표시할 자산 곡선 데이터가 없습니다.</p>
  {/if}
</div>
