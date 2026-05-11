<script lang="ts">
  import ListSection from "@/pages/shared/ListSection.svelte";
  import PageHeader from "@/lib/components/PageHeader.svelte";
  import {
    startBrokerLedgerSync,
    type BrokerLedgerMarket,
    type BrokerLedgerStatus,
    type BrokerLedgerSyncRun,
  } from "@/lib/api";

  export let status: BrokerLedgerStatus;
  export let runs: BrokerLedgerSyncRun[] = [];
  export let runAction: (work: () => Promise<unknown>, success?: () => boolean | void) => Promise<void>;

  let form = { startDate: "2025-01-01", endDate: "2025-12-31", domestic: true, overseas: false };
</script>

<section class="page-shell docs-page-shell">
  <PageHeader id="broker-summary" eyebrow="Broker" title="브로커" description={`실전 설정: ${status.liveConfigured ? "완료" : "미설정"}`} />
  <div class="split-grid-narrow">
    <form
      id="broker-sync"
      class="doc-panel grid-section"
      on:submit|preventDefault={() =>
        runAction(() =>
          startBrokerLedgerSync({
            startDate: form.startDate,
            endDate: form.endDate,
            markets: [form.domestic ? "domestic" : null, form.overseas ? "overseas" : null].filter(Boolean) as BrokerLedgerMarket[],
          }),
        )}
    >
      <div class="form-row">
        <input type="date" bind:value={form.startDate} />
        <input type="date" bind:value={form.endDate} />
      </div>
      <div class="form-actions">
        <button class="button-primary" type="submit">동기화 시작</button>
      </div>
    </form>
    <ListSection
      id="broker-sync-runs"
      title="동기화 이력"
      rows={runs}
      columns={["status", "startDate", "endDate", "tradeCount", "balanceCount", "profitCount"]}
    />
  </div>
</section>
