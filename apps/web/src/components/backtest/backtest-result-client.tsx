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
    <main className="grid content-start gap-8 w-[min(100%,var(--content-width))] mx-auto px-5 pt-8 pb-16">
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,360px)] gap-6 items-start">
        <section
          id="run-summary"
          className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-6 mb-2 pb-6 border-b border-border/60">
            <div className="grid gap-2">
              <p className="m-0 text-primary font-bold tracking-wider uppercase text-xs">백테스트 결과</p>
              <h1 className="m-0 font-sans text-3xl font-bold tracking-tight text-foreground">{run.runId}</h1>
              <p className="m-0 text-muted font-medium flex items-center gap-2">
                {statusLabel(run.status)} / 종목 {run.symbols.join(", ")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase border ${run.status === 'completed' ? 'bg-success-soft text-success border-success/20' : run.status === 'failed' ? 'bg-error-soft text-error border-error/20' : 'bg-info-soft text-info border-info/20'}`}>
                {statusLabel(run.status)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4">
            <Link
              href={`/strategies/${run.strategyId}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg bg-surface border border-border text-foreground hover:bg-[#fafafa] hover:border-gray-300 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border disabled:opacity-50"
            >
              전략
            </Link>
            <Link
              href={`/strategies/${run.strategyId}/backtest`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary !text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              새 실행
            </Link>
          </div>
        </section>

        <aside className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm lg:sticky lg:top-8">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground mb-4">실행 상태</h2>
          <dl className="grid gap-4 mt-6">
            <div className="grid gap-1 pb-3 border-b border-border/40">
              <dt className="text-subtle text-xs font-semibold tracking-wider uppercase">상태</dt>
              <dd className="text-foreground font-medium text-[0.9375rem]">{statusLabel(run.status)}</dd>
            </div>
            <div className="grid gap-1 pb-3 border-b border-border/40">
              <dt className="text-subtle text-xs font-semibold tracking-wider uppercase">전략</dt>
              <dd className="text-foreground font-medium text-[0.9375rem]">{run.strategyId}</dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-subtle text-xs font-semibold tracking-wider uppercase">종목 수</dt>
              <dd className="text-foreground font-medium text-[0.9375rem]">{run.symbols.length}</dd>
            </div>
          </dl>
        </aside>
      </section>

      {error ? <section className="p-4 rounded-xl bg-error-soft text-error border border-error/20 text-[0.9375rem] font-medium flex items-start gap-2 shadow-sm">{error}</section> : null}
      {run.errorMessage ? (
        <section className="p-4 rounded-xl bg-error-soft text-error border border-error/20 text-[0.9375rem] font-medium flex items-start gap-2 shadow-sm">{run.errorMessage}</section>
      ) : null}

      {run.status === "completed" && (
        <>
          <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 justify-start">
            <MetricCard label="총 수익률" value={`${(totalReturnRate * 100).toFixed(2)}%`} accent="border-l-primary" />
            <MetricCard label="최대낙폭" value={`${(maxDrawdownRate * 100).toFixed(2)}%`} accent="border-l-error" />
            <MetricCard label="승률" value={`${(winRate * 100).toFixed(2)}%`} accent="border-l-info" />
            <MetricCard label="거래 횟수" value={`${tradeCount}`} accent="border-l-info" />
            <MetricCard label="평균 손익" value={averagePnl.toFixed(0)} accent={averagePnl >= 0 ? "border-l-success" : "border-l-error"} />
            <MetricCard label="손익비" value={profitFactor.toFixed(2)} accent={profitFactor >= 1 ? "border-l-success" : "border-l-error"} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,400px)] gap-6 items-start mt-4">
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
                className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
              >
                <h2 className="m-0 font-sans text-xl font-bold text-foreground mb-4">실행 설정</h2>
                <dl className="grid gap-4 mt-6">
                  {Object.entries(run.config).map(([key, value]) => (
                    <div key={key} className="grid gap-1 pb-3 border-b border-border/40 last:border-b-0 last:pb-0">
                      <dt className="text-subtle text-xs font-semibold tracking-wider uppercase">{key}</dt>
                      <dd className="text-foreground font-medium text-[0.9375rem]">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section
                id="run-trades"
                className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm overflow-hidden"
              >
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="m-0 font-sans text-xl font-bold text-foreground">거래 내역</h2>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm font-mono text-xs font-semibold bg-border-soft text-foreground border border-border">{run.trades.length}건</span>
                </div>
                <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
                  <table className="w-full text-left border-collapse text-[0.9375rem] whitespace-nowrap">
                    <thead>
                      <tr className="border-b-2 border-border/80">
                        <th className="py-3 px-2 font-semibold text-slate-800">종목</th>
                        <th className="py-3 px-2 font-semibold text-slate-800">진입</th>
                        <th className="py-3 px-2 font-semibold text-slate-800">청산</th>
                        <th className="py-3 px-2 font-semibold text-slate-800 text-right">손익</th>
                        <th className="py-3 px-2 font-semibold text-slate-800 text-center">사유</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-soft align-baseline">
                      {run.trades.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-muted">아직 거래가 없습니다.</td>
                        </tr>
                      ) : (
                        run.trades.map((trade) => (
                          <tr key={`${trade.symbol}-${trade.entryDate}-${trade.exitDate}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-2 font-semibold text-foreground">{trade.symbol}</td>
                            <td className="py-3 px-2">
                              <div className="text-slate-600 font-mono text-sm">{trade.entryDate}</div>
                              <div className="text-foreground font-medium text-[0.9375rem]">{trade.entryPrice.toFixed(2)}</div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="text-slate-600 font-mono text-sm">{trade.exitDate}</div>
                              <div className="text-foreground font-medium text-[0.9375rem]">{trade.exitPrice.toFixed(2)}</div>
                            </td>
                            <td className={`py-3 px-2 text-right font-mono font-medium ${trade.netPnl > 0 ? 'text-rose-600' : trade.netPnl < 0 ? 'text-blue-600' : 'text-slate-600'}`}>{trade.netPnl.toFixed(2)}</td>
                            <td className="py-3 px-2 text-center text-slate-600 text-[0.875rem]">{trade.exitReason}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
          </section>
        </>
      )}
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
    <article className={`grid gap-2 p-5 border border-border-soft rounded-xl bg-surface shadow-sm ${accent ? `border-l-[3px] ${accent}` : ''} hover:shadow hover:border-gray-300 transition-all`}>
      <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">{label}</p>
      <p className="m-0 font-sans text-3xl font-bold text-foreground">{value}</p>
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
    <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm">
      <h2 className="m-0 font-sans text-xl font-bold text-foreground">{title}</h2>
      {data.length === 0 ? (
        <p className="m-0 text-muted mt-4">표시할 데이터가 없습니다.</p>
      ) : (
        <div className="mt-6 aspect-[3/1] w-full min-h-[160px]">
          <svg
            viewBox="0 0 600 220"
            className="w-full h-full overflow-visible"
            role="img"
            preserveAspectRatio="none"
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

  if (data.length <= 1 || range === 0) {
    return `M 0 110 L 600 110`;
  }

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
