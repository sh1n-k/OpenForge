<script lang="ts">
  import DataTable from "@/lib/components/DataTable.svelte";
  import PageHeader from "@/lib/components/PageHeader.svelte";
  import { createUniverse, type UniverseSummary } from "@/lib/api";

  export let universes: UniverseSummary[] = [];
  export let runAction: (work: () => Promise<unknown>, success?: () => boolean | void) => Promise<void>;

  let form = { name: "", description: "", marketScope: "domestic" as "domestic" | "us" };

  async function submitUniverse() {
    await runAction(
      async () => {
        await createUniverse(form);
      },
      () => {
        form = { name: "", description: "", marketScope: "domestic" };
      },
    );
  }
</script>

<section class="page-shell docs-page-shell">
  <PageHeader id="universes-summary" eyebrow="Symbol Groups" title="종목 그룹" description="전략에 연결할 종목 묶음을 관리합니다." />
  <div class="split-grid-narrow">
    <form id="universes-create" class="doc-panel grid-section" on:submit|preventDefault={submitUniverse}>
      <div class="form-row">
        <label class="form-field"><span class="form-label">이름</span><input bind:value={form.name} required /></label>
        <label class="form-field">
          <span class="form-label">시장</span>
          <select bind:value={form.marketScope}>
            <option value="domestic">국내</option>
            <option value="us">미국</option>
          </select>
        </label>
      </div>
      <label class="form-field"><span class="form-label">설명</span><input bind:value={form.description} /></label>
      <div class="form-actions">
        <button class="button-primary" type="submit">생성</button>
      </div>
    </form>
    <DataTable
      id="universes-registry"
      title="레지스트리"
      rows={universes}
      columns={["name", "marketScope", "symbolCount", "strategyCount", "updatedAt"]}
      linkPrefix="/universes"
      linkKey="id"
    />
  </div>
</section>
