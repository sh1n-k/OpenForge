import type { OrderMode, SystemBrokerStatus } from "@/lib/api";

const modeLabel: Record<OrderMode, string> = {
  paper: "모의투자",
  live: "실전투자",
};

type SettingsSummaryCardsProps = {
  systemBroker: SystemBrokerStatus;
  killSwitchEnabled: boolean;
};

export function SettingsSummaryCards({
  systemBroker,
  killSwitchEnabled,
}: SettingsSummaryCardsProps) {
  const currentBroker =
    systemBroker.currentSystemMode === "paper"
      ? systemBroker.paper
      : systemBroker.live;
  const currentBrokerModeLabel = modeLabel[systemBroker.currentSystemMode];
  const currentBrokerStatusLabel = !currentBroker.isConfigured
    ? "미설정"
    : currentBroker.lastConnectionTestStatus === "success"
      ? "연결 준비"
      : currentBroker.lastConnectionTestStatus === "failed"
        ? "점검 필요"
        : "설정 완료";
  const currentBrokerStatusCopy = !currentBroker.isConfigured
    ? "현재 시스템 모드에 필요한 브로커 설정이 없습니다."
    : currentBroker.lastConnectionTestStatus
      ? `최근 연결 테스트 ${
          currentBroker.lastConnectionTestStatus === "success" ? "성공" : "실패"
        }`
      : "연결 테스트를 아직 실행하지 않았습니다.";
  const operationalStateLabel = killSwitchEnabled
    ? "신규 주문 차단 중"
    : "정상 운영 중";

  return (
    <div className="summary-grid summary-grid-columns-3">
      <article className="metric-card metric-card-accent-primary">
        <p className="metric-card-label">현재 모드</p>
        <p className="metric-card-value">{currentBrokerModeLabel}</p>
        <p className="metric-card-copy">
          현재 시스템은 {currentBrokerModeLabel} 기준으로 동작합니다. 아래 탭에서
          모드별 설정을 각각 편집할 수 있습니다.
        </p>
      </article>
      <article className="metric-card metric-card-accent-info">
        <p className="metric-card-label">브로커 연결</p>
        <p className="metric-card-value">{currentBrokerStatusLabel}</p>
        <p className="metric-card-copy">{currentBrokerStatusCopy}</p>
      </article>
      <article className="metric-card metric-card-accent-secondary">
        <p className="metric-card-label">전역 차단</p>
        <p className={`metric-card-value ${killSwitchEnabled ? "text-error" : "text-success"}`}>
          {operationalStateLabel}
        </p>
        <p className="metric-card-copy">
          {killSwitchEnabled ? "신규 주문이 차단됩니다." : "신규 주문이 허용됩니다."}
        </p>
      </article>
    </div>
  );
}
