import Link from "next/link";
import type { StrategySummary } from "@/lib/api";

type StrategyListViewProps = {
  strategies: StrategySummary[];
};

export function StrategyListView({ strategies }: StrategyListViewProps) {
  if (strategies.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">
        저장된 전략이 없습니다. 상단 폼에서 첫 전략을 생성하세요.
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      {strategies.map((strategy) => (
        <Link
          key={strategy.id}
          href={`/strategies/${strategy.id}`}
          className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(15,23,42,0.1)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                {strategy.strategyType} / {strategy.status}
              </p>
              <h2 className="text-2xl font-semibold text-slate-950">
                {strategy.name}
              </h2>
              <p className="text-sm text-slate-500">
                {strategy.description ?? "설명이 아직 없습니다."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right text-sm text-slate-600">
              <div>v{strategy.latestVersionNumber ?? 0}</div>
              <div>{strategy.universeCount} universes</div>
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}

