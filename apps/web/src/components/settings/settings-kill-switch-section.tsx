"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { confirmAction } from "@/components/common";
import {
  updateSystemRiskKillSwitch,
  type SystemRiskEvent,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type SettingsKillSwitchSectionProps = {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  onError: (message: string | null) => void;
  events: SystemRiskEvent[];
};

export function SettingsKillSwitchSection({
  enabled,
  onEnabledChange,
  onError,
  events,
}: SettingsKillSwitchSectionProps) {
  const router = useRouter();
  const [isTogglingRisk, setIsTogglingRisk] = useState(false);

  const operationalStateLabel = enabled ? "신규 주문 차단 중" : "정상 운영 중";
  const operationalStateDescription = enabled
    ? "전역 차단이 활성화되어 신규 주문이 차단됩니다."
    : "전략 설정에 따라 주문이 정상적으로 실행됩니다.";
  const operationalDotClass = enabled
    ? "dashboard-killswitch-dot-off"
    : "dashboard-killswitch-dot-on";
  const operationalContainerClass = enabled
    ? "dashboard-killswitch-off"
    : "dashboard-killswitch-on";

  async function handleToggleKillSwitch() {
    const next = !enabled;
    const label = next
      ? "전역 차단을 활성화합니다"
      : "전역 차단을 해제합니다";
    if (!confirmAction(`${label}. 계속하시겠습니까?`)) return;
    try {
      onError(null);
      setIsTogglingRisk(true);
      await updateSystemRiskKillSwitch({ enabled: next });
      onEnabledChange(next);
      startTransition(() => router.refresh());
    } catch (e) {
      onError(e instanceof Error ? e.message : "킬스위치 변경에 실패했습니다.");
    } finally {
      setIsTogglingRisk(false);
    }
  }

  return (
    <section id="settings-risk">
      <h2 className="section-title">전역 리스크</h2>
      <div className={`dashboard-killswitch ${operationalContainerClass}`}>
        <div className="dashboard-killswitch-body">
          <div className="dashboard-killswitch-indicator">
            <span className={`dashboard-killswitch-dot ${operationalDotClass}`} />
            <span className="dashboard-killswitch-label">
              {operationalStateLabel}
            </span>
          </div>
          <p className="dashboard-killswitch-description">
            {operationalStateDescription}
          </p>
        </div>
        <button
          type="button"
          disabled={isTogglingRisk}
          onClick={handleToggleKillSwitch}
          className={enabled ? "button-secondary" : "button-danger"}
        >
          {isTogglingRisk
            ? "변경 중..."
            : enabled
              ? "차단 해제"
              : "신규 주문 차단"}
        </button>
      </div>

      {events.length > 0 ? (
        <div className="stack-list" style={{ marginTop: 16 }}>
          {events.map((event) => (
            <div key={event.id} className="list-card">
              <div className="flex-between">
                <div className="flex-center">
                  <span className="mono-pill">{event.eventType}</span>
                  <span className="text-muted">{event.message}</span>
                </div>
                <span className="text-subtle" style={{ fontSize: "0.8125rem" }}>
                  {formatDateTime(event.occurredAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
