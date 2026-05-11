<script lang="ts">
  import DataTable from "@/lib/components/DataTable.svelte";

  export let id = "";
  export let title = "";
  export let rows: Record<string, unknown>[] = [];
  export let columns: string[] = [];
  export let linkPrefix: string | undefined = undefined;
  export let linkKey: string | undefined = undefined;
  export let actionLabel: string | undefined = undefined;
  export let action: ((row: Record<string, unknown>) => void | Promise<void>) | undefined = undefined;
</script>

<DataTable {id} {title} {rows} {columns} {linkPrefix} {linkKey} {actionLabel} {action} />
