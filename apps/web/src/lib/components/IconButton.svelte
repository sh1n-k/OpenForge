<script lang="ts">
  export let label: string;
  export let variant: "ghost" | "secondary" | "primary" | "danger" = "ghost";
  export let type: "button" | "submit" = "button";
  export let disabled = false;
  export let onclick: ((event: MouseEvent) => void) | undefined = undefined;

  $: variantClass = {
    ghost: "button-ghost",
    secondary: "button-secondary",
    primary: "button-primary",
    danger: "button-danger",
  }[variant];
</script>

<button
  {type}
  {disabled}
  aria-label={label}
  title={label}
  class="icon-button {variantClass}"
  on:click={(e) => onclick?.(e)}
>
  <slot />
</button>
