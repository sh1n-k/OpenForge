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
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 md:px-10">
      <section className="rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.3)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Backtest Result
            </p>
            <h1 className="mt-2 text-4xl font-semibold">{run.runId}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {run.status} / symbols {run.symbols.join(", ")}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/strategies/${run.strategyId}`}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white"
            >
              Strategy
            </Link>
            <Link
              href={`/strategies/${run.strategyId}/backtest`}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
            >
              새 실행
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </section>
      ) : null}

      {run.errorMessage ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {run.errorMessage}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="총 수익률" value={`${(totalReturnRate * 100).toFixed(2)}%`} />
        <MetricCard label="MDD" value={`${(maxDrawdownRate * 100).toFixed(2)}%`} />
        <MetricCard label="승률" value={`${(winRate * 100).toFixed(2)}%`} />
        <MetricCard label="거래 횟수" value={`${tradeCount}`} />
        <MetricCard label="평균 손익" value={averagePnl.toFixed(0)} />
        <MetricCard label="손익비" value={profitFactor.toFixed(2)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="grid gap-6">
          <ChartCard
            title="Equity Curve"
            color="#0f766e"
            data={run.equityCurve.map((point) => ({
              label: point.tradingDate,
              value: point.equity,
            }))}
          />
          <ChartCard
            title="Drawdown"
            color="#b91c1c"
            data={run.equityCurve.map((point) => ({
              label: point.tradingDate,
              value: point.drawdown,
            }))}
          />
        </section>

        <section className="grid gap-6">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold text-slate-950">Run Config</h2>
            <dl className="mt-4 grid gap-3 text-sm text-slate-600">
              {Object.entries(run.config).map(([key, value]) => (
                <div key={key}>
                  <dt className="font-semibold text-slate-900">{key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold text-slate-950">Trades</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="pb-3">Symbol</th>
                    <th className="pb-3">Entry</th>
                    <th className="pb-3">Exit</th>
                    <th className="pb-3">PnL</th>
                    <th className="pb-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {run.trades.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-4 text-slate-500"
                      >
                        아직 거래가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    run.trades.map((trade) => (
                      <tr
                        key={`${trade.symbol}-${trade.entryDate}-${trade.exitDate}`}
                        className="border-t border-slate-100"
                      >
                        <td className="py-3">{trade.symbol}</td>
                        <td className="py-3">
                          {trade.entryDate} / {trade.entryPrice.toFixed(2)}
                        </td>
                        <td className="py-3">
                          {trade.exitDate} / {trade.exitPrice.toFixed(2)}
                        </td>
                        <td className="py-3">{trade.netPnl.toFixed(2)}</td>
                        <td className="py-3">{trade.exitReason}</td>
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
    <article className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
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
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
      {data.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">표시할 데이터가 없습니다.</p>
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
