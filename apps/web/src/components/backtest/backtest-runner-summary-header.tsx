"use client";

import Link from "next/link";
import type { MarketCoverage, StrategyDetail, StrategyVersion } from "@/lib/api";

type BacktestRunnerSummaryHeaderProps = {
  strategy: StrategyDetail;
  versions: StrategyVersion[];
  selectedVersionId: string;
  resolvedSymbolsCount: number;
  useDirectSymbols: boolean;
  startDate: string;
  endDate: string;
  coverage: MarketCoverage | null;
  canRun: boolean;
  hasOverseasUniverses: boolean;
};

export function BacktestRunnerSummaryHeader({
  strategy,
  versions,
  selectedVersionId,
  resolvedSymbolsCount,
  useDirectSymbols,
  startDate,
  endDate,
  coverage,
  canRun,
  hasOverseasUniverses,
}: BacktestRunnerSummaryHeaderProps) {
  const selectedVersionNumber =
    versions.find((version) => version.id === selectedVersionId)?.versionNumber ?? "?";

  return (
    <>
      <section
        id="backtest-summary"
        className="doc-panel"
      >
        <div className="page-intro-row">
          <div className="page-intro">
            <p className="page-eyebrow">백테스트 작업대</p>
            <h1 className="page-title">{strategy.name}</h1>
            <p className="page-description">
              버전, 대상 종목, 기간, 커버리지를 먼저 맞춘 뒤 백테스트를 실행합니다.
            </p>
          </div>
          <div className="page-actions">
            <span className={canRun ? "status-chip status-chip-success" : "status-chip status-chip-warning"}>
              {canRun ? "실행 가능" : "실행 보류"}
            </span>
            <span className="status-chip status-chip-info">
              {useDirectSymbols ? "직접 입력" : "유니버스 연결"}
            </span>
            <span className="status-chip status-chip-info">{resolvedSymbolsCount}개 종목</span>
          </div>
        </div>

        <div className="summary-grid summary-grid-columns-3" style={{ marginTop: 16 }}>
          <article className="metric-card metric-card-accent-primary">
            <p className="metric-card-label">버전</p>
            <p className="metric-card-value">v{selectedVersionNumber}</p>
            <p className="metric-card-copy">실행 대상으로 선택됨</p>
          </article>
          <article className="metric-card metric-card-accent-info">
            <p className="metric-card-label">대상</p>
            <p className="metric-card-value">{resolvedSymbolsCount}</p>
            <p className="metric-card-copy">
              {useDirectSymbols ? "직접 심볼 입력" : "연결된 유니버스 사용"}
            </p>
          </article>
          <article className="metric-card metric-card-accent-secondary">
            <p className="metric-card-label">커버리지</p>
            <p className="metric-card-value">
              {coverage ? (coverage.covered ? "준비 완료" : "누락") : "확인 중"}
            </p>
            <p className="metric-card-copy">
              {startDate} - {endDate}
            </p>
          </article>
        </div>

        <div className="page-actions" style={{ marginTop: 16 }}>
          <Link
            href={`/strategies/${strategy.id}`}
            className="button-secondary"
          >
            상세 보기
          </Link>
          <Link
            href={`/strategies/${strategy.id}/edit`}
            className="button-primary"
          >
            편집기 열기
          </Link>
        </div>

        {hasOverseasUniverses ? (
          <div className="doc-panel doc-panel-warn mt-4">
            해외 유니버스가 연결되어 있어 이 화면에서는 백테스트를 실행할 수 없습니다.
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <aside className="doc-panel doc-panel-soft lg:sticky lg:top-28">
          <h2 className="section-title">실행 준비</h2>
          <p className="section-copy">
            설정과 커버리지가 맞아야 실행 버튼이 활성화됩니다.
          </p>
          {hasOverseasUniverses ? (
            <p className="inline-warning" style={{ marginTop: 12 }}>
              해외 유니버스가 포함된 전략은 현재 백테스트가 차단됩니다.
            </p>
          ) : null}
          <dl className="mt-4 grid gap-3 text-sm text-slate-600">
            <div>
              <dt className="font-semibold text-slate-900">버전</dt>
              <dd>{selectedVersionNumber}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">대상 종목</dt>
              <dd>{resolvedSymbolsCount}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">기간</dt>
              <dd>
                {startDate} - {endDate}
              </dd>
            </div>
          </dl>
        </aside>
      </section>
    </>
  );
}
