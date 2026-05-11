<script lang="ts">
  export let message = "표시할 데이터가 없습니다.";
  export let hint = "";
  export let actionLabel = "";
  export let actionHref = "";
  export let actionOnClick: (() => void) | undefined = undefined;
  export let compact = false;
</script>

<div class="empty-state" class:empty-state-compact={compact}>
  <p class="empty-state-message">{message}</p>
  {#if hint}<p class="empty-state-hint">{hint}</p>{/if}
  {#if actionLabel}
    {#if actionHref}
      <a class="button-secondary" href={actionHref}>{actionLabel}</a>
    {:else if actionOnClick}
      <button class="button-secondary" type="button" on:click={actionOnClick}>{actionLabel}</button>
    {/if}
  {/if}
  <slot />
</div>
