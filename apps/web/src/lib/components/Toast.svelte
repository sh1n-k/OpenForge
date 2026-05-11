<script lang="ts">
  import { toasts, dismissToast, type ToastItem } from "@/lib/toast";

  let items: ToastItem[] = [];
  toasts.subscribe((value) => (items = value));
</script>

<div class="toast-stack" aria-live="polite">
  {#each items as item (item.id)}
    <div
      class="toast-item toast-item-{item.variant}"
      role={item.variant === "error" ? "alert" : "status"}
    >
      <span class="toast-message">{item.message}</span>
      <button
        class="toast-dismiss"
        type="button"
        aria-label="알림 닫기"
        on:click={() => dismissToast(item.id)}
      >
        ×
      </button>
    </div>
  {/each}
</div>
