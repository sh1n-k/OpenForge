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
      <div className="empty-state">
        <p className="empty-state-message">저장된 전략이 없습니다</p>
        <p className="empty-state-hint">상단 폼에서 첫 전략을 생성하세요.</p>
      </div>
    );
  }

  return (
    <div className="stack-list">
      {strategies.map((strategy) => (
        <div key={strategy.id} className="list-card">
          <div className="flex-between">
            <div>
              <div className="flex-center" style={{ marginBottom: 4 }}>
                <span className={statusChipClass[strategy.status] ?? "status-chip"}>
                  {statusLabels[strategy.status] ?? strategy.status}
                </span>
                <span className="text-subtle" style={{ fontSize: "0.8125rem" }}>
                  {typeLabels[strategy.strategyType] ?? strategy.strategyType}
                </span>
              </div>
              <Link href={`/strategies/${strategy.id}`} className="table-link" style={{ fontSize: "1.0625rem", fontWeight: 600 }}>
                {strategy.name}
              </Link>
              {strategy.description ? (
                <p className="section-copy" style={{ marginTop: 2 }}>{strategy.description}</p>
              ) : null}
            </div>
            <div className="flex-center" style={{ gap: 12 }}>
              <div style={{ textAlign: "right" }}>
                <div className="text-subtle" style={{ fontSize: "0.75rem" }}>v{strategy.latestVersionNumber ?? 0}</div>
                <div className="text-subtle" style={{ fontSize: "0.75rem" }}>{strategy.universeCount ?? 0}개 유니버스</div>
              </div>
              {onClone || onArchive ? (
                <div className="page-actions">
                  {onClone ? (
                    <button type="button" onClick={() => onClone(strategy.id)} className="button-ghost">
                      복제
                    </button>
                  ) : null}
                  {onArchive ? (
                    <button type="button" onClick={() => onArchive(strategy.id)} className="button-ghost" style={{ color: "var(--error)" }}>
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
