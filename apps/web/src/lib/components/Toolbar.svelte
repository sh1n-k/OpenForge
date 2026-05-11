<script lang="ts">
  export let align: "start" | "end" = "end";
</script>

<div class="toolbar" data-align={align}>
  <slot />
</div>
