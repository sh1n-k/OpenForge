<script lang="ts">
  import ListSection from "@/pages/shared/ListSection.svelte";
  import PageHeader from "@/lib/components/PageHeader.svelte";
  import type { ActivityEvent } from "@/lib/api";

  export let events: ActivityEvent[] = [];
</script>

<section class="page-shell docs-page-shell">
  <PageHeader id="logs-summary" eyebrow="Logs" title="로그" description="실행 로그와 오류 이벤트를 확인합니다." />
  <ListSection
    id="logs-timeline"
    title="이벤트 타임라인"
    rows={events}
    columns={["category", "severity", "strategyName", "summary", "occurredAt"]}
  />
</section>
