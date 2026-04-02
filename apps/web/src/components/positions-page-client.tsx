"use client";

import Link from "next/link";
import { useState } from "react";
import type { CrossStrategyPosition, StrategySummary } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type PositionsPageClientProps = {
  positions: CrossStrategyPosition[];
  strategies: StrategySummary[];
};

export function PositionsPageClient({
  positions,
  strategies,
}: PositionsPageClientProps) {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

  const filteredPositions = selectedStrategyId
    ? positions.filter((p) => p.strategyId === selectedStrategyId)
    : positions;

  const uniqueSymbols = new Set(filteredPositions.map((p) => p.symbol));
  const uniqueStrategies = new Set(filteredPositions.map((p) => p.strategyId));

  return (
    <main className="page-shell workbench-page-shell">
      <section id="positions-summary" className="doc-panel">
        <div className="page-intro-row">
          <div className="page-intro">
            <p className="page-eyebrow">Positions</p>
            <h1 className="page-title">포지션 현황</h1>
          </div>
        </div>
        <div className="summary-grid summary-grid-columns-3" style={{ marginTop: 16 }}>
          <div className="metric-card">
            <p className="metric-card-label">총 포지션</p>
            <p className="metric-card-value">{filteredPositions.length}</p>
          </div>
          <div className="metric-card">
            <p className="metric-card-label">보유 종목</p>
            <p className="metric-card-value">{uniqueSymbols.size}</p>
          </div>
          <div className="metric-card">
            <p className="metric-card-label">관련 전략</p>
            <p className="metric-card-value">{uniqueStrategies.size}</p>
          </div>
        </div>
      </section>

      <section id="positions-filter" className="doc-panel">
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
            전략 필터
          </span>
          <select
            value={selectedStrategyId ?? ""}
            onChange={(e) => setSelectedStrategyId(e.target.value || null)}
          >
            <option value="">전체</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
      </section>

      <section id="positions-detail" className="doc-panel">
        <h2 className="section-title">전략별 보유</h2>
        {filteredPositions.length === 0 ? (
          <p className="section-copy">보유 포지션이 없습니다</p>
        ) : (
          <div className="table-shell" style={{ marginTop: 16 }}>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>심볼</th>
                  <th>전략</th>
                  <th>순수량</th>
                  <th>평균단가</th>
                  <th>최근 체결</th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((pos) => (
                  <tr key={`${pos.strategyId}-${pos.symbol}`}>
                    <td style={{ fontWeight: 600 }}>{pos.symbol}</td>
                    <td>
                      <Link
                        href={`/strategies/${pos.strategyId}`}
                        style={{ color: "var(--primary)", fontWeight: 500 }}
                      >
                        {pos.strategyName}
                      </Link>
                    </td>
                    <td>{pos.netQuantity}</td>
                    <td>{pos.avgEntryPrice.toLocaleString()}</td>
                    <td>{formatDateTime(pos.lastFillAt) ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
