import Link from "next/link";

type DashboardHeaderProps = {
  killSwitchEnabled: boolean;
  isSystemHealthy: boolean;
  operationalStateLabel: string;
  healthLabel: string;
};

export function DashboardHeader({
  killSwitchEnabled,
  isSystemHealthy,
  operationalStateLabel,
  healthLabel,
}: DashboardHeaderProps) {
  const healthToneClass = isSystemHealthy
    ? "status-chip status-chip-success"
    : "status-chip status-chip-error";

  return (
    <section id="dashboard-summary" className="doc-panel doc-panel-info">
      <div className="page-intro-row">
        <div className="page-intro">
          <p className="page-eyebrow">대시보드</p>
          <h1 className="page-title">운영 대시보드</h1>
          <p className="page-description">
            전역 차단, 시스템 상태, 전략 실행 현황을 먼저 보고 다음 조치로
            내려갑니다.
          </p>
        </div>
        <div className="page-actions">
          <span
            className={
              killSwitchEnabled
                ? "status-chip status-chip-error"
                : "status-chip status-chip-success"
            }
          >
            {operationalStateLabel}
          </span>
          <span className={healthToneClass}>{healthLabel}</span>
          <Link href="/settings" className="button-secondary">
            브로커·리스크 설정
          </Link>
        </div>
      </div>
    </section>
  );
}
