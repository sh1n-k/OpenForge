<script lang="ts">
  import { createEventDispatcher, onDestroy } from "svelte";
  import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";

  export let open = false;
  export let title = "확인";
  export let message = "";
  export let confirmLabel = "확인";
  export let cancelLabel = "취소";
  export let variant: "danger" | "primary" = "danger";

  const dispatch = createEventDispatcher<{ confirm: void; cancel: void }>();

  let locked = false;

  function syncLock(value: boolean) {
    if (value && !locked) {
      lockBodyScroll();
      locked = true;
    } else if (!value && locked) {
      unlockBodyScroll();
      locked = false;
    }
  }

  $: syncLock(open);

  onDestroy(() => {
    if (locked) {
      unlockBodyScroll();
      locked = false;
    }
  });

  function handleKeydown(event: KeyboardEvent) {
    if (!open) return;
    if (event.key === "Escape") {
      event.stopPropagation();
      dispatch("cancel");
    } else if (event.key === "Enter") {
      event.preventDefault();
      dispatch("confirm");
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div class="confirm-dialog-backdrop" role="dialog" aria-modal="true" tabindex="-1">
    <div class="confirm-dialog">
      <h2 class="confirm-dialog-title">{title}</h2>
      {#if message}<p class="confirm-dialog-body">{message}</p>{/if}
      <div class="confirm-dialog-actions">
        <button class="button-ghost" type="button" on:click={() => dispatch("cancel")}>{cancelLabel}</button>
        <button
          class={variant === "danger" ? "button-danger" : "button-primary"}
          type="button"
          on:click={() => dispatch("confirm")}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}
