<script lang="ts">
  import ConfirmDialog from "./ConfirmDialog.svelte";

  export let enabled: boolean;
  export let scope: "system" | "strategy" = "system";
  export let onToggle: (next: boolean) => void | Promise<void>;
  export let compact = false;

  let askingConfirm = false;

  function request() {
    if (!enabled) {
      askingConfirm = true;
    } else {
      void onToggle(false);
    }
  }

  function confirm() {
    askingConfirm = false;
    void onToggle(true);
  }

  $: scopeLabel = scope === "system" ? "신규 주문" : "전략 주문";
  $: titleLabel = enabled ? `${scopeLabel} 차단 중` : `${scopeLabel} 정상 운영`;
</script>

<div class="killswitch" class:killswitch-compact={compact} class:killswitch-off={enabled} class:killswitch-on={!enabled}>
  <div class="killswitch-body">
    <span class="killswitch-label">{titleLabel}</span>
    {#if !compact}
      <p class="killswitch-description">
        {enabled ? "킬스위치가 활성화되어 신규 주문 발주가 중단됩니다." : "킬스위치를 활성화하면 신규 주문이 즉시 중단됩니다."}
      </p>
    {/if}
  </div>
  <button
    class={enabled ? "button-secondary" : "button-danger"}
    type="button"
    on:click={request}
  >
    {enabled ? "차단 해제" : `${scopeLabel} 차단`}
  </button>
</div>

<ConfirmDialog
  open={askingConfirm}
  title={`${scopeLabel} 차단을 시작합니까?`}
  message="활성화하면 새 주문 발주가 즉시 중단됩니다. 진행 중인 주문은 영향을 받지 않습니다."
  confirmLabel="차단 시작"
  variant="danger"
  on:confirm={confirm}
  on:cancel={() => (askingConfirm = false)}
/>
