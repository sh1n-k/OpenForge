import type { StrategyDetail } from "@/lib/api";

const statusLabel: Record<string, string> = {
  running: "실행 중",
  stopped: "중지",
  draft: "초안",
  backtest_completed: "백테스트 완료",
};

type InfoPanelProps = {
  strategy: StrategyDetail;
};

export function StrategyInfoPanel({ strategy }: InfoPanelProps) {
  return (
    <section className="flex flex-col p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm h-full">
      <h2 className="m-0 mb-6 font-sans text-xl font-bold text-foreground">개요</h2>
      <div className="grid gap-6 flex-1">
        <div className="grid gap-1.5">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">설명</p>
          <p className="m-0 text-foreground font-medium text-[0.9375rem] leading-relaxed">{strategy.description ?? "설명 없음"}</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="grid gap-1.5">
            <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">검증 상태</p>
            <p className="m-0 text-foreground font-medium text-[0.9375rem]">{strategy.latestValidationStatus ?? "미검증"}</p>
          </div>
          <div className="grid gap-1.5">
            <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">버전 수</p>
            <p className="m-0 text-foreground font-medium text-[0.9375rem]">{strategy.versionCount}</p>
          </div>
          <div className="grid gap-1.5">
            <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">현재 상태</p>
            <p className="m-0 text-foreground font-medium text-[0.9375rem]">{statusLabel[strategy.status] ?? strategy.status}</p>
          </div>
        </div>
      </div>
      {strategy.latestValidationErrors.length > 0 ? (
        <div className="mt-8 p-4 rounded-xl bg-error-soft border border-error/20 flex flex-col gap-2">
          {strategy.latestValidationErrors.map((item, index) => (
            <p key={`${item.category}-${index}`} className="m-0 text-[0.9375rem] font-medium text-error flex items-start gap-2">
              <span className="font-mono text-xs mt-0.5 px-1 bg-error/10 rounded">[{item.category}]</span>
              <span>{item.message}</span>
            </p>
          ))}
        </div>
      ) : null}
      {strategy.latestValidationWarnings.length > 0 ? (
        <div className="mt-4 p-4 rounded-xl bg-warning-soft border border-warning/20 flex flex-col gap-2">
          {strategy.latestValidationWarnings.map((item, index) => (
            <p key={`${item.category}-${index}`} className="m-0 text-[0.9375rem] font-medium text-warning flex items-start gap-2">
              <span className="font-mono text-xs mt-0.5 px-1 bg-warning/10 rounded">[{item.category}]</span>
              <span>{item.message}</span>
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
