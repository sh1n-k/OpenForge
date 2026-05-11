<script lang="ts">
  import ListSection from "@/pages/shared/ListSection.svelte";
  import PageHeader from "@/lib/components/PageHeader.svelte";
  import KillSwitchToggle from "@/lib/components/KillSwitchToggle.svelte";
  import StatusChip from "@/lib/components/StatusChip.svelte";
  import {
    testBrokerConnection,
    updateBrokerConnectionConfig,
    updateSystemRiskKillSwitch,
    type BrokerConnectionEvent,
    type SystemBrokerStatus,
    type SystemRisk,
    type SystemRiskEvent,
  } from "@/lib/api";
  import type { HealthSnapshot } from "@/lib/health";
  import { statusVariant } from "@/pages/_helpers/status-class";

  export let systemBroker: SystemBrokerStatus;
  export let systemBrokerEvents: BrokerConnectionEvent[] = [];
  export let systemRisk: SystemRisk;
  export let systemRiskEvents: SystemRiskEvent[] = [];
  export let health: HealthSnapshot;
  export let runAction: (work: () => Promise<unknown>, success?: () => boolean | void) => Promise<void>;

  let form = {
    targetMode: "paper" as "paper" | "live",
    appKey: "",
    appSecret: "",
    accountNumber: "",
    productCode: "",
    enabled: true,
  };
</script>

<section class="page-shell docs-page-shell">
  <PageHeader id="settings-summary" eyebrow="Settings" title="시스템 설정" description="브로커 연결, 전역 리스크, 시스템 상태를 관리합니다." />
  <div class="split-grid">
    <div id="settings-broker" class="doc-panel grid-section">
      <h2 class="section-title">브로커 연결</h2>
      <p>현재 모드: {systemBroker.currentSystemMode} / 설정 완료: {systemBroker.isCurrentModeConfigured ? "예" : "아니오"}</p>
      <div class="form-row">
        <select bind:value={form.targetMode}>
          <option value="paper">paper</option>
          <option value="live">live</option>
        </select>
        <input bind:value={form.appKey} placeholder="appKey" />
        <input bind:value={form.appSecret} placeholder="appSecret" />
        <input bind:value={form.accountNumber} placeholder="accountNumber" />
        <input bind:value={form.productCode} placeholder="productCode" />
      </div>
      <div class="page-actions">
        <button class="button-primary" type="button" on:click={() => runAction(() => updateBrokerConnectionConfig(form))}>
          저장
        </button>
        <button
          class="button-secondary"
          type="button"
          on:click={() => runAction(() => testBrokerConnection({ targetMode: form.targetMode }))}
        >
          연결 테스트
        </button>
      </div>
      <ListSection
        title="브로커 이벤트"
        rows={systemBrokerEvents}
        columns={["targetMode", "eventType", "message", "occurredAt"]}
      />
    </div>
    <div id="settings-risk" class="doc-panel grid-section">
      <h2 class="section-title">전역 리스크</h2>
      <KillSwitchToggle
        enabled={systemRisk.killSwitchEnabled}
        scope="system"
        onToggle={(next) => runAction(() => updateSystemRiskKillSwitch({ enabled: next }))}
      />
      <ListSection
        title="리스크 이벤트"
        rows={systemRiskEvents}
        columns={["eventType", "reasonCode", "message", "occurredAt"]}
      />
    </div>
  </div>
  <div id="settings-system" class="dashboard-health-bar">
    <span>{health.appName} {health.version}</span>
    <StatusChip variant={statusVariant(health.status)} label={health.status} />
  </div>
</section>
