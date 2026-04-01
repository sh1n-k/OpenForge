"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  archiveStrategy,
  cloneStrategy,
  createOrderFill,
  createOrderRequest,
  replaceStrategyUniverses,
  updateStrategyExecution,
  updateStrategyRisk,
  type StrategyDetail,
  type StrategyExecutionResponse,
  type OrderCandidate,
  type OrderFill,
  type OrderRequest,
  type OrderStatusEvent,
  type StrategyRiskConfig,
  type StrategyRiskEvent,
  type StrategyExecutionRun,
  type StrategySignalEvent,
  type StrategyPosition,
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
  orderCandidates: OrderCandidate[];
  orderRequests: OrderRequest[];
  riskConfig: StrategyRiskConfig;
  riskEvents: StrategyRiskEvent[];
  fills: OrderFill[];
  positions: StrategyPosition[];
  statusEventsByRequestId: Record<string, OrderStatusEvent[]>;
};

export function StrategyDetailClient({
  strategy,
  versions,
  universes,
  execution,
  runs,
  signals,
  orderCandidates,
  orderRequests,
  riskConfig,
  riskEvents,
  fills,
  positions,
  statusEventsByRequestId,
}: StrategyDetailClientProps) {
  const router = useRouter();
  const [selectedUniverseIds, setSelectedUniverseIds] = useState<string[]>(
    strategy.universes.map((universe) => universe.id),
  );
  const [enabled, setEnabled] = useState(execution.enabled);
  const [scheduleTime, setScheduleTime] = useState(execution.scheduleTime);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRisk, setIsSavingRisk] = useState(false);
  const [pendingOrderSignalId, setPendingOrderSignalId] = useState<string | null>(null);
  const [pendingFillRequestId, setPendingFillRequestId] = useState<string | null>(null);
  const [riskDraft, setRiskDraft] = useState({
    perSymbolMaxNotional: stringifyNullable(riskConfig.perSymbolMaxNotional),
    strategyMaxExposure: stringifyNullable(riskConfig.strategyMaxExposure),
    maxOpenPositions: stringifyNullable(riskConfig.maxOpenPositions),
    dailyLossLimit: stringifyNullable(riskConfig.dailyLossLimit),
    strategyKillSwitchEnabled: riskConfig.strategyKillSwitchEnabled,
  });
  const [fillDrafts, setFillDrafts] = useState<
    Record<string, { quantity: string; price: string }>
  >({});

  useEffect(() => {
    setSelectedUniverseIds(strategy.universes.map((universe) => universe.id));
  }, [strategy.universes]);

  useEffect(() => {
    setEnabled(execution.enabled);
    setScheduleTime(execution.scheduleTime);
  }, [execution.enabled, execution.scheduleTime]);

  useEffect(() => {
    setRiskDraft({
      perSymbolMaxNotional: stringifyNullable(riskConfig.perSymbolMaxNotional),
      strategyMaxExposure: stringifyNullable(riskConfig.strategyMaxExposure),
      maxOpenPositions: stringifyNullable(riskConfig.maxOpenPositions),
      dailyLossLimit: stringifyNullable(riskConfig.dailyLossLimit),
      strategyKillSwitchEnabled: riskConfig.strategyKillSwitchEnabled,
    });
  }, [
    riskConfig.dailyLossLimit,
    riskConfig.maxOpenPositions,
    riskConfig.perSymbolMaxNotional,
    riskConfig.strategyKillSwitchEnabled,
    riskConfig.strategyMaxExposure,
  ]);

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

  async function handleSaveRisk() {
    try {
      setError(null);
      setIsSavingRisk(true);
      await updateStrategyRisk(strategy.id, {
        perSymbolMaxNotional: parseNullableNumber(riskDraft.perSymbolMaxNotional),
        strategyMaxExposure: parseNullableNumber(riskDraft.strategyMaxExposure),
        maxOpenPositions: parseNullableInteger(riskDraft.maxOpenPositions),
        dailyLossLimit: parseNullableNumber(riskDraft.dailyLossLimit),
        strategyKillSwitchEnabled: riskDraft.strategyKillSwitchEnabled,
      });
      startTransition(() => router.refresh());
    } catch (riskError) {
      setError(
        riskError instanceof Error ? riskError.message : "리스크 설정 저장에 실패했습니다.",
      );
    } finally {
      setIsSavingRisk(false);
    }
  }

  async function handleCreateOrder(signalEventId: string) {
    try {
      setError(null);
      setPendingOrderSignalId(signalEventId);
      await createOrderRequest(strategy.id, {
        signalEventId,
        mode: "paper",
      });
      startTransition(() => router.refresh());
    } catch (orderError) {
      setError(
        orderError instanceof Error
          ? orderError.message
          : "주문 요청 생성에 실패했습니다.",
      );
    } finally {
      setPendingOrderSignalId(null);
    }
  }

  async function handleCreateFill(orderRequestId: string) {
    const draft = fillDrafts[orderRequestId] ?? {
      quantity: "1",
      price: "0",
    };
    const quantity = Number(draft.quantity);
    const price = Number(draft.price);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("체결 수량은 0보다 커야 합니다.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("체결 가격은 0보다 커야 합니다.");
      return;
    }

    try {
      setError(null);
      setPendingFillRequestId(orderRequestId);
      await createOrderFill(strategy.id, orderRequestId, {
        quantity,
        price,
        filledAt: new Date().toISOString(),
      });
      startTransition(() => router.refresh());
    } catch (fillError) {
      setError(
        fillError instanceof Error ? fillError.message : "체결 등록에 실패했습니다.",
      );
    } finally {
      setPendingFillRequestId(null);
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

      <section className="grid gap-6 md:grid-cols-2">
        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                risk
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                리스크 설정
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                null 값은 비활성입니다. 전략별 킬 스위치만 바로 전환할 수 있습니다.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              {riskConfig.mode}
            </span>
          </div>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-700">
              <span>종목당 투자 한도</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={riskDraft.perSymbolMaxNotional}
                onChange={(event) =>
                  setRiskDraft((current) => ({
                    ...current,
                    perSymbolMaxNotional: event.target.value,
                  }))
                }
                className="rounded-2xl border border-amber-200 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              <span>전략당 최대 노출</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={riskDraft.strategyMaxExposure}
                onChange={(event) =>
                  setRiskDraft((current) => ({
                    ...current,
                    strategyMaxExposure: event.target.value,
                  }))
                }
                className="rounded-2xl border border-amber-200 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              <span>동시 보유 수 제한</span>
              <input
                type="number"
                min="0"
                step="1"
                value={riskDraft.maxOpenPositions}
                onChange={(event) =>
                  setRiskDraft((current) => ({
                    ...current,
                    maxOpenPositions: event.target.value,
                  }))
                }
                className="rounded-2xl border border-amber-200 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              <span>일일 손실 한도</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={riskDraft.dailyLossLimit}
                onChange={(event) =>
                  setRiskDraft((current) => ({
                    ...current,
                    dailyLossLimit: event.target.value,
                  }))
                }
                className="rounded-2xl border border-amber-200 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={riskDraft.strategyKillSwitchEnabled}
                onChange={(event) =>
                  setRiskDraft((current) => ({
                    ...current,
                    strategyKillSwitchEnabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <div>
                <p className="font-semibold text-slate-900">전략 킬 스위치</p>
                <p className="text-sm text-slate-500">
                  {riskDraft.strategyKillSwitchEnabled ? "주문 차단 중" : "주문 허용"}
                </p>
              </div>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveRisk}
                disabled={isSavingRisk}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingRisk ? "저장 중..." : "리스크 저장"}
              </button>
              <span className="text-sm text-slate-600">
                updated {formatDateTime(riskConfig.updatedAt) ?? "unknown"}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-950">최근 리스크 이벤트</h2>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
              risk events
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {riskEvents.length === 0 ? (
              <p className="text-sm text-slate-500">최근 리스크 이벤트가 없습니다.</p>
            ) : (
              riskEvents.map((event) => (
                <article
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {event.eventType} / {event.reasonCode}
                      </p>
                      <p className="text-sm text-slate-500">
                        {event.scope}
                        {event.orderRequestId ? ` / order ${shortId(event.orderRequestId)}` : ""}
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {formatDateTime(event.occurredAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{event.message}</p>
                </article>
              ))
            )}
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
            <h2 className="text-2xl font-semibold text-slate-950">주문 후보</h2>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
              order candidates
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {orderCandidates.length === 0 ? (
              <p className="text-sm text-slate-500">주문 후보가 아직 없습니다.</p>
            ) : (
              orderCandidates.map((candidate) => {
                const canCreate =
                  candidate.mode === "paper" &&
                  candidate.precheck.passed &&
                  candidate.riskCheck.passed &&
                  !candidate.alreadyRequested;
                return (
                  <article
                    key={candidate.signalEventId}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {candidate.symbol} / {candidate.side}
                        </p>
                        <p className="text-sm text-slate-500">
                          {candidate.tradingDate} / {candidate.mode} / qty {candidate.quantity} / price {candidate.price}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {candidate.precheck.passed ? "precheck ok" : "precheck fail"}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm text-slate-600">
                      <PrecheckRow label="marketHours" value={candidate.precheck.marketHours} />
                      <PrecheckRow label="strategyStatus" value={candidate.precheck.strategyStatus} />
                      <PrecheckRow label="duplicateOrder" value={candidate.precheck.duplicateOrder} />
                      <PrecheckRow label="quantityValid" value={candidate.precheck.quantityValid} />
                      <PrecheckRow label="priceValid" value={candidate.precheck.priceValid} />
                      <PrecheckRow label="riskPassed" value={candidate.riskCheck.passed} />
                      <div>
                        <dt className="font-semibold text-slate-900">이미 요청됨</dt>
                        <dd>{candidate.alreadyRequested ? "yes" : "no"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-900">riskCheck</dt>
                        <dd>
                          {candidate.riskCheck.reasonCodes.length > 0
                            ? candidate.riskCheck.reasonCodes.join(", ")
                            : "ok"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-900">projectedSymbolExposure</dt>
                        <dd>{formatNullableNumber(candidate.riskCheck.projectedSymbolExposure)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-900">projectedStrategyExposure</dt>
                        <dd>{formatNullableNumber(candidate.riskCheck.projectedStrategyExposure)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-900">projectedOpenPositions</dt>
                        <dd>{candidate.riskCheck.projectedOpenPositions}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-900">currentDailyRealizedLoss</dt>
                        <dd>{candidate.riskCheck.currentDailyRealizedLoss}</dd>
                      </div>
                    </dl>
                    {candidate.precheck.reasonCodes.length > 0 ? (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        {candidate.precheck.reasonCodes.join(", ")}
                      </p>
                    ) : null}
                    {!candidate.riskCheck.passed ? (
                      <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        {candidate.riskCheck.reasonCodes.join(", ")}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={!canCreate || pendingOrderSignalId === candidate.signalEventId}
                        onClick={async () => handleCreateOrder(candidate.signalEventId)}
                        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pendingOrderSignalId === candidate.signalEventId
                          ? "생성 중..."
                          : "paper 주문 생성"}
                      </button>
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        {candidate.alreadyRequested ? "already requested" : "ready"}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-950">주문 요청 이력</h2>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
              order requests
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {orderRequests.length === 0 ? (
              <p className="text-sm text-slate-500">주문 요청이 아직 없습니다.</p>
            ) : (
              orderRequests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {request.symbol} / {request.side}
                      </p>
                      <p className="text-sm text-slate-500">
                        {request.mode} / current {request.currentStatus} / filled{" "}
                        {request.filledQuantity} / {request.quantity} / remaining{" "}
                        {request.remainingQuantity}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {request.status}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm text-slate-600">
                    <div>
                      <dt className="font-semibold text-slate-900">Requested</dt>
                      <dd>{formatDateTime(request.requestedAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Precheck</dt>
                      <dd>{request.precheckPassed ? "passed" : "failed"}</dd>
                    </div>
                  </dl>
                  {request.failureReason ? (
                    <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {request.failureReason}
                    </p>
                  ) : null}
                  <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">주문 상태 이력</h3>
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        {statusEventsByRequestId[request.id]?.length ?? 0} events
                      </span>
                    </div>
                    {statusEventsByRequestId[request.id]?.length ? (
                      <div className="mt-3 grid gap-2">
                        {statusEventsByRequestId[request.id].map((event) => (
                          <article
                            key={event.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-600"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <strong className="text-slate-900">{event.status}</strong>
                              <span className="text-xs text-slate-400">
                                {formatDateTime(event.occurredAt)}
                              </span>
                            </div>
                            <p className="mt-1">
                              {event.reason ?? "reason 없음"}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        상태 이력이 아직 없습니다.
                      </p>
                    )}
                  </section>

                  <form
                    className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      await handleCreateFill(request.id);
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">수동 체결 등록</h3>
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        paper manual
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>체결 수량</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            fillDrafts[request.id]?.quantity ??
                            String(Math.max(request.remainingQuantity, 1))
                          }
                          onChange={(event) =>
                            setFillDrafts((current) => ({
                              ...current,
                              [request.id]: {
                                quantity: event.target.value,
                                price:
                                  current[request.id]?.price ??
                                  String(request.price),
                              },
                            }))
                          }
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>체결 가격</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            fillDrafts[request.id]?.price ?? String(request.price)
                          }
                          onChange={(event) =>
                            setFillDrafts((current) => ({
                              ...current,
                              [request.id]: {
                                quantity:
                                  current[request.id]?.quantity ??
                                  String(Math.max(request.remainingQuantity, 1)),
                                price: event.target.value,
                              },
                            }))
                          }
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        disabled={
                          pendingFillRequestId === request.id ||
                          request.remainingQuantity <= 0
                        }
                        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pendingFillRequestId === request.id
                          ? "등록 중..."
                          : request.remainingQuantity <= 0
                            ? "체결 완료"
                            : "체결 등록"}
                      </button>
                      <p className="text-xs text-slate-500">
                        filledAt는 현재 시각으로 자동 저장됩니다.
                      </p>
                    </div>
                  </form>
                </article>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-950">체결 이력</h2>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
              fills
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {fills.length === 0 ? (
              <p className="text-sm text-slate-500">체결 이력이 아직 없습니다.</p>
            ) : (
              fills.map((fill) => (
                <article
                  key={fill.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {fill.symbol} / {fill.side}
                      </p>
                      <p className="text-sm text-slate-500">
                        qty {fill.quantity} / price {fill.price} / {fill.source}
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {formatDateTime(fill.filledAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    order {shortId(fill.orderRequestId)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-950">현재 포지션</h2>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
              positions
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {positions.length === 0 ? (
              <p className="text-sm text-slate-500">현재 포지션이 없습니다.</p>
            ) : (
              positions.map((position) => (
                <article
                  key={position.symbol}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{position.symbol}</p>
                      <p className="text-sm text-slate-500">
                        net {position.netQuantity} / avg {position.avgEntryPrice}
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {formatDateTime(position.lastFillAt)}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
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

function PrecheckRow({
  label,
  value,
}: {
  label: string;
  value: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-semibold text-slate-900">{label}</dt>
      <dd>{value ? "true" : "false"}</dd>
    </div>
  );
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

function stringifyNullable(value: number | null) {
  return value === null ? "" : String(value);
}

function parseNullableNumber(value: string) {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableInteger(value: string) {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function formatNullableNumber(value: number | null) {
  return value === null ? "null" : value.toLocaleString("ko-KR");
}
