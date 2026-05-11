<script lang="ts">
  import ListSection from "@/pages/shared/ListSection.svelte";
  import PageHeader from "@/lib/components/PageHeader.svelte";
  import type { CrossStrategyPosition } from "@/lib/api";

  export let positions: CrossStrategyPosition[] = [];
</script>

<section class="page-shell docs-page-shell">
  <PageHeader id="positions-summary" eyebrow="Positions" title="포지션" description="전체 전략의 현재 보유 현황입니다." />
  <ListSection
    id="positions-detail"
    title="전략별 보유"
    rows={positions}
    columns={["strategyName", "symbol", "netQuantity", "avgEntryPrice", "lastFillAt"]}
  />
</section>
