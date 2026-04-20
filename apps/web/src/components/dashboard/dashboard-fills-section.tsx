import Link from "next/link";
import type { DashboardResponse } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { formatPnl, pnlClassName } from "./dashboard-pnl";

type DashboardFillsSectionProps = {
  fills: DashboardResponse["recentFills"];
};

export function DashboardFillsSection({ fills }: DashboardFillsSectionProps) {
  const hasFills = fills.length > 0;

  return (
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
                {fills.map((fill) => (
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
  );
}
