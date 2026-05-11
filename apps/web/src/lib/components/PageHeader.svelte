<script lang="ts">
  export let id = "";
  export let eyebrow = "";
  export let title = "";
  export let description = "";
</script>

<header {id} class="page-intro">
  {#if eyebrow}<p class="page-eyebrow">{eyebrow}</p>{/if}
  <div class="page-intro-row">
    <h1 class="page-title">{title}</h1>
    <slot name="actions" />
  </div>
  {#if description}<p class="page-description">{description}</p>{/if}
  <slot />
</header>
