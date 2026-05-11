<script lang="ts">
  import PageHeader from "@/lib/components/PageHeader.svelte";
  import {
    addStrategyVersion,
    validateStrategy,
    type StrategyDetail,
    type StrategyValidateResponse,
  } from "@/lib/api";
  import {
    deriveBuilderState,
    deriveCodeSource,
    makeBuilderPayload,
    makeCodePayload,
  } from "@/lib/strategy-editor";

  export let strategy: StrategyDetail;
  export let runAction: (work: () => Promise<unknown>, success?: () => boolean | void) => Promise<void>;

  let editorMode: "builder" | "code" = strategy.strategyType;
  let codeSource: string = deriveCodeSource(strategy);
  let changeSummary = "";
  let validation: StrategyValidateResponse | null = null;
  let lastStrategyId: string | null = null;

  $: if (strategy.id !== lastStrategyId) {
    lastStrategyId = strategy.id;
    editorMode = strategy.strategyType;
    codeSource = deriveCodeSource(strategy);
    changeSummary = "";
    validation = null;
  }

  async function submitEditor() {
    const builderState = deriveBuilderState(strategy);
    const payload = editorMode === "builder" ? makeBuilderPayload(builderState) : makeCodePayload(codeSource);
    await runAction(async () => {
      validation = await validateStrategy({
        strategyType: editorMode,
        payloadFormat: editorMode === "builder" ? "builder_json" : "code_text",
        payload,
      });
      if (!validation.valid) return;
      await addStrategyVersion(strategy.id, {
        payloadFormat: editorMode === "builder" ? "builder_json" : "code_text",
        payload,
        changeSummary,
      });
    });
  }
</script>

<section class="page-shell docs-page-shell">
  <PageHeader id="editor-summary" eyebrow="Editor" title={`${strategy.name} 편집`} description="전략 정의를 검증하고 새 버전을 추가합니다." />
  <div id="editor-builder" class="doc-panel grid-section">
    <div class="settings-tabs">
      <button class:settings-tab-active={editorMode === "builder"} class="settings-tab" type="button" on:click={() => (editorMode = "builder")}>빌더</button>
      <button class:settings-tab-active={editorMode === "code"} class="settings-tab" type="button" on:click={() => (editorMode = "code")}>코드</button>
    </div>
    {#if editorMode === "builder"}
      <pre class="code-block">{JSON.stringify(makeBuilderPayload(deriveBuilderState(strategy)), null, 2)}</pre>
    {:else}
      <textarea bind:value={codeSource} rows="18"></textarea>
    {/if}
    <label id="editor-note" class="form-field">
      <span class="form-label">변경 메모</span>
      <input bind:value={changeSummary} />
    </label>
    <button class="button-primary" type="button" on:click={submitEditor}>검증 후 버전 추가</button>
  </div>
  {#if validation}
    <div id="editor-validation" class={validation.valid ? "doc-panel doc-panel-info" : "doc-panel doc-panel-error"}>
      <h2 class="section-title">{validation.valid ? "검증 통과" : "검증 실패"}</h2>
      <p class="section-copy">{validation.summary}</p>
    </div>
  {/if}
</section>
