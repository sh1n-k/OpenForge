import Link from "next/link";
import type { StrategySummary } from "@/lib/api";

const statusLabels: Record<string, string> = {
  running: "실행 중",
  stopped: "중지",
  draft: "초안",
  backtest_completed: "백테스트 완료",
};

const statusChipClass: Record<string, string> = {
  running: "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase border bg-success-soft text-success border-success/20",
  stopped: "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase border bg-warning-soft text-warning border-warning/20",
  draft: "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase border bg-surface text-foreground border-border",
  backtest_completed: "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase border bg-primary-soft text-primary border-primary/20",
};

const typeLabels: Record<string, string> = {
  builder: "빌더형",
  code: "코드형",
};

type StrategyListViewProps = {
  strategies: StrategySummary[];
  onClone?: (strategyId: string) => void;
  onArchive?: (strategyId: string) => void;
};

export function StrategyListView({ strategies, onClone, onArchive }: StrategyListViewProps) {
  if (strategies.length === 0) {
    return (
      <div className="grid gap-3 justify-items-center p-12 px-6 border border-dashed border-border rounded-xl text-center bg-surface shadow-sm">
        <p className="m-0 text-foreground font-semibold text-[1.0625rem]">저장된 전략이 없습니다</p>
        <p className="m-0 text-muted max-w-sm text-sm">상단 폼에서 첫 전략을 생성하세요.</p>
        <div className="mt-4">
          <a href="#strategies-create" className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all">
            전략 만들기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {strategies.map((strategy) => (
        <div key={strategy.id} className="p-5 bg-surface border border-border-soft rounded-xl shadow-sm hover:shadow hover:border-gray-300 transition-all group">
          <div className="flex flex-wrap items-start md:items-center justify-between gap-4">
            <div className="grid gap-1.5 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={statusChipClass[strategy.status] ?? "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-surface text-foreground border border-border"}>
                  {statusLabels[strategy.status] ?? strategy.status}
                </span>
                <span className="text-subtle text-xs font-medium bg-border-soft px-1.5 py-0.5 rounded">
                  {typeLabels[strategy.strategyType] ?? strategy.strategyType}
                </span>
              </div>
              <Link
                href={`/strategies/${strategy.id}`}
                className="font-semibold text-[1.0625rem] text-foreground hover:text-primary transition-colors"
              >
                {strategy.name}
              </Link>
              {strategy.description ? (
                <p className="m-0 text-muted text-[0.9375rem] line-clamp-1">
                  {strategy.description}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-5">
                <div className="text-subtle text-sm">
                  <span className="font-mono font-medium text-muted">v{strategy.latestVersionNumber ?? 0}</span>
                </div>
                <div className="text-subtle text-sm">
                  <span className="font-mono font-medium text-muted">{strategy.universeCount ?? 0}</span>개 유니버스
                </div>
              </div>
              {onClone || onArchive ? (
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onClone ? (
                    <button
                      type="button"
                      onClick={() => onClone(strategy.id)}
                      className="px-3 py-1.5 text-sm font-medium text-muted hover:text-primary hover:bg-primary-soft rounded-lg transition-all"
                    >
                      복제
                    </button>
                  ) : null}
                  {onArchive ? (
                    <button
                      type="button"
                      onClick={() => onArchive(strategy.id)}
                      className="px-3 py-1.5 text-sm font-medium text-muted hover:text-error hover:bg-error-soft rounded-lg transition-all"
                    >
                      보관
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
