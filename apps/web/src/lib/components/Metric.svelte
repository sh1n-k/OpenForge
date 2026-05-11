<script lang="ts">
  export let label = "";
  export let value: string | number = "";
  export let copy = "";
</script>

<article class="metric-card metric-card-accent-primary">
  <p class="metric-card-label">{label}</p>
  <p class="metric-card-value">{typeof value === "number" ? value.toLocaleString("ko-KR") : value}</p>
  {#if copy}<p class="metric-card-copy">{copy}</p>{/if}
</article>
