"use client";

import type { MarketCoverage } from "@/lib/api";

type BacktestRunnerCoverageAsideProps = {
  resolvedSymbolsCount: number;
  coverage: MarketCoverage | null;
  coverageError: string | null;
};

export function BacktestRunnerCoverageAside({
  resolvedSymbolsCount,
  coverage,
  coverageError,
}: BacktestRunnerCoverageAsideProps) {
  return (
    <section
      id="backtest-coverage"
      className="doc-panel"
    >
      <h2 className="section-title">데이터 커버리지</h2>
      <p className="section-copy">
        현재 실행 대상 종목 {resolvedSymbolsCount}개
      </p>
      {coverageError ? (
        <p className="mt-3 text-sm text-rose-600">{coverageError}</p>
      ) : null}
      {coverage ? (
        <div className="mt-4 stack-list">
          <p
            className={`text-sm font-medium ${
              coverage.covered ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {coverage.covered
              ? "데이터 커버리지가 충분합니다."
              : "누락된 종목이 있습니다."}
          </p>
          {coverage.symbols.map((item) => (
            <div
              key={item.symbol}
              className="list-card"
            >
              <div className="doc-nav-title">{item.symbol}</div>
              <div className="doc-nav-description">
                {item.firstDate ?? "미확인"} - {item.lastDate ?? "미확인"} /{" "}
                {item.covered ? "충분" : "누락"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state empty-state-compact">
          <p className="empty-state-message">종목과 기간을 지정하면 커버리지를 확인합니다</p>
        </div>
      )}
    </section>
  );
}
