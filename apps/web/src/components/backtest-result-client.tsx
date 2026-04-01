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
    <main className="page-shell workbench-page-shell">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <section
          id="run-summary"
          className="doc-panel"
        >
          <div className="page-intro-row">
            <div className="page-intro">
              <p className="page-eyebrow">Backtest Result</p>
              <h1 className="page-title">{run.runId}</h1>
              <p className="page-description">
                {run.status} / symbols {run.symbols.join(", ")}
              </p>
            </div>
            <div className="page-actions">
              <span className="status-chip status-chip-info">{run.status}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/strategies/${run.strategyId}`}
              className="button-secondary"
            >
              Strategy
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
          <h2 className="section-title">Run Status</h2>
          <dl className="mt-4 grid gap-3 text-sm text-slate-600">
            <div>
              <dt className="font-semibold text-slate-900">Status</dt>
              <dd>{run.status}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Strategy</dt>
              <dd>{run.strategyId}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Symbols</dt>
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
        <MetricCard label="총 수익률" value={`${(totalReturnRate * 100).toFixed(2)}%`} />
        <MetricCard label="MDD" value={`${(maxDrawdownRate * 100).toFixed(2)}%`} />
        <MetricCard label="승률" value={`${(winRate * 100).toFixed(2)}%`} />
        <MetricCard label="거래 횟수" value={`${tradeCount}`} />
        <MetricCard label="평균 손익" value={averagePnl.toFixed(0)} />
        <MetricCard label="손익비" value={profitFactor.toFixed(2)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section
          id="run-charts"
          className="grid gap-6"
        >
          <ChartCard
            title="Equity Curve"
            color="#2563eb"
            data={run.equityCurve.map((point) => ({
              label: point.tradingDate,
              value: point.equity,
            }))}
          />
          <ChartCard
            title="Drawdown"
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
            <h2 className="section-title">Run Config</h2>
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
            <h2 className="section-title">Trades</h2>
            <div className="table-shell mt-4">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>PnL</th>
                    <th>Reason</th>
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
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="metric-card">
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
