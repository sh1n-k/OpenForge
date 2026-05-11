<script lang="ts">
  import { createEventDispatcher, onDestroy } from "svelte";
  import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";

  export let open = false;
  export let title = "";
  export let labelledBy = "";

  const dispatch = createEventDispatcher<{ close: void }>();

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

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      dispatch("close");
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      dispatch("close");
    }
  }
</script>

<svelte:window on:keydown={handleWindowKeydown} />

{#if open}
  <div
    class="drawer-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby={labelledBy || undefined}
    tabindex="-1"
    on:click={handleBackdropClick}
    on:keydown={(e) => e.key === "Escape" && dispatch("close")}
  >
    <div class="drawer-panel">
      {#if title}
        <div class="drawer-head">
          <h2 class="drawer-title" id={labelledBy || undefined}>{title}</h2>
          <button class="button-ghost" type="button" on:click={() => dispatch("close")}>
            닫기
          </button>
        </div>
      {/if}
      <div class="drawer-body">
        <slot />
      </div>
    </div>
  </div>
{/if}
