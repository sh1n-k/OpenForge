"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  replaceStrategyUniverses,
  type StrategyDetail,
  type StrategyVersion,
  type UniverseMarketScope,
  type UniverseSummary,
} from "@/lib/api";

const marketScopeLabel: Record<UniverseMarketScope, string> = {
  domestic: "국내",
  us: "미국",
};

type Props = {
  strategy: StrategyDetail;
  versions: StrategyVersion[];
  universes: UniverseSummary[];
};

export function StrategyVersionsSection({ strategy, versions, universes }: Props) {
  const router = useRouter();
  const [selectedUniverseIds, setSelectedUniverseIds] = useState<string[]>(
    strategy.universes.map((universe) => universe.id),
  );
  const [error, setError] = useState<string | null>(null);

  async function handleReplaceUniverses() {
    try {
      setError(null);
      await replaceStrategyUniverses(strategy.id, selectedUniverseIds);
      startTransition(() => router.refresh());
    } catch (universeError) {
      setError(
        universeError instanceof Error
          ? universeError.message
          : "유니버스 연결 저장에 실패했습니다.",
      );
    }
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      <section
        id="strategy-versions"
        className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-border/60">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">버전</h2>
          <Link
            href={`/strategies/${strategy.id}/edit`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg bg-surface border border-border text-foreground hover:bg-[#fafafa] hover:border-gray-300 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border"
          >
            새 버전 만들기
          </Link>
        </div>
        <div className="grid gap-3">
          {versions.map((version) => (
            <article
              key={version.id}
              className="p-5 border border-border-soft rounded-xl bg-[#fafafa]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4 pb-3 border-b border-border/60">
                <h3 className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">
                  Version {version.versionNumber}
                </h3>
                <span className="text-muted text-[0.8125rem]">
                  {version.validationStatus}
                </span>
              </div>
              <p className="m-0 text-muted text-[0.9375rem] leading-relaxed">
                {version.changeSummary ?? "변경 메모 없음"}
              </p>
              {version.validationErrors.length > 0 ? (
                <p className="m-0 mt-3 text-[0.9375rem] font-medium text-error flex items-start gap-2">
                  {version.validationErrors[0].message}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-border/60">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">연결된 유니버스</h2>
          {strategy.universes.some((universe) => universe.marketScope === "us") ? (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-warning-soft text-warning border border-warning/20">미국 포함</span>
          ) : null}
        </div>

        {error ? (
          <div className="p-4 rounded-xl bg-error-soft text-error border border-error/20 mb-6 text-[0.9375rem] font-medium flex items-start gap-2">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 mb-6">
          {universes.length === 0 ? (
            <p className="m-0 text-muted text-[0.9375rem]">
              생성된 유니버스가 아직 없습니다.
            </p>
          ) : (
            universes.map((universe) => (
              <label
                key={universe.id}
                className="flex items-center gap-4 p-4 border border-border-soft rounded-xl bg-surface hover:shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-primary cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                  checked={selectedUniverseIds.includes(universe.id)}
                  onChange={(event) => {
                    setSelectedUniverseIds((current) =>
                      event.target.checked
                        ? [...current, universe.id]
                        : current.filter((id) => id !== universe.id),
                    );
                  }}
                />
                <span className="text-foreground font-medium text-[0.9375rem] flex-1">{universe.name}</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-info-soft text-info border border-info/20">
                  {marketScopeLabel[universe.marketScope]}
                </span>
              </label>
            ))
          )}
        </div>
        <button
          type="button"
          onClick={handleReplaceUniverses}
          className="inline-flex items-center justify-center gap-2 px-5 py-2 w-full sm:w-auto font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          유니버스 연결 저장
        </button>
      </section>
    </section>
  );
}
