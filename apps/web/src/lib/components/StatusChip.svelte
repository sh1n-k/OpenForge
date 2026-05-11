<script lang="ts">
  export let variant: "success" | "warning" | "error" | "info" | "neutral" = "info";
  export let label: string | number | null | undefined = "";

  $: chipClass = `status-chip status-chip-${variant === "neutral" ? "info" : variant}`;
</script>

<span class={chipClass}>{label}</span>
