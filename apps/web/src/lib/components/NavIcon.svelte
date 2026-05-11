<script lang="ts">
  import {
    ChartPie,
    Cpu,
    Globe,
    Landmark,
    LayoutDashboard,
    ScrollText,
    Settings,
    ShoppingCart,
  } from "lucide-svelte";
  import type { NavIconKey } from "@/lib/route-meta";

  export let name: NavIconKey;
  export let size: number = 16;

  const map = {
    LayoutDashboard,
    Cpu,
    Globe,
    Landmark,
    ShoppingCart,
    PieChart: ChartPie,
    ScrollText,
    Settings,
  } as const;

  $: Component = map[name];
</script>

{#if Component}
  {@const Icon = Component}
  <Icon {size} class="doc-nav-icon" strokeWidth={1.75} />
{/if}
