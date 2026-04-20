"use client";

import { useEffect, useState } from "react";
import type {
  BrokerConnectionEvent,
  SystemBrokerStatus,
  SystemRisk,
  SystemRiskEvent,
} from "@/lib/api";
import type { HealthSnapshot } from "@/lib/health";
import { ErrorBanner } from "@/components/common";
import { SettingsBrokerSection } from "./settings-broker-section";
import { SettingsKillSwitchSection } from "./settings-kill-switch-section";
import { SettingsSummaryCards } from "./settings-summary-cards";
import { SettingsSystemHealthSection } from "./settings-system-health-section";

type SettingsPageClientProps = {
  systemBroker: SystemBrokerStatus;
  systemBrokerEvents: BrokerConnectionEvent[];
  systemRisk: SystemRisk;
  systemRiskEvents: SystemRiskEvent[];
  health: HealthSnapshot;
};

export function SettingsPageClient({
  systemBroker,
  systemBrokerEvents,
  systemRisk,
  systemRiskEvents,
  health,
}: SettingsPageClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(
    systemRisk.killSwitchEnabled,
  );

  useEffect(() => {
    // 서버 리프레시 후 props가 바뀌면 낙관적 로컬 state를 새 값으로 재동기화.
    // 토글 직후의 낙관적 UI 업데이트를 위해 로컬 state가 필요하므로 이 패턴 유지.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKillSwitchEnabled(systemRisk.killSwitchEnabled);
  }, [systemRisk.killSwitchEnabled]);

  return (
    <main className="page-shell docs-page-shell">
      <section id="settings-summary" className="page-intro">
        <p className="page-eyebrow">설정</p>
        <h1 className="page-title">시스템 설정</h1>
        <p className="page-description">
          브로커 연결, 현재 모드, 전역 차단, 시스템 상태를 한 번에 확인합니다.
        </p>
      </section>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      <SettingsSummaryCards
        systemBroker={systemBroker}
        killSwitchEnabled={killSwitchEnabled}
      />

      <SettingsKillSwitchSection
        enabled={killSwitchEnabled}
        onEnabledChange={setKillSwitchEnabled}
        onError={setError}
        events={systemRiskEvents}
      />

      <SettingsBrokerSection
        systemBroker={systemBroker}
        events={systemBrokerEvents}
        onError={setError}
      />

      <SettingsSystemHealthSection health={health} />
    </main>
  );
}
