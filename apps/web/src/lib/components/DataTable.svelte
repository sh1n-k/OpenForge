<script lang="ts" context="module">
  export type DataColumn =
    | string
    | {
        key: string;
        label?: string;
        align?: "left" | "right" | "center";
        format?: (value: unknown, row: Record<string, unknown>) => string;
        link?: { prefix: string; key: string };
        width?: string;
      };

  function normalize(col: DataColumn): {
    key: string;
    label: string;
    align: "left" | "right" | "center";
    format?: (value: unknown, row: Record<string, unknown>) => string;
    link?: { prefix: string; key: string };
    width?: string;
  } {
    if (typeof col === "string") {
      return { key: col, label: col, align: "left" };
    }
    return {
      key: col.key,
      label: col.label ?? col.key,
      align: col.align ?? "left",
      format: col.format,
      link: col.link,
      width: col.width,
    };
  }

  function defaultFormat(value: unknown): string {
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

<script lang="ts">
  export let id: string = "";
  export let title: string = "";
  export let rows: Record<string, unknown>[] = [];
  export let columns: DataColumn[] = [];
  export let linkPrefix: string | undefined = undefined;
  export let linkKey: string | undefined = undefined;
  export let actionLabel: string | undefined = undefined;
  export let action: ((row: Record<string, unknown>) => void | Promise<void>) | undefined = undefined;
  export let density: "default" | "compact" = "default";
  export let emptyMessage: string = "표시할 데이터가 없습니다.";
  export let loading: boolean = false;
  export let footer: boolean = false;

  $: normalizedColumns = columns.map((col, index) => {
    const c = normalize(col);
    if (index === 0 && !c.link && linkPrefix && linkKey) {
      c.link = { prefix: linkPrefix, key: linkKey };
    }
    return c;
  });

  function renderCell(col: ReturnType<typeof normalize>, row: Record<string, unknown>): string {
    const value = row[col.key];
    if (col.format) return col.format(value, row);
    return defaultFormat(value);
  }
</script>

<section {id} class="doc-panel grid-section data-table" data-density={density}>
  {#if title}
    <div class="flex-between">
      <h2 class="section-title">{title}</h2>
      <span class="section-count">{rows.length}</span>
    </div>
  {/if}
  {#if loading}
    <div class="table-shell">
      <div class="data-table-skeleton">
        {#each [0, 1, 2, 3] as i (i)}
          <div class="skeleton skeleton-row" data-index={i}></div>
        {/each}
      </div>
    </div>
  {:else if rows.length === 0}
    <slot name="empty">
      <div class="empty-state empty-state-compact">
        <p class="empty-state-message">{emptyMessage}</p>
      </div>
    </slot>
  {:else}
    <div class="table-shell">
      <table class="doc-table" class:doc-table-compact={density === "compact"}>
        <thead>
          <tr>
            {#each normalizedColumns as column}
              <th scope="col" style={column.width ? `width:${column.width}` : undefined} class="align-{column.align}">
                {column.label}
              </th>
            {/each}
            {#if actionLabel}<th scope="col">action</th>{/if}
          </tr>
        </thead>
        <tbody>
          {#each rows as row}
            <tr>
              {#each normalizedColumns as column}
                <td class="align-{column.align}">
                  {#if column.link && row[column.link.key]}
                    <a class="table-link" href={`${column.link.prefix}/${row[column.link.key]}`}>
                      {renderCell(column, row)}
                    </a>
                  {:else}
                    {renderCell(column, row)}
                  {/if}
                </td>
              {/each}
              {#if actionLabel && action}
                <td>
                  <button class="button-secondary" type="button" on:click={() => action?.(row)}>
                    {actionLabel}
                  </button>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
        {#if footer}
          <tfoot>
            <tr>
              <td colspan={normalizedColumns.length + (actionLabel ? 1 : 0)}>
                <slot name="footer" />
              </td>
            </tr>
          </tfoot>
        {/if}
      </table>
    </div>
  {/if}
</section>
