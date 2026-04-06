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
    <main className="grid content-start gap-8 w-[min(100%,var(--content-width))] mx-auto px-5 pt-8 pb-16">
      <PageIntroSection
        id="positions-summary"
        eyebrow="Positions"
        title="포지션 현황"
        description="모든 전략의 보유 포지션을 통합 조회합니다."
      />

      <section className="p-5 bg-primary-soft/30 border border-primary/20 rounded-xl">
        <p className="m-0 text-muted text-[0.9375rem] leading-relaxed">
          이 화면은 OpenForge 내부 체결로 계산한 포지션만 표시합니다. 실제 계좌 원장은{" "}
          <Link href="/broker" className="font-semibold text-primary hover:text-primary-hover underline underline-offset-2 transition-colors">
            Broker
          </Link>
          에서 확인하세요.
        </p>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 justify-start">
        <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-primary">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">총 포지션</p>
          <p className="m-0 font-sans text-3xl leading-snug font-bold text-foreground">{filteredPositions.length}</p>
          <p className="m-0 text-muted text-[0.875rem]">현재 필터 기준 포지션 수</p>
        </article>
        <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-info">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">보유 종목</p>
          <p className="m-0 font-sans text-3xl leading-snug font-bold text-foreground">{uniqueSymbols.size}</p>
          <p className="m-0 text-muted text-[0.875rem]">현재 보유 중인 심볼 수</p>
        </article>
        <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-secondary">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">관련 전략</p>
          <p className="m-0 font-sans text-3xl leading-snug font-bold text-foreground">{uniqueStrategies.size}</p>
          <p className="m-0 text-muted text-[0.875rem]">포지션을 보유한 전략 수</p>
        </article>
      </div>

      <OperationsControlPanel
        id="positions-filters"
        title="조회 기준"
        description="전략 기준으로 포지션 집계를 좁혀 볼 수 있습니다."
      >
        {strategies.length > 0 ? (
          <div className="mt-4">
            <label className="grid gap-1.5 focus-within:text-primary max-w-sm">
              <span className="text-subtle text-sm font-medium transition-colors">전략 필터</span>
              <select
                className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%221.5%22%20stroke%3D%22%2371717a%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M8.25%2015L12%2018.75%2015.75%2015m-7.5-6L12%205.25%2015.75%209%22%20%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[size:1.5em_1.5em] pr-10"
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
          <p className="m-0 mt-4 text-muted text-sm border-l-2 border-border pl-3">
            저장된 전략이 없어 전체 포지션 기준으로 표시합니다.
          </p>
        )}
      </OperationsControlPanel>

      <section id="positions-detail" className="grid gap-5">
        <SectionHeaderBlock title="전략별 보유" />
        {filteredPositions.length === 0 ? (
          <div className="grid justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center bg-surface shadow-sm">
            <p className="m-0 font-medium text-muted">보유 포지션이 없습니다</p>
          </div>
        ) : (
          <div className="p-6 border border-border-soft rounded-xl bg-surface shadow-sm overflow-hidden">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">심볼</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">전략</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">순수량</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">평균단가</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">최근 체결</th>
                  </tr>
                </thead>
                <tbody className="align-baseline">
                  {filteredPositions.map((pos) => (
                    <tr key={`${pos.strategyId}-${pos.symbol}`} className="group hover:bg-slate-50/50">
                      <td className="py-3 border-b border-border-soft font-mono font-semibold text-foreground">{pos.symbol}</td>
                      <td className="py-3 border-b border-border-soft">
                        <Link href={`/strategies/${pos.strategyId}`} className="font-medium text-foreground hover:text-primary transition-colors">
                          {pos.strategyName}
                        </Link>
                      </td>
                      <td className="py-3 border-b border-border-soft font-mono text-right text-muted">{pos.netQuantity}</td>
                      <td className="py-3 border-b border-border-soft font-mono text-right text-muted">{pos.avgEntryPrice.toLocaleString()}</td>
                      <td className="py-3 border-b border-border-soft text-right text-[0.8125rem] text-muted">{formatDateTime(pos.lastFillAt) ?? "—"}</td>
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
