import Link from "next/link";
import type { DashboardResponse } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type DashboardStrategiesSectionProps = {
  strategies: DashboardResponse["strategySummaries"];
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

export function DashboardStrategiesSection({
  strategies,
}: DashboardStrategiesSectionProps) {
  const hasStrategies = strategies.length > 0;

  return (
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
                {strategies.map((s) => (
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
  );
}
