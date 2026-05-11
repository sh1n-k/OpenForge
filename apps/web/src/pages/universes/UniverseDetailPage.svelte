<script lang="ts">
  import DataTable from "@/lib/components/DataTable.svelte";
  import PageHeader from "@/lib/components/PageHeader.svelte";
  import ConfirmDialog from "@/lib/components/ConfirmDialog.svelte";
  import {
    archiveUniverse,
    collectSymbols,
    replaceUniverseSymbols,
    searchSymbols,
    updateUniverse,
    type SymbolSearchItem,
    type UniverseDetail,
  } from "@/lib/api";

  export let universe: UniverseDetail;
  export let runAction: (work: () => Promise<unknown>, success?: () => boolean | void) => Promise<void>;

  let symbolText = universe.symbols.map((s) => `${s.symbol},${s.exchange},${s.displayName}`).join("\n");
  let symbolQuery = "";
  let symbolResults: SymbolSearchItem[] = [];
  let archiveConfirm = false;
  let meta = { name: universe.name, description: universe.description ?? "" };
  let lastUniverseId: string | null = null;

  $: if (universe.id !== lastUniverseId) {
    lastUniverseId = universe.id;
    meta = { name: universe.name, description: universe.description ?? "" };
    symbolText = universe.symbols.map((s) => `${s.symbol},${s.exchange},${s.displayName}`).join("\n");
  }

  function performArchive() {
    archiveConfirm = false;
    void runAction(
      () => archiveUniverse(universe.id),
      () => {
        window.location.href = "/universes";
        return false;
      },
    );
  }

  function parseSymbolRows() {
    return symbolText
      .split(/\r?\n/)
      .map((line, index) => {
        const [symbol, exchange = "", displayName = symbol] = line.split(",").map((part) => part.trim());
        if (!symbol) return null;
        return {
          symbol,
          exchange,
          displayName,
          market: universe.marketScope,
          sortOrder: index,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  $: metaDirty = meta.name !== universe.name || (meta.description || "") !== (universe.description ?? "");
</script>

<section class="page-shell docs-page-shell">
  <PageHeader id="universe-overview" eyebrow="Symbol Group" title={universe.name} description={universe.description ?? "설명 없음"} />
  <div class="split-grid-narrow">
    <form
      id="universe-basic-info"
      class="doc-panel grid-section"
      on:submit|preventDefault={() =>
        runAction(() => updateUniverse(universe.id, { name: meta.name.trim(), description: meta.description.trim() || undefined }))}
    >
      <h2 class="section-title">기본 정보</h2>
      <p class="section-copy">시장: {universe.marketScope} / 종목 {universe.symbolCount}개</p>
      <div class="form-row">
        <label class="form-field">
          <span class="form-label">이름</span>
          <input bind:value={meta.name} required />
        </label>
        <label class="form-field">
          <span class="form-label">설명</span>
          <input bind:value={meta.description} placeholder="설명을 입력하세요" />
        </label>
      </div>
      <div class="page-actions">
        <button class="button-primary" type="submit" disabled={!metaDirty || !meta.name.trim()}>저장</button>
        <button class="button-danger" type="button" on:click={() => (archiveConfirm = true)}>보관</button>
      </div>
    </form>
    <div id="universe-symbols" class="doc-panel grid-section">
      <h2 class="section-title">종목 구성</h2>
      <textarea bind:value={symbolText} rows="10"></textarea>
      <div class="page-actions">
        <button class="button-primary" type="button" on:click={() => runAction(() => replaceUniverseSymbols(universe.id, parseSymbolRows()))}>
          저장
        </button>
        <button class="button-secondary" type="button" on:click={() => runAction(() => collectSymbols(universe.marketScope))}>
          마스터 수집
        </button>
      </div>
      <div class="form-row">
        <input bind:value={symbolQuery} placeholder="종목 검색" />
        <button
          class="button-secondary"
          type="button"
          on:click={async () => (symbolResults = (await searchSymbols(symbolQuery, universe.marketScope)).items)}
        >
          검색
        </button>
      </div>
      <DataTable title="검색 결과" rows={symbolResults} columns={["code", "name", "exchange", "marketScope"]} />
    </div>
  </div>
</section>

<ConfirmDialog
  open={archiveConfirm}
  title="종목 그룹을 보관합니까?"
  message={`"${universe.name}" 종목 그룹을 보관 처리합니다. 연결된 전략은 종목 그룹이 끊긴 채로 남게 됩니다.`}
  confirmLabel="보관"
  variant="danger"
  on:confirm={performArchive}
  on:cancel={() => (archiveConfirm = false)}
/>
