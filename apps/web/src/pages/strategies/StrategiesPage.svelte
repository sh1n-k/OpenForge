<script lang="ts">
  import ListSection from "@/pages/shared/ListSection.svelte";
  import PageHeader from "@/lib/components/PageHeader.svelte";
  import { createStrategy, type StrategySummary } from "@/lib/api";

  export let strategies: StrategySummary[] = [];
  export let runAction: (work: () => Promise<unknown>, success?: () => boolean | void) => Promise<void>;

  let form = { name: "", description: "", strategyType: "builder" as "builder" | "code" };

  async function submitStrategy() {
    await runAction(
      async () => {
        const payload =
          form.strategyType === "builder"
            ? {
                builderState: {
                  metadata: { name: form.name, description: form.description },
                  indicators: [],
                  entry: { logic: "AND", conditions: [] },
                  exit: { logic: "AND", conditions: [] },
                  risk: {},
                },
              }
            : {
                source: `version: "1.0"\nmetadata:\n  name: "${form.name}"\nstrategy:\n  id: "${form.name.toLowerCase().replace(/\s+/g, "_")}"`,
              };
        await createStrategy({
          name: form.name,
          description: form.description,
          strategyType: form.strategyType,
          initialPayload: {
            payloadFormat: form.strategyType === "builder" ? "builder_json" : "code_text",
            payload,
            changeSummary: "Initial version",
          },
        });
      },
      () => {
        form = { name: "", description: "", strategyType: "builder" };
      },
    );
  }
</script>

<section class="page-shell docs-page-shell">
  <PageHeader id="strategies-summary" eyebrow="Strategies" title="전략" description="전략 레지스트리와 실행 상태를 관리합니다." />
  <form id="strategies-create" class="doc-panel grid-section" on:submit|preventDefault={submitStrategy}>
    <h2 class="section-title">전략 생성</h2>
    <div class="form-row">
      <label class="form-field"><span class="form-label">이름</span><input bind:value={form.name} required /></label>
      <label class="form-field">
        <span class="form-label">유형</span>
        <select bind:value={form.strategyType}>
          <option value="builder">빌더형</option>
          <option value="code">코드형</option>
        </select>
      </label>
    </div>
    <label class="form-field"><span class="form-label">설명</span><input bind:value={form.description} /></label>
    <button class="button-primary" type="submit">생성</button>
  </form>
  <ListSection
    id="strategies-registry"
    title="전략 레지스트리"
    rows={strategies}
    columns={["name", "strategyType", "status", "latestVersionNumber", "universeCount", "updatedAt"]}
    linkPrefix="/strategies"
    linkKey="id"
  />
</section>
