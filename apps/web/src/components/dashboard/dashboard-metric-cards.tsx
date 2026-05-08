import type { DashboardResponse } from "@/lib/api";
import { formatPnl, pnlClassName } from "./dashboard-pnl";

type DashboardMetricCardsProps = {
  dashboard: DashboardResponse;
  brokerHint: string;
};

export function DashboardMetricCards({
  dashboard,
  brokerHint,
}: DashboardMetricCardsProps) {
  return (
    <>
      <div className="summary-grid summary-grid-columns-3">
        <article className="metric-card metric-card-accent-primary">
          <p className="metric-card-label">운영 모드</p>
          <p className="metric-card-value">설정 확인</p>
          <p className="metric-card-copy">{brokerHint}</p>
        </article>
        <article className="metric-card metric-card-accent-info">
          <p className="metric-card-label">브로커 연결</p>
          <p className="metric-card-value">설정 확인</p>
          <p className="metric-card-copy">{brokerHint}</p>
        </article>
        <article className="metric-card metric-card-accent-secondary">
          <p className="metric-card-label">시스템 상태</p>
          <p className="metric-card-value">
            {dashboard.health.apiStatus} / {dashboard.health.dbStatus}
          </p>
          <p className="metric-card-copy">
            API와 DB 응답이 정상인지 먼저 확인합니다.
          </p>
        </article>
      </div>

      <div className="summary-grid summary-grid-columns-2">
        <article className="metric-card metric-card-accent-primary">
          <p className="metric-card-label">실행 중 전략</p>
          <p className="metric-card-value">{dashboard.runningStrategyCount}</p>
        </article>
        <article className="metric-card metric-card-accent-info">
          <p className="metric-card-label">금일 주문</p>
          <p className="metric-card-value">{dashboard.todayOrderCount}</p>
        </article>
        <article className="metric-card metric-card-accent-pnl">
          <p className="metric-card-label">금일 손익</p>
          <p
            className={`metric-card-value ${pnlClassName(dashboard.todayPnl)}`}
          >
            {formatPnl(dashboard.todayPnl)}
          </p>
        </article>
        <article className="metric-card metric-card-accent-secondary">
          <p className="metric-card-label">보유 포지션</p>
          <p className="metric-card-value">{dashboard.positionCount}</p>
        </article>
      </div>
    </>
  );
}
