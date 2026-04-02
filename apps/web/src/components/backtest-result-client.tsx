"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadBacktest, type BacktestRunDetail } from "@/lib/api";

type BacktestResultClientProps = {
  initialRun: BacktestRunDetail;
};

export function BacktestResultClient({
  initialRun,
}: BacktestResultClientProps) {
  const [run, setRun] = useState(initialRun);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (run.status !== "queued" && run.status !== "running") {
      return;
    }

    async function poll() {
      try {
        const next = await loadBacktest(run.runId);
        setRun(next);
      } catch (pollError) {
        setError(
          pollError instanceof Error ? pollError.message : "결과 조회에 실패했습니다.",
        );
      }
    }

    void poll();

    const interval = window.setInterval(async () => {
      await poll();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [run.runId, run.status]);

  const summary = run.summary ?? {};
  const totalReturnRate = numberValue(summary.totalReturnRate);
  const maxDrawdownRate = numberValue(summary.maxDrawdownRate);
  const winRate = numberValue(summary.winRate);
  const tradeCount = numberValue(summary.tradeCount);
  const averagePnl = numberValue(summary.averagePnl);
  const profitFactor = numberValue(summary.profitFactor);

  return (
    <main className="page-shell docs-page-shell">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <section
          id="run-summary"
          className="doc-panel"
        >
          <div className="page-intro-row">
            <div className="page-intro">
              <p className="page-eyebrow">백테스트 결과</p>
              <h1 className="page-title">{run.runId}</h1>
              <p className="page-description">
                {statusLabel(run.status)} / 종목 {run.symbols.join(", ")}
              </p>
            </div>
            <div className="page-actions">
              <span className="status-chip status-chip-info">{statusLabel(run.status)}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/strategies/${run.strategyId}`}
              className="button-secondary"
            >
              전략
            </Link>
            <Link
              href={`/strategies/${run.strategyId}/backtest`}
              className="button-primary"
            >
              새 실행
            </Link>
          </div>
        </section>

        <aside className="doc-panel doc-panel-soft lg:sticky lg:top-28">
          <h2 className="section-title">실행 상태</h2>
          <dl className="mt-4 grid gap-3 text-sm text-slate-600">
            <div>
              <dt className="font-semibold text-slate-900">상태</dt>
              <dd>{statusLabel(run.status)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">전략</dt>
              <dd>{run.strategyId}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">종목 수</dt>
              <dd>{run.symbols.length}</dd>
            </div>
          </dl>
        </aside>
      </section>

      {error ? <section className="doc-panel doc-panel-error">{error}</section> : null}
      {run.errorMessage ? (
        <section className="doc-panel doc-panel-error">{run.errorMessage}</section>
      ) : null}

      <section className="summary-grid summary-grid-columns-3">
        <MetricCard label="총 수익률" value={`${(totalReturnRate * 100).toFixed(2)}%`} accent="metric-card-accent-primary" />
        <MetricCard label="최대낙폭" value={`${(maxDrawdownRate * 100).toFixed(2)}%`} accent="metric-card-accent-secondary" />
        <MetricCard label="승률" value={`${(winRate * 100).toFixed(2)}%`} accent="metric-card-accent-info" />
        <MetricCard label="거래 횟수" value={`${tradeCount}`} accent="metric-card-accent-info" />
        <MetricCard label="평균 손익" value={averagePnl.toFixed(0)} accent="metric-card-accent-pnl" />
        <MetricCard label="손익비" value={profitFactor.toFixed(2)} accent="metric-card-accent-pnl" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section
          id="run-charts"
          className="grid gap-6"
        >
          <ChartCard
            title="자산 곡선"
            color="#2563eb"
            data={run.equityCurve.map((point) => ({
              label: point.tradingDate,
              value: point.equity,
            }))}
          />
          <ChartCard
            title="낙폭"
            color="#dc2626"
            data={run.equityCurve.map((point) => ({
              label: point.tradingDate,
              value: point.drawdown,
            }))}
          />
        </section>

        <section className="grid gap-6">
          <section
            id="run-config"
            className="doc-panel"
          >
            <h2 className="section-title">실행 설정</h2>
            <dl className="mt-4 grid gap-3 text-sm text-slate-600">
              {Object.entries(run.config).map(([key, value]) => (
                <div key={key}>
                  <dt className="doc-nav-title">{key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section
            id="run-trades"
            className="doc-panel"
          >
            <h2 className="section-title">거래 내역</h2>
            <div className="table-shell mt-4">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>종목</th>
                    <th>진입</th>
                    <th>청산</th>
                    <th>손익</th>
                    <th>사유</th>
                  </tr>
                </thead>
                <tbody>
                  {run.trades.length === 0 ? (
                    <tr>
                      <td colSpan={5}>아직 거래가 없습니다.</td>
                    </tr>
                  ) : (
                    run.trades.map((trade) => (
                      <tr key={`${trade.symbol}-${trade.entryDate}-${trade.exitDate}`}>
                        <td>{trade.symbol}</td>
                        <td>
                          {trade.entryDate} / {trade.entryPrice.toFixed(2)}
                        </td>
                        <td>
                          {trade.exitDate} / {trade.exitPrice.toFixed(2)}
                        </td>
                        <td>{trade.netPnl.toFixed(2)}</td>
                        <td>{trade.exitReason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <article className={`metric-card${accent ? ` ${accent}` : ""}`}>
      <p className="metric-card-label">{label}</p>
      <p className="metric-card-value">{value}</p>
    </article>
  );
}

function ChartCard({
  title,
  color,
  data,
}: {
  title: string;
  color: string;
  data: Array<{ label: string; value: number }>;
}) {
  return (
    <section className="doc-panel">
      <h2 className="section-title">{title}</h2>
      {data.length === 0 ? (
        <p className="section-copy">표시할 데이터가 없습니다.</p>
      ) : (
        <div className="mt-4">
          <svg
            viewBox="0 0 600 220"
            className="w-full overflow-visible"
            role="img"
            aria-label={title}
          >
            <path
              d={buildLinePath(data)}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </section>
  );
}

function buildLinePath(data: Array<{ label: string; value: number }>) {
  const values = data.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  return data
    .map((point, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 560 + 20;
      const y = 190 - ((point.value - minValue) / range) * 160;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function numberValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return Number(value);
  }
  return 0;
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
