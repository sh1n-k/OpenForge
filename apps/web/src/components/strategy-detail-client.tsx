"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  archiveStrategy,
  cloneStrategy,
  replaceStrategyUniverses,
  updateStrategyExecution,
  type StrategyDetail,
  type StrategyExecutionResponse,
  type StrategyExecutionRun,
  type StrategySignalEvent,
  type StrategyVersion,
  type UniverseSummary,
} from "@/lib/api";

type StrategyDetailClientProps = {
  strategy: StrategyDetail;
  versions: StrategyVersion[];
  universes: UniverseSummary[];
  execution: StrategyExecutionResponse;
  runs: StrategyExecutionRun[];
  signals: StrategySignalEvent[];
};

export function StrategyDetailClient({
  strategy,
  versions,
  universes,
  execution,
  runs,
  signals,
}: StrategyDetailClientProps) {
  const router = useRouter();
  const [selectedUniverseIds, setSelectedUniverseIds] = useState<string[]>(
    strategy.universes.map((universe) => universe.id),
  );
  const [enabled, setEnabled] = useState(execution.enabled);
  const [scheduleTime, setScheduleTime] = useState(execution.scheduleTime);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedUniverseIds(strategy.universes.map((universe) => universe.id));
  }, [strategy.universes]);

  useEffect(() => {
    setEnabled(execution.enabled);
    setScheduleTime(execution.scheduleTime);
  }, [execution.enabled, execution.scheduleTime]);

  async function handleExecutionSave() {
    try {
      setError(null);
      setIsSaving(true);
      await updateStrategyExecution(strategy.id, {
        enabled,
        scheduleTime,
      });
      startTransition(() => router.refresh());
    } catch (executionError) {
      setError(
        executionError instanceof Error
          ? executionError.message
          : "자동 실행 설정 저장에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
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

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </section>
      ) : null}

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
            <div>
              <dt className="font-semibold text-slate-900">Current Status</dt>
              <dd>{strategy.status}</dd>
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-500">
                paper
              </p>
              <h2 className="text-2xl font-semibold text-slate-950">
                자동 실행 설정
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              {execution.mode}
            </span>
          </div>

          <div className="mt-4 grid gap-4">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <div>
                <p className="font-semibold text-slate-900">자동 실행 활성화</p>
                <p className="text-sm text-slate-500">
                  {enabled ? "대기 중인 스케줄을 다음 폴링에서 실행합니다." : "비활성 상태입니다."}
                </p>
              </div>
            </label>

            <label className="grid gap-2 text-sm text-slate-600">
              <span>실행 시각</span>
              <input
                type="time"
                value={scheduleTime}
                onChange={(event) => setScheduleTime(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              />
            </label>

            <dl className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              <div>
                <dt className="font-semibold text-slate-900">현재 상태</dt>
                <dd>{execution.strategyStatus}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Timezone</dt>
                <dd>{execution.timezone}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">다음 실행 예정</dt>
                <dd>{formatDateTime(execution.nextRunAt) ?? "대기 중"}</dd>
              </div>
            </dl>

            <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900">마지막 실행</h3>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  recent run
                </span>
              </div>
              {execution.lastRun ? (
                <dl className="mt-3 grid gap-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-semibold text-slate-900">Run</dt>
                    <dd>{shortId(execution.lastRun.runId)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-semibold text-slate-900">Status</dt>
                    <dd>{execution.lastRun.status}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-semibold text-slate-900">Scheduled</dt>
                    <dd>{execution.lastRun.scheduledDate}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-semibold text-slate-900">Signals</dt>
                    <dd>{execution.lastRun.signalCount}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-semibold text-slate-900">Started</dt>
                    <dd>{formatDateTime(execution.lastRun.startedAt) ?? "대기 중"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-semibold text-slate-900">Completed</dt>
                    <dd>{formatDateTime(execution.lastRun.completedAt) ?? "대기 중"}</dd>
                  </div>
                  {execution.lastRun.errorMessage ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                      {execution.lastRun.errorMessage}
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="mt-3 text-sm text-slate-500">아직 실행 기록이 없습니다.</p>
              )}
            </section>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExecutionSave}
                disabled={isSaving}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "저장 중..." : "자동 실행 저장"}
              </button>
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

      <section className="grid gap-6 md:grid-cols-2">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-950">최근 실행 로그</h2>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
              execution runs
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {runs.length === 0 ? (
              <p className="text-sm text-slate-500">
                아직 실행 로그가 없습니다.
              </p>
            ) : (
              runs.map((run) => (
                <article
                  key={run.runId}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {shortId(run.runId)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {run.triggerType} / {run.scheduledDate} / v
                        {shortId(run.strategyVersionId)}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {run.status}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-semibold text-slate-900">Symbols</dt>
                      <dd>{run.symbolCount}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-semibold text-slate-900">Signals</dt>
                      <dd>{run.signalCount}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-semibold text-slate-900">Started</dt>
                      <dd>{formatDateTime(run.startedAt) ?? "대기 중"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-semibold text-slate-900">Completed</dt>
                      <dd>{formatDateTime(run.completedAt) ?? "대기 중"}</dd>
                    </div>
                  </dl>
                  {run.errorMessage ? (
                    <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {run.errorMessage}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-950">최근 시그널 이력</h2>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
              signal events
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {signals.length === 0 ? (
              <p className="text-sm text-slate-500">
                아직 시그널 이력이 없습니다.
              </p>
            ) : (
              signals.map((signal) => (
                <article
                  key={signal.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {signal.symbol} / {signal.signalType}
                      </p>
                      <p className="text-sm text-slate-500">
                        {signal.tradingDate} / v{shortId(signal.strategyVersionId)}
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {formatDateTime(signal.createdAt)}
                    </span>
                  </div>
                  <p className="mt-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs text-slate-600 break-all">
                    {JSON.stringify(signal.payload)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
