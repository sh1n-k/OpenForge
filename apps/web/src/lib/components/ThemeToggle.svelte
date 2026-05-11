<script lang="ts">
  import { onMount } from "svelte";
  import { getTheme, setTheme, subscribeTheme, type Theme } from "@/lib/theme";

  let current: Theme = "system";

  onMount(() => {
    current = getTheme();
    const unsubscribe = subscribeTheme(() => {
      current = getTheme();
    });
    return unsubscribe;
  });

  function select(next: Theme) {
    current = next;
    setTheme(next);
  }
</script>

<div class="theme-toggle" role="group" aria-label="테마 선택">
  <button
    type="button"
    class="theme-toggle-option"
    class:theme-toggle-option-active={current === "light"}
    aria-pressed={current === "light"}
    on:click={() => select("light")}
  >밝게</button>
  <button
    type="button"
    class="theme-toggle-option"
    class:theme-toggle-option-active={current === "dark"}
    aria-pressed={current === "dark"}
    on:click={() => select("dark")}
  >어둡게</button>
  <button
    type="button"
    class="theme-toggle-option"
    class:theme-toggle-option-active={current === "system"}
    aria-pressed={current === "system"}
    on:click={() => select("system")}
  >시스템</button>
</div>
