<script lang="ts">
  export let id = "";
  export let eyebrow = "";
  export let title = "";
  export let description = "";
</script>

<header {id} class="page-intro">
  <p class="page-eyebrow">{eyebrow}</p>
  <h1 class="page-title">{title}</h1>
  <p class="page-description">{description}</p>
</header>
