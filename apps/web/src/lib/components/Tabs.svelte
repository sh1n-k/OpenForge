<script lang="ts" context="module">
  export interface TabItem {
    id: string;
    label: string;
  }
</script>

<script lang="ts">
  import { onMount } from "svelte";

  export let tabs: TabItem[] = [];
  export let active: string = tabs[0]?.id ?? "";
  export let label = "탭";
  export let syncHash = false;

  function applyHash(hash: string) {
    if (!hash) return;
    if (!tabs.some((t) => t.id === hash)) return;
    const wasInactive = active !== hash;
    active = hash;
    if (wasInactive && typeof document !== "undefined") {
      queueMicrotask(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function select(id: string) {
    active = id;
    if (syncHash && typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    const currentIndex = tabs.findIndex((t) => t.id === active);
    if (currentIndex < 0) return;
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    select(tabs[nextIndex].id);
    queueMicrotask(() => {
      const el = document.getElementById(`tab-${tabs[nextIndex].id}`);
      el?.focus();
    });
  }

  onMount(() => {
    if (!syncHash || typeof window === "undefined") return;
    applyHash(window.location.hash.replace(/^#/, ""));
    const handler = () => applyHash(window.location.hash.replace(/^#/, ""));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  });
</script>

<div class="tabs" role="tablist" aria-label={label} tabindex="-1" on:keydown={handleKeydown}>
  {#each tabs as tab}
    <button
      id={`tab-${tab.id}`}
      class="tabs-tab"
      role="tab"
      type="button"
      aria-selected={active === tab.id}
      aria-controls={tab.id}
      tabindex={active === tab.id ? 0 : -1}
      on:click={() => select(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</div>
