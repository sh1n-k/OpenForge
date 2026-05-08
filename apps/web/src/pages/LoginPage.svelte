<script lang="ts">
  import { login } from "@/lib/api";

  let password = "";
  let error: string | null = null;
  let isSubmitting = false;

  async function submit() {
    try {
      error = null;
      isSubmitting = true;
      await login(password);
      window.location.href = "/";
    } catch (e) {
      error = e instanceof Error ? e.message : "로그인에 실패했습니다.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<main class="login-screen">
  <form class="login-card" on:submit|preventDefault={submit}>
    <div>
      <h1 class="login-title">OpenForge</h1>
      <p class="page-description" style="text-align:center;margin-top:8px">운영 콘솔 접근 권한을 확인합니다.</p>
    </div>
    {#if error}
      <div class="doc-panel doc-panel-error login-error"><p>{error}</p></div>
    {/if}
    <label class="login-field">
      <span class="login-label">비밀번호</span>
      <input class="login-input" type="password" bind:value={password} autocomplete="current-password" />
    </label>
    <button class="button-primary login-submit" type="submit" disabled={isSubmitting}>
      {isSubmitting ? "확인 중..." : "로그인"}
    </button>
  </form>
</main>
