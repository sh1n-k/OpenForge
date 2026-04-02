"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  updateSystemRiskKillSwitch,
  type DashboardResponse,
  type SystemRisk,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type DashboardClientProps = {
  dashboard: DashboardResponse;
  systemRisk: SystemRisk;
};

const strategyStatusLabel: Record<string, string> = {
  running: "실행 중",
  stopped: "중지",
  draft: "초안",
  backtest_completed: "백테스트 완료",
};

const strategyStatusChip: Record<string, string> = {
  running: "status-chip status-chip-success",
  stopped: "status-chip status-chip-warning",
  draft: "status-chip",
  backtest_completed: "status-chip status-chip-info",
};

function formatPnl(value: number): string {
  if (value === 0) return "0";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toLocaleString()}`;
}

function pnlClassName(value: number): string {
  if (value > 0) return "text-success";
  if (value < 0) return "text-error";
  return "text-muted";
}

export function DashboardClient({
  dashboard,
  systemRisk,
}: DashboardClientProps) {
  const router = useRouter();
  const [killSwitch, setKillSwitch] = useState(systemRisk.killSwitchEnabled);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleKillSwitch() {
    const next = !killSwitch;
    const label = next ? "자동매매를 가동합니다" : "전체 자동매매를 중지합니다";
    if (!window.confirm(`${label}. 계속하시겠습니까?`)) return;

    try {
      setError(null);
      setIsToggling(true);
      await updateSystemRiskKillSwitch({ enabled: next });
      setKillSwitch(next);
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

  const hasStrategies = dashboard.strategySummaries.length > 0;
  const hasFills = dashboard.recentFills.length > 0;
  const hasPositions = dashboard.currentPositions.length > 0;
  const hasErrors = dashboard.recentErrors.length > 0;

  return (
    <main className="page-shell docs-page-shell">
      <section id="dashboard-summary" className="page-intro">
        <p className="page-eyebrow">Dashboard</p>
        <h1 className="page-title">운영 대시보드</h1>
      </section>

      {/* Kill Switch */}
      <div className={`dashboard-killswitch ${killSwitch ? "dashboard-killswitch-on" : "dashboard-killswitch-off"}`}>
        <div className="dashboard-killswitch-body">
          <div className="dashboard-killswitch-indicator">
            <span className={`dashboard-killswitch-dot ${killSwitch ? "dashboard-killswitch-dot-on" : "dashboard-killswitch-dot-off"}`} />
            <span className="dashboard-killswitch-label">
              {killSwitch ? "자동매매 가동 중" : "자동매매 중지됨"}
            </span>
          </div>
          <p className="dashboard-killswitch-description">
            {killSwitch
              ? "전략 스케줄에 따라 시그널이 생성되고 주문이 실행됩니다."
              : "모든 자동매매가 중지된 상태입니다. 주문이 실행되지 않습니다."}
          </p>
        </div>
        <button
          type="button"
          disabled={isToggling}
          onClick={handleToggleKillSwitch}
          className={killSwitch ? "button-danger" : "button-primary"}
        >
          {isToggling
            ? "변경 중..."
            : killSwitch
              ? "전체 중지"
              : "가동 시작"}
        </button>
      </div>

      {error ? (
        <div className="doc-panel doc-panel-error">
          <p className="section-copy">{error}</p>
        </div>
      ) : null}

      {/* Metric Cards */}
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
          <p className={`metric-card-value ${pnlClassName(dashboard.todayPnl)}`}>
            {formatPnl(dashboard.todayPnl)}
          </p>
        </article>
        <article className="metric-card metric-card-accent-secondary">
          <p className="metric-card-label">보유 포지션</p>
          <p className="metric-card-value">{dashboard.positionCount}</p>
        </article>
      </div>

      {/* Strategies */}
      <section id="dashboard-strategies">
        <h2 className="section-title">전략 현황</h2>
        {hasStrategies ? (
          <div className="doc-panel">
            <div className="table-shell">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>타입</th>
                    <th>상태</th>
                    <th>실행</th>
                    <th>최근 실행</th>
                    <th>포지션</th>
                    <th>금일 주문</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.strategySummaries.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link
                          href={`/strategies/${s.id}`}
                          className="table-link"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td>{s.strategyType}</td>
                      <td>
                        <span
                          className={
                            strategyStatusChip[s.status] ?? "status-chip"
                          }
                        >
                          {strategyStatusLabel[s.status] ?? s.status}
                        </span>
                      </td>
                      <td>{s.executionEnabled ? "ON" : "OFF"}</td>
                      <td>
                        {s.lastRunStatus ? (
                          <>
                            <span
                              className={
                                s.lastRunStatus === "completed"
                                  ? "status-chip status-chip-success"
                                  : s.lastRunStatus === "failed"
                                    ? "status-chip status-chip-error"
                                    : "status-chip status-chip-info"
                              }
                            >
                              {s.lastRunStatus}
                            </span>{" "}
                            {formatDateTime(s.lastRunAt)}
                          </>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </td>
                      <td>{s.positionCount}</td>
                      <td>{s.todayOrderCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state-message">등록된 전략이 없습니다</p>
            <p className="empty-state-hint">
              전략을 만들어 자동매매를 시작하세요.
            </p>
            <Link href="/strategies" className="button-primary">
              전략 만들기
            </Link>
          </div>
        )}
      </section>

      {/* Recent Fills */}
      <section id="dashboard-fills">
        <h2 className="section-title">최근 체결</h2>
        {hasFills ? (
          <div className="doc-panel">
            <div className="table-shell">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>전략</th>
                    <th>심볼</th>
                    <th>방향</th>
                    <th>수량</th>
                    <th>가격</th>
                    <th>손익</th>
                    <th>시간</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentFills.map((fill) => (
                    <tr key={fill.id}>
                      <td>
                        <Link
                          href={`/strategies/${fill.strategyId}`}
                          className="table-link"
                        >
                          {fill.strategyName}
                        </Link>
                      </td>
                      <td>{fill.symbol}</td>
                      <td>{fill.side}</td>
                      <td>{fill.quantity}</td>
                      <td>{fill.price.toLocaleString()}</td>
                      <td className={pnlClassName(fill.realizedPnl)}>
                        {formatPnl(fill.realizedPnl)}
                      </td>
                      <td>{formatDateTime(fill.filledAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="empty-state empty-state-compact">
            <p className="empty-state-message">체결 내역이 없습니다</p>
          </div>
        )}
      </section>

      {/* Positions */}
      <section id="dashboard-positions">
        <h2 className="section-title">현재 포지션</h2>
        {hasPositions ? (
          <div className="doc-panel">
            <div className="table-shell">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>전략</th>
                    <th>심볼</th>
                    <th>순수량</th>
                    <th>평균단가</th>
                    <th>최근 체결</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.currentPositions.map((pos) => (
                    <tr key={`${pos.strategyId}-${pos.symbol}`}>
                      <td>
                        <Link
                          href={`/strategies/${pos.strategyId}`}
                          className="table-link"
                        >
                          {pos.strategyName}
                        </Link>
                      </td>
                      <td>{pos.symbol}</td>
                      <td>{pos.netQuantity}</td>
                      <td>{pos.avgEntryPrice.toLocaleString()}</td>
                      <td>{formatDateTime(pos.lastFillAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="empty-state empty-state-compact">
            <p className="empty-state-message">보유 포지션이 없습니다</p>
          </div>
        )}
      </section>

      {/* Errors */}
      <section id="dashboard-errors">
        <h2 className="section-title">최근 오류</h2>
        {hasErrors ? (
          <div className="stack-list">
            {dashboard.recentErrors.map((err, index) => (
              <div key={`${err.occurredAt}-${index}`} className="list-card list-card-error">
                <div className="flex-between">
                  <div className="flex-center">
                    <span className="mono-pill">{err.source}</span>
                    {err.strategyName ? (
                      <span className="text-muted">{err.strategyName}</span>
                    ) : null}
                  </div>
                  <span className="text-subtle" style={{ fontSize: "0.8125rem" }}>
                    {formatDateTime(err.occurredAt)}
                  </span>
                </div>
                <p className="section-copy text-error">{err.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state empty-state-compact empty-state-success">
            <p className="empty-state-message">최근 오류가 없습니다</p>
          </div>
        )}
      </section>

      {/* Health */}
      <section id="dashboard-health">
        <div className="dashboard-health-bar">
          <h2 className="section-title">시스템 상태</h2>
          <div className="flex-center">
            <span className={dashboard.health.apiStatus === "UP" ? "status-chip status-chip-success" : "status-chip status-chip-error"}>
              API {dashboard.health.apiStatus}
            </span>
            <span className={dashboard.health.dbStatus === "UP" ? "status-chip status-chip-success" : "status-chip status-chip-error"}>
              DB {dashboard.health.dbStatus}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
