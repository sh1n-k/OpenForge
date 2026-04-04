"use client";

import Link from "next/link";
import { useState } from "react";
import type { CrossStrategyPosition, StrategySummary } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  OperationsControlPanel,
  PageIntroSection,
  SectionHeaderBlock,
} from "@/components/page-layout";

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
    <main className="page-shell docs-page-shell page-shell-operations">
      <PageIntroSection
        id="positions-summary"
        eyebrow="Positions"
        title="포지션 현황"
        description="모든 전략의 보유 포지션을 통합 조회합니다."
      />

      <section className="doc-panel doc-panel-info doc-panel-compact">
        <p className="section-copy doc-panel-copy">
          이 화면은 OpenForge 내부 체결로 계산한 포지션만 표시합니다. 실제 계좌 원장은{" "}
          <Link href="/broker" className="table-link">
            Broker
          </Link>
          에서 확인하세요.
        </p>
      </section>

      <div className="summary-grid summary-grid-metrics">
        <article className="metric-card metric-card-accent-primary">
          <p className="metric-card-label">총 포지션</p>
          <p className="metric-card-value">{filteredPositions.length}</p>
          <p className="metric-card-copy">현재 필터 기준 포지션 수</p>
        </article>
        <article className="metric-card metric-card-accent-info">
          <p className="metric-card-label">보유 종목</p>
          <p className="metric-card-value">{uniqueSymbols.size}</p>
          <p className="metric-card-copy">현재 보유 중인 심볼 수</p>
        </article>
        <article className="metric-card metric-card-accent-secondary">
          <p className="metric-card-label">관련 전략</p>
          <p className="metric-card-value">{uniqueStrategies.size}</p>
          <p className="metric-card-copy">포지션을 보유한 전략 수</p>
        </article>
      </div>

      <OperationsControlPanel
        id="positions-filters"
        title="조회 기준"
        description="전략 기준으로 포지션 집계를 좁혀 볼 수 있습니다."
      >
        {strategies.length > 0 ? (
          <div className="filter-panel-form">
            <label className="form-field filter-panel-field">
              <span className="form-label">전략 필터</span>
              <select
                className="filter-select"
                value={selectedStrategyId ?? ""}
                onChange={(e) => setSelectedStrategyId(e.target.value || null)}
              >
                <option value="">전체</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <p className="filter-panel-note">
            저장된 전략이 없어 전체 포지션 기준으로 표시합니다.
          </p>
        )}
      </OperationsControlPanel>

      <section id="positions-detail">
        <SectionHeaderBlock title="전략별 보유" />
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
