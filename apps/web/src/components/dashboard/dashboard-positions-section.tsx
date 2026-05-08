import Link from "next/link";
import type { DashboardResponse } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type DashboardPositionsSectionProps = {
  positions: DashboardResponse["currentPositions"];
};

export function DashboardPositionsSection({
  positions,
}: DashboardPositionsSectionProps) {
  const hasPositions = positions.length > 0;

  return (
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
                {positions.map((pos) => (
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
  );
}
