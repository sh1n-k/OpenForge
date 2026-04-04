import type {
  StrategyExecutionRun,
  StrategySignalEvent,
} from "@/lib/api";
import { formatDateTime, shortId } from "@/lib/format";

type Props = {
  runs: StrategyExecutionRun[];
  signals: StrategySignalEvent[];
};

export function StrategyActivitySection({ runs, signals }: Props) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-8">
      <section
        id="strategy-activity"
        className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm h-full"
      >
        <div className="mb-6 pb-4 border-b border-border/60">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">최근 실행 로그</h2>
        </div>
        <div className="grid gap-3">
          {runs.length === 0 ? (
            <p className="m-0 text-muted text-[0.9375rem]">
              아직 실행 로그가 없습니다.
            </p>
          ) : (
            runs.map((run) => (
              <article
                key={run.runId}
                className="p-5 border border-border-soft rounded-xl bg-[#fafafa]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4 pb-3 border-b border-border/60">
                  <div className="grid gap-1.5">
                    <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase font-mono">
                      {shortId(run.runId)}
                    </p>
                    <p className="m-0 text-foreground font-medium text-[0.9375rem]">
                      {run.triggerType} / {run.scheduledDate} / v
                      {shortId(run.strategyVersionId)}
                    </p>
                  </div>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-surface text-muted border border-border">
                    {run.status}
                  </span>
                </div>
                <div className="grid gap-3">
                  <div className="grid gap-1">
                    <span className="text-subtle text-xs font-semibold tracking-wider uppercase">종목 수</span>
                    <span className="text-foreground font-medium text-[0.9375rem]">{run.symbolCount}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-subtle text-xs font-semibold tracking-wider uppercase">시그널 수</span>
                    <span className="text-foreground font-medium text-[0.9375rem]">{run.signalCount}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-subtle text-xs font-semibold tracking-wider uppercase">시작</span>
                    <span className="text-foreground font-medium text-[0.9375rem] font-mono">{formatDateTime(run.startedAt) ?? "대기 중"}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-subtle text-xs font-semibold tracking-wider uppercase">완료</span>
                    <span className="text-foreground font-medium text-[0.9375rem] font-mono">{formatDateTime(run.completedAt) ?? "대기 중"}</span>
                  </div>
                </div>
                {run.errorMessage ? (
                  <div className="p-4 rounded-xl bg-error-soft text-error border border-error/20 mt-4 text-[0.9375rem] font-medium flex items-start gap-2">
                    <p className="m-0 text-[0.9375rem] font-medium text-error flex items-start gap-2">{run.errorMessage}</p>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm h-full">
        <div className="mb-6 pb-4 border-b border-border/60">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">최근 시그널 이력</h2>
        </div>
        <div className="grid gap-3">
          {signals.length === 0 ? (
            <p className="m-0 text-muted text-[0.9375rem]">
              아직 시그널 이력이 없습니다.
            </p>
          ) : (
            signals.map((signal) => (
              <article
                key={signal.id}
                className="p-5 border border-border-soft rounded-xl bg-[#fafafa]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="grid gap-1.5">
                    <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">
                      {signal.symbol} / {signal.signalType}
                    </p>
                    <p className="m-0 text-foreground font-medium text-[0.9375rem]">
                      {signal.tradingDate} / v{shortId(signal.strategyVersionId)}
                    </p>
                  </div>
                  <span className="text-muted text-[0.8125rem]">
                    {formatDateTime(signal.createdAt)}
                  </span>
                </div>
                <pre className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 font-mono overflow-auto whitespace-pre-wrap mt-4" style={{ wordBreak: "break-all" }}>
                  {JSON.stringify(signal.payload)}
                </pre>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
