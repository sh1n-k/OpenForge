"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  archiveStrategy,
  cloneStrategy,
  replaceStrategyUniverses,
  type StrategyDetail,
  type StrategyStatus,
  type StrategyVersion,
  type UniverseSummary,
  updateStrategy,
} from "@/lib/api";

type StrategyDetailClientProps = {
  strategy: StrategyDetail;
  versions: StrategyVersion[];
  universes: UniverseSummary[];
};

export function StrategyDetailClient({
  strategy,
  versions,
  universes,
}: StrategyDetailClientProps) {
  const router = useRouter();
  const [selectedUniverseIds, setSelectedUniverseIds] = useState<string[]>(
    strategy.universes.map((universe) => universe.id),
  );
  const [status, setStatus] = useState<StrategyStatus>(strategy.status);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusSave() {
    try {
      setError(null);
      await updateStrategy(strategy.id, { status });
      startTransition(() => router.refresh());
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "상태 저장에 실패했습니다.",
      );
    }
  }

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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10">
      <section className="rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.3)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Strategy Detail
            </p>
            <h1 className="mt-2 text-4xl font-semibold">{strategy.name}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {strategy.strategyType} / {strategy.status} / latest v
              {strategy.latestVersionNumber ?? 0}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/strategies/${strategy.id}/backtest`}
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white"
            >
              Backtest
            </Link>
            <Link
              href={`/strategies/${strategy.id}/edit`}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950"
            >
              편집기 열기
            </Link>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
          latest validation: {strategy.latestValidationStatus ?? "unknown"}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-2xl font-semibold text-slate-950">Overview</h2>
          <dl className="mt-4 grid gap-3 text-sm text-slate-600">
            <div>
              <dt className="font-semibold text-slate-900">Description</dt>
              <dd>{strategy.description ?? "설명 없음"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Validation</dt>
              <dd>{strategy.latestValidationStatus ?? "unknown"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Version Count</dt>
              <dd>{strategy.versionCount}</dd>
            </div>
          </dl>
          {strategy.latestValidationErrors.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {strategy.latestValidationErrors.map((item, index) => (
                <p key={`${item.category}-${index}`}>
                  [{item.category}] {item.message}
                </p>
              ))}
            </div>
          ) : null}
          {strategy.latestValidationWarnings.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              {strategy.latestValidationWarnings.map((item, index) => (
                <p key={`${item.category}-${index}`}>
                  [{item.category}] {item.message}
                </p>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-2xl font-semibold text-slate-950">Actions</h2>
          <div className="mt-4 grid gap-3">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as StrategyStatus)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="draft">draft</option>
              <option value="backtest_completed">backtest_completed</option>
              <option value="running">running</option>
              <option value="stopped">stopped</option>
            </select>
            <button
              type="button"
              onClick={handleStatusSave}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              상태 저장
            </button>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={async () => {
                  await cloneStrategy(strategy.id);
                  startTransition(() => router.push("/strategies"));
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Clone
              </button>
              <button
                type="button"
                onClick={async () => {
                  await archiveStrategy(strategy.id);
                  startTransition(() => router.push("/strategies"));
                }}
                className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600"
              >
                Archive
              </button>
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        </section>
      </section>

      <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-950">Versions</h2>
            <Link
              href={`/strategies/${strategy.id}/edit`}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              새 버전 만들기
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {versions.map((version) => (
              <article
                key={version.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-900">
                    Version {version.versionNumber}
                  </h3>
                  <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    {version.validationStatus}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {version.changeSummary ?? "변경 메모 없음"}
                </p>
                {version.validationErrors.length > 0 ? (
                  <p className="mt-2 text-sm text-rose-600">
                    {version.validationErrors[0].message}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-2xl font-semibold text-slate-950">Linked Universes</h2>
          <div className="mt-4 grid gap-3">
            {universes.length === 0 ? (
              <p className="text-sm text-slate-500">
                생성된 유니버스가 아직 없습니다.
              </p>
            ) : (
              universes.map((universe) => (
                <label
                  key={universe.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedUniverseIds.includes(universe.id)}
                    onChange={(event) => {
                      setSelectedUniverseIds((current) =>
                        event.target.checked
                          ? [...current, universe.id]
                          : current.filter((id) => id !== universe.id),
                      );
                    }}
                  />
                  <span>{universe.name}</span>
                </label>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={handleReplaceUniverses}
            className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            유니버스 연결 저장
          </button>
        </section>
      </section>
    </main>
  );
}
