<script lang="ts">
  import EmptyState from "@/lib/components/EmptyState.svelte";
</script>

<section class="page-shell docs-page-shell">
  <EmptyState
    message="요청한 화면을 찾을 수 없습니다."
    hint="주소가 정확한지 확인하거나 대시보드로 이동하세요."
    actionLabel="대시보드로 이동"
    actionHref="/"
  />
</section>
