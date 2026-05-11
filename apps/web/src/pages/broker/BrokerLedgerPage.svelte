<script lang="ts">
  import ListSection from "@/pages/shared/ListSection.svelte";
  import PageHeader from "@/lib/components/PageHeader.svelte";
  import type {
    BrokerLedgerBalance,
    BrokerLedgerProfit,
    BrokerLedgerTrade,
  } from "@/lib/api";

  export let trades: BrokerLedgerTrade[] = [];
  export let balances: BrokerLedgerBalance[] = [];
  export let profits: BrokerLedgerProfit[] = [];
</script>

<section class="page-shell docs-page-shell">
  <PageHeader
    id="broker-ledger-summary"
    eyebrow="Broker Ledger"
    title="브로커 원장"
    description="최근 성공 동기화 기준 원장을 조회합니다."
  />
  <ListSection
    id="broker-ledger-trades"
    title="거래 원장"
    rows={trades}
    columns={["market", "symbol", "symbolName", "side", "quantity", "price", "realizedPnl"]}
  />
  <ListSection
    id="broker-ledger-balances"
    title="잔고 스냅샷"
    rows={balances}
    columns={["market", "symbol", "symbolName", "quantity", "averagePrice", "valuationAmount", "unrealizedPnl"]}
  />
  <ListSection
    id="broker-ledger-profits"
    title="손익 스냅샷"
    rows={profits}
    columns={["market", "symbol", "symbolName", "realizedPnl", "profitRate", "currency"]}
  />
</section>
