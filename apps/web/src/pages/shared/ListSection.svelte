<script lang="ts">
  export let id = "";
  export let title = "";
  export let rows: Record<string, unknown>[] = [];
  export let columns: string[] = [];
  export let linkPrefix: string | undefined = undefined;
  export let linkKey: string | undefined = undefined;
  export let actionLabel: string | undefined = undefined;
  export let action: ((row: Record<string, unknown>) => void | Promise<void>) | undefined = undefined;

  function valueOf(row: Record<string, unknown>, key: string) {
    const value = row[key];
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "number") {
      return Number.isInteger(value)
        ? value.toLocaleString("ko-KR")
        : value.toLocaleString("ko-KR", { maximumFractionDigits: 4 });
    }
    if (typeof value === "boolean") return value ? "예" : "아니오";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }
</script>

<section {id} class="doc-panel grid-section">
  <div class="flex-between">
    <h2 class="section-title">{title}</h2>
    <span class="section-count">{rows.length}</span>
  </div>
  {#if rows.length === 0}
    <div class="empty-state empty-state-compact">
      <p class="empty-state-message">표시할 데이터가 없습니다.</p>
    </div>
  {:else}
    <div class="table-shell">
      <table class="doc-table">
        <thead>
          <tr>
            {#each columns as column}
              <th>{column}</th>
            {/each}
            {#if actionLabel}
              <th>action</th>
            {/if}
          </tr>
        </thead>
        <tbody>
          {#each rows as row}
            <tr>
              {#each columns as column, index}
                <td>
                  {#if index === 0 && linkPrefix && linkKey && row[linkKey]}
                    <a class="table-link" href={`${linkPrefix}/${row[linkKey]}`}>{valueOf(row, column)}</a>
                  {:else}
                    {valueOf(row, column)}
                  {/if}
                </td>
              {/each}
              {#if actionLabel && action}
                <td>
                  <button class="button-secondary" type="button" on:click={() => action?.(row)}>{actionLabel}</button>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
