import Link from "next/link";
import type { StrategySummary } from "@/lib/api";

const statusLabels: Record<string, string> = {
  running: "실행 중",
  stopped: "중지",
  draft: "초안",
  backtest_completed: "백테스트 완료",
};

const statusChipClass: Record<string, string> = {
  running: "status-chip status-chip-success",
  stopped: "status-chip status-chip-warning",
  draft: "status-chip",
  backtest_completed: "status-chip status-chip-info",
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
      <div className="empty-state empty-state-compact">
        <p className="empty-state-message">저장된 전략이 없습니다</p>
        <p className="empty-state-hint">상단 폼에서 첫 전략을 생성하세요.</p>
        <div className="page-actions">
          <a href="#strategies-create" className="button-primary">
            전략 만들기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="stack-list">
      {strategies.map((strategy) => (
        <div key={strategy.id} className="list-card">
          <div className="flex-between">
            <div className="strategy-list-card-body">
              <div className="flex-center strategy-list-card-topline">
                <span className={statusChipClass[strategy.status] ?? "status-chip"}>
                  {statusLabels[strategy.status] ?? strategy.status}
                </span>
                <span className="text-subtle strategy-list-card-type">
                  {typeLabels[strategy.strategyType] ?? strategy.strategyType}
                </span>
              </div>
              <Link
                href={`/strategies/${strategy.id}`}
                className="table-link strategy-list-link"
              >
                {strategy.name}
              </Link>
              {strategy.description ? (
                <p className="section-copy strategy-list-description">
                  {strategy.description}
                </p>
              ) : null}
            </div>
            <div className="flex-center strategy-list-card-meta">
              <div className="strategy-list-metadata">
                <div className="text-subtle strategy-list-stat">
                  v{strategy.latestVersionNumber ?? 0}
                </div>
                <div className="text-subtle strategy-list-stat">
                  {strategy.universeCount ?? 0}개 유니버스
                </div>
              </div>
              {onClone || onArchive ? (
                <div className="page-actions strategy-list-actions">
                  {onClone ? (
                    <button
                      type="button"
                      onClick={() => onClone(strategy.id)}
                      className="button-ghost"
                    >
                      복제
                    </button>
                  ) : null}
                  {onArchive ? (
                    <button
                      type="button"
                      onClick={() => onArchive(strategy.id)}
                      className="button-ghost strategy-list-archive"
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
