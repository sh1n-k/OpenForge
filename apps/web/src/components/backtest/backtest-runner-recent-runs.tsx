"use client";

import Link from "next/link";
import type { BacktestRunSummary, StrategyVersion } from "@/lib/api";

type BacktestRunnerRecentRunsProps = {
  runs: BacktestRunSummary[];
  versions: StrategyVersion[];
};

export function BacktestRunnerRecentRuns({
  runs,
  versions,
}: BacktestRunnerRecentRunsProps) {
  return (
    <section
      id="backtest-runs"
      className="doc-panel"
    >
      <h2 className="section-title">최근 실행</h2>
      <div className="mt-4 stack-list">
        {runs.length === 0 ? (
          <div className="empty-state empty-state-compact">
            <p className="empty-state-message">실행 기록이 없습니다</p>
            <p className="empty-state-hint">설정을 마친 뒤 백테스트를 실행하면 이곳에 남습니다.</p>
          </div>
        ) : (
          runs.map((run) => (
            <Link
              key={run.runId}
              href={`/backtests/${run.runId}`}
              className="doc-nav-link list-card"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="doc-nav-title">{statusLabel(run.status)}</span>
                <span className="metric-card-label">
                  v{versionNumberFor(run.strategyVersionId, versions)}
                </span>
              </div>
              <p className="doc-nav-description">{formatDate(run.requestedAt)}</p>
              {run.headlineMetrics ? (
                <p className="section-copy">
                  수익률 {(run.headlineMetrics.totalReturnRate * 100).toFixed(2)}% /
                  거래 {run.headlineMetrics.tradeCount}건
                </p>
              ) : null}
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function versionNumberFor(strategyVersionId: string, versions: StrategyVersion[]) {
  return versions.find((version) => version.id === strategyVersionId)?.versionNumber ?? "?";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR");
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    queued: "대기",
    running: "실행 중",
    completed: "완료",
    failed: "실패",
  };
  return map[status] ?? status;
}
