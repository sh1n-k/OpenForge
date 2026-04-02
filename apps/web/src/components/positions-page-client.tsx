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
    <main className="page-shell docs-page-shell">
      <section id="positions-summary" className="page-intro">
        <p className="page-eyebrow">Positions</p>
        <h1 className="page-title">포지션 현황</h1>
        <p className="page-description">모든 전략의 보유 포지션을 통합 조회합니다.</p>
      </section>

      <section className="doc-panel doc-panel-info">
        <p className="section-copy" style={{ marginTop: 0 }}>
          이 화면은 OpenForge 내부 체결로 계산한 포지션만 표시합니다. 실제 계좌 원장은{" "}
          <Link href="/broker" className="table-link">
            Broker
          </Link>
          에서 확인하세요.
        </p>
      </section>

      <div className="summary-grid summary-grid-columns-3">
        <article className="metric-card metric-card-accent-primary">
          <p className="metric-card-label">총 포지션</p>
          <p className="metric-card-value">{filteredPositions.length}</p>
        </article>
        <article className="metric-card metric-card-accent-info">
          <p className="metric-card-label">보유 종목</p>
          <p className="metric-card-value">{uniqueSymbols.size}</p>
        </article>
        <article className="metric-card metric-card-accent-secondary">
          <p className="metric-card-label">관련 전략</p>
          <p className="metric-card-value">{uniqueStrategies.size}</p>
        </article>
      </div>

      {strategies.length > 0 ? (
        <div className="filter-bar">
          <span className="form-label">전략 필터</span>
          <select
            className="filter-select"
            value={selectedStrategyId ?? ""}
            onChange={(e) => setSelectedStrategyId(e.target.value || null)}
          >
            <option value="">전체</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      ) : null}

      <section id="positions-detail">
        <h2 className="section-title">전략별 보유</h2>
        {filteredPositions.length === 0 ? (
          <div className="empty-state empty-state-compact">
            <p className="empty-state-message">보유 포지션이 없습니다</p>
          </div>
        ) : (
          <div className="doc-panel">
            <div className="table-shell">
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
                        <Link href={`/strategies/${pos.strategyId}`} className="table-link">
                          {pos.strategyName}
                        </Link>
                      </td>
                      <td>{pos.netQuantity}</td>
                      <td>{pos.avgEntryPrice.toLocaleString()}</td>
                      <td>{formatDateTime(pos.lastFillAt) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
