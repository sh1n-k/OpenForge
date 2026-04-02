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

const strategyStatusChip: Record<string, string> = {
  running: "status-chip status-chip-success",
  stopped: "status-chip status-chip-warning",
  draft: "status-chip status-chip-info",
  backtest_completed: "status-chip status-chip-info",
};

function pnlColor(value: number): string {
  if (value > 0) return "var(--success)";
  if (value < 0) return "var(--error)";
  return "var(--muted-foreground)";
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

  return (
    <main className="page-shell workbench-page-shell">
      {/* ------------------------------------------------------------------ */}
      {/* Summary */}
      {/* ------------------------------------------------------------------ */}
      <section id="dashboard-summary" className="doc-panel">
        <div className="page-intro-row">
          <div className="page-intro">
            <p className="page-eyebrow">Dashboard</p>
            <h1 className="page-title">운영 대시보드</h1>
          </div>
          <div className="page-actions">
            <button
              type="button"
              disabled={isToggling}
              onClick={handleToggleKillSwitch}
              className={killSwitch ? "button-primary" : "button-danger"}
            >
              {killSwitch ? "자동매매 가동 중" : "전체 중지됨"}
            </button>
          </div>
        </div>

        <div className="summary-grid summary-grid-columns-2 mt-4" style={{ marginTop: 16 }}>
          <article className="metric-card">
            <p className="metric-card-label">실행 중 전략</p>
            <p className="metric-card-value">{dashboard.runningStrategyCount}</p>
          </article>
          <article className="metric-card">
            <p className="metric-card-label">금일 주문</p>
            <p className="metric-card-value">{dashboard.todayOrderCount}</p>
          </article>
          <article className="metric-card">
            <p className="metric-card-label">금일 손익</p>
            <p
              className="metric-card-value"
              style={{ color: pnlColor(dashboard.todayPnl) }}
            >
              {dashboard.todayPnl >= 0 ? "+" : ""}
              {dashboard.todayPnl.toLocaleString()}
            </p>
          </article>
          <article className="metric-card">
            <p className="metric-card-label">보유 포지션</p>
            <p className="metric-card-value">{dashboard.positionCount}</p>
          </article>
        </div>
      </section>

      {error ? (
        <section className="doc-panel doc-panel-error">{error}</section>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Strategies */}
      {/* ------------------------------------------------------------------ */}
      <section id="dashboard-strategies" className="doc-panel">
        <h2 className="section-title">전략 현황</h2>
        <div className="table-shell" style={{ marginTop: 12 }}>
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
              {dashboard.strategySummaries.length === 0 ? (
                <tr>
                  <td colSpan={7}>등록된 전략이 없습니다</td>
                </tr>
              ) : (
                dashboard.strategySummaries.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link
                        href={`/strategies/${s.id}`}
                        style={{ color: "var(--primary)", fontWeight: 500 }}
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
                        {s.status}
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
                        "-"
                      )}
                    </td>
                    <td>{s.positionCount}</td>
                    <td>{s.todayOrderCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Recent Fills */}
      {/* ------------------------------------------------------------------ */}
      <section id="dashboard-fills" className="doc-panel">
        <h2 className="section-title">최근 체결</h2>
        <div className="table-shell" style={{ marginTop: 12 }}>
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
              {dashboard.recentFills.length === 0 ? (
                <tr>
                  <td colSpan={7}>체결 내역이 없습니다</td>
                </tr>
              ) : (
                dashboard.recentFills.map((fill) => (
                  <tr key={fill.id}>
                    <td>
                      <Link
                        href={`/strategies/${fill.strategyId}`}
                        style={{ color: "var(--primary)" }}
                      >
                        {fill.strategyName}
                      </Link>
                    </td>
                    <td>{fill.symbol}</td>
                    <td>{fill.side}</td>
                    <td>{fill.quantity}</td>
                    <td>{fill.price.toLocaleString()}</td>
                    <td style={{ color: pnlColor(fill.realizedPnl) }}>
                      {fill.realizedPnl >= 0 ? "+" : ""}
                      {fill.realizedPnl.toLocaleString()}
                    </td>
                    <td>{formatDateTime(fill.filledAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Positions */}
      {/* ------------------------------------------------------------------ */}
      <section id="dashboard-positions" className="doc-panel">
        <h2 className="section-title">현재 포지션</h2>
        <div className="table-shell" style={{ marginTop: 12 }}>
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
              {dashboard.currentPositions.length === 0 ? (
                <tr>
                  <td colSpan={5}>보유 포지션이 없습니다</td>
                </tr>
              ) : (
                dashboard.currentPositions.map((pos) => (
                  <tr key={`${pos.strategyId}-${pos.symbol}`}>
                    <td>
                      <Link
                        href={`/strategies/${pos.strategyId}`}
                        style={{ color: "var(--primary)" }}
                      >
                        {pos.strategyName}
                      </Link>
                    </td>
                    <td>{pos.symbol}</td>
                    <td>{pos.netQuantity}</td>
                    <td>{pos.avgEntryPrice.toLocaleString()}</td>
                    <td>{formatDateTime(pos.lastFillAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Errors */}
      {/* ------------------------------------------------------------------ */}
      <section id="dashboard-errors" className="doc-panel">
        <h2 className="section-title">최근 오류</h2>
        {dashboard.recentErrors.length === 0 ? (
          <div
            className="doc-panel doc-panel-info"
            style={{ marginTop: 12, textAlign: "center" }}
          >
            <p className="section-copy" style={{ margin: 0, color: "var(--success)" }}>
              최근 오류가 없습니다
            </p>
          </div>
        ) : (
          <div className="stack-list" style={{ marginTop: 12 }}>
            {dashboard.recentErrors.map((err, index) => (
              <div key={`${err.occurredAt}-${index}`} className="list-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="mono-pill">{err.source}</span>
                  {err.strategyName ? (
                    <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                      {err.strategyName}
                    </span>
                  ) : null}
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.75rem",
                      color: "var(--subtle-foreground)",
                    }}
                  >
                    {formatDateTime(err.occurredAt)}
                  </span>
                </div>
                <p className="section-copy" style={{ marginTop: 4, color: "var(--error)" }}>
                  {err.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Health (collapsible) */}
      {/* ------------------------------------------------------------------ */}
      <section id="dashboard-health" className="doc-panel">
        <details>
          <summary
            style={{ cursor: "pointer", listStyle: "revert" }}
          >
            <span className="section-title" style={{ display: "inline" }}>
              시스템 상태
            </span>
          </summary>
          <div className="summary-grid summary-grid-columns-2" style={{ marginTop: 16 }}>
            <article className="metric-card">
              <p className="metric-card-label">API</p>
              <p className="metric-card-value">{dashboard.health.apiStatus}</p>
              <span
                className={
                  dashboard.health.apiStatus === "UP"
                    ? "status-chip status-chip-success"
                    : "status-chip status-chip-warning"
                }
              >
                API 상태
              </span>
            </article>
            <article className="metric-card">
              <p className="metric-card-label">Database</p>
              <p className="metric-card-value">{dashboard.health.dbStatus}</p>
              <span
                className={
                  dashboard.health.dbStatus === "UP"
                    ? "status-chip status-chip-success"
                    : "status-chip status-chip-warning"
                }
              >
                DB 상태
              </span>
            </article>
          </div>
        </details>
      </section>
    </main>
  );
}
