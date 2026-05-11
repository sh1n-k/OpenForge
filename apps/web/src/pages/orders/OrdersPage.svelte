<script lang="ts">
  import ListSection from "@/pages/shared/ListSection.svelte";
  import PageHeader from "@/lib/components/PageHeader.svelte";
  import type { CrossStrategyFill, CrossStrategyOrderRequest } from "@/lib/api";

  export let orders: CrossStrategyOrderRequest[] = [];
  export let fills: CrossStrategyFill[] = [];
</script>

<section class="page-shell docs-page-shell">
  <PageHeader id="orders-summary" eyebrow="Orders" title="주문" description="전체 전략의 주문 요청과 체결 내역입니다." />
  <ListSection
    id="orders-requests"
    title="주문 요청"
    rows={orders}
    columns={["strategyName", "symbol", "side", "quantity", "price", "status", "requestedAt"]}
  />
  <ListSection
    id="orders-fills"
    title="체결 내역"
    rows={fills}
    columns={["strategyName", "symbol", "side", "quantity", "price", "realizedPnl", "filledAt"]}
  />
</section>
