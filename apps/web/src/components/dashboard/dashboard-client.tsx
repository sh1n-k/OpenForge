"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  updateSystemRiskKillSwitch,
  type DashboardResponse,
  type SystemRisk,
} from "@/lib/api";
import { confirmAction, ErrorBanner } from "@/components/common";
import { DashboardHeader } from "./dashboard-header";
import { DashboardKillSwitchCard } from "./dashboard-kill-switch-card";
import { DashboardMetricCards } from "./dashboard-metric-cards";
import { DashboardStrategiesSection } from "./dashboard-strategies-section";
import { DashboardFillsSection } from "./dashboard-fills-section";
import { DashboardPositionsSection } from "./dashboard-positions-section";
import { DashboardErrorsSection } from "./dashboard-errors-section";
import { DashboardHealthSection } from "./dashboard-health-section";

type DashboardClientProps = {
  dashboard: DashboardResponse;
  systemRisk: SystemRisk;
};

export function DashboardClient({
  dashboard,
  systemRisk,
}: DashboardClientProps) {
  const router = useRouter();
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(
    systemRisk.killSwitchEnabled,
  );
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSystemHealthy =
    dashboard.health.apiStatus === "UP" && dashboard.health.dbStatus === "UP";
  const operationalStateLabel = killSwitchEnabled
    ? "신규 주문 차단 중"
    : "정상 운영 중";
  const operationalStateDescription = killSwitchEnabled
    ? "비상 정지가 활성화되어 신규 주문이 차단됩니다."
    : "전략 스케줄에 따라 신규 주문이 정상 실행됩니다.";
  const operationalActionLabel = killSwitchEnabled
    ? "차단 해제"
    : "신규 주문 차단";
  const operationalActionClass = killSwitchEnabled
    ? "button-secondary"
    : "button-danger";
  const healthLabel = isSystemHealthy ? "시스템 정상" : "시스템 점검 필요";
  const brokerHint = "브로커 연결과 현재 모드는 설정 화면에서 확인합니다.";

  async function handleToggleKillSwitch() {
    const next = !killSwitchEnabled;
    const label = next
      ? "신규 주문을 차단합니다"
      : "신규 주문 차단을 해제합니다";
    if (!confirmAction(`${label}. 계속하시겠습니까?`)) return;

    try {
      setError(null);
      setIsToggling(true);
      await updateSystemRiskKillSwitch({ enabled: next });
      setKillSwitchEnabled(next);
      startTransition(() => router.refresh());
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "킬스위치 변경에 실패했습니다.",
      );
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <main className="page-shell docs-page-shell">
      <DashboardHeader
        killSwitchEnabled={killSwitchEnabled}
        isSystemHealthy={isSystemHealthy}
        operationalStateLabel={operationalStateLabel}
        healthLabel={healthLabel}
      />

      <DashboardKillSwitchCard
        killSwitchEnabled={killSwitchEnabled}
        isToggling={isToggling}
        operationalStateLabel={operationalStateLabel}
        operationalStateDescription={operationalStateDescription}
        operationalActionLabel={operationalActionLabel}
        operationalActionClass={operationalActionClass}
        onToggle={handleToggleKillSwitch}
      />

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      <DashboardMetricCards dashboard={dashboard} brokerHint={brokerHint} />

      <DashboardStrategiesSection strategies={dashboard.strategySummaries} />

      <DashboardFillsSection fills={dashboard.recentFills} />

      <DashboardPositionsSection positions={dashboard.currentPositions} />

      <DashboardErrorsSection errors={dashboard.recentErrors} />

      <DashboardHealthSection health={dashboard.health} />
    </main>
  );
}
