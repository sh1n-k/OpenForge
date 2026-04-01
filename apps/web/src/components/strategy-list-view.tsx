import Link from "next/link";
import type { StrategySummary } from "@/lib/api";

type StrategyListViewProps = {
  strategies: StrategySummary[];
};

export function StrategyListView({ strategies }: StrategyListViewProps) {
  if (strategies.length === 0) {
    return (
      <section
        id="strategies-registry"
        className="doc-panel doc-panel-soft text-center"
      >
        저장된 전략이 없습니다. 상단 폼에서 첫 전략을 생성하세요.
      </section>
    );
  }

  return (
    <section
      id="strategies-registry"
      className="stack-list"
    >
      {strategies.map((strategy) => (
        <Link
          key={strategy.id}
          href={`/strategies/${strategy.id}`}
          className="doc-nav-link doc-panel"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-2">
              <p className="metric-card-label">
                {strategy.strategyType} / {strategy.status}
              </p>
              <h2 className="section-title">
                {strategy.name}
              </h2>
              <p className="section-copy">
                {strategy.description ?? "설명이 아직 없습니다."}
              </p>
            </div>
            <div className="list-card text-right">
              <div className="metric-card-label">Version</div>
              <div className="doc-nav-title">v{strategy.latestVersionNumber ?? 0}</div>
              <div className="doc-nav-description">
                {strategy.universeCount} universes
              </div>
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}
