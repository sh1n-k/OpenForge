"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  updateStrategyExecution,
  type StrategyExecutionMode,
  type StrategyExecutionResponse,
} from "@/lib/api";
import { formatDateTime, shortId } from "@/lib/format";
import { LIVE_EXECUTION_ENABLED } from "@/lib/features";

const statusLabel: Record<string, string> = {
  running: "실행 중",
  stopped: "중지",
  draft: "초안",
  backtest_completed: "백테스트 완료",
};

type Props = {
  strategyId: string;
  execution: StrategyExecutionResponse;
  hasOverseasUniverses: boolean;
};

export function StrategyExecutionSection({ strategyId, execution, hasOverseasUniverses }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(execution.enabled);
  const [mode, setMode] = useState<StrategyExecutionMode>(execution.mode);
  const [scheduleTime, setScheduleTime] = useState(execution.scheduleTime);
  const [timezone, setTimezone] = useState(execution.timezone);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(execution.enabled);
    setMode(execution.mode);
    setScheduleTime(execution.scheduleTime);
    setTimezone(execution.timezone);
  }, [execution.enabled, execution.mode, execution.scheduleTime, execution.timezone]);

  async function handleExecutionSave() {
    try {
      setError(null);
      setIsSaving(true);
      await updateStrategyExecution(strategyId, {
        enabled,
        mode,
        scheduleTime,
        timezone,
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

  return (
    <section
      id="strategy-execution"
      className="flex flex-col p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm h-full"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="m-0 text-success font-bold tracking-wider uppercase text-xs mb-2">
            paper
          </p>
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">
            자동 실행 설정
          </h2>
        </div>
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-surface text-muted border border-border">
          {execution.mode}
        </span>
      </div>

      {hasOverseasUniverses ? (
        <div className="p-4 rounded-xl bg-warning-soft border border-warning/20 mb-6 text-warning font-medium text-[0.9375rem] flex items-start gap-2">
          미국 유니버스가 연결되어 있습니다. 현재 실행 경로는 국내 시장 기준이므로 `enabled=true` 저장이 실패할 수 있습니다.
        </div>
      ) : null}

      {error ? (
        <div className="p-4 rounded-xl bg-error-soft border border-error/20 mb-6 text-error font-medium text-[0.9375rem] flex items-start gap-2">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 flex-1">
        <label className="flex items-center gap-4 p-4 border border-border-soft rounded-xl bg-surface hover:shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-primary cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <div className="grid gap-1">
            <p className="m-0 text-foreground font-semibold text-[0.9375rem]">자동 실행 활성화</p>
            <p className="m-0 text-muted text-sm">
              {enabled ? "대기 중인 스케줄을 다음 폴링에서 실행합니다." : "비활성 상태입니다."}
            </p>
          </div>
        </label>

        <label className="grid gap-1.5 focus-within:text-primary">
          <span className="text-subtle text-sm font-medium transition-colors">실행 모드</span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as StrategyExecutionMode)}
            className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%221.5%22%20stroke%3D%22%2371717a%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M8.25%2015L12%2018.75%2015.75%2015m-7.5-6L12%205.25%2015.75%209%22%20%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[size:1.5em_1.5em] pr-10"
          >
            <option value="paper">paper</option>
            {LIVE_EXECUTION_ENABLED ? <option value="live">live</option> : null}
          </select>
        </label>

        <label className="grid gap-1.5 focus-within:text-primary">
          <span className="text-subtle text-sm font-medium transition-colors">실행 시각</span>
          <input
            type="time"
            value={scheduleTime}
            onChange={(event) => setScheduleTime(event.target.value)}
            className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
          />
        </label>

        <label className="grid gap-1.5 focus-within:text-primary">
          <span className="text-subtle text-sm font-medium transition-colors">시간대</span>
          <input
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            placeholder="예: Asia/Seoul"
            className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
          />
        </label>

        <div className="p-5 border border-border-soft rounded-xl bg-[#fafafa]">
          <div className="grid gap-4">
            <div className="grid gap-1">
              <span className="text-subtle text-xs font-semibold tracking-wider uppercase">현재 상태</span>
              <span className="text-foreground font-medium text-[0.9375rem]">{statusLabel[execution.strategyStatus] ?? execution.strategyStatus}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-subtle text-xs font-semibold tracking-wider uppercase">시간대</span>
              <span className="text-foreground font-medium text-[0.9375rem]">{execution.timezone}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-subtle text-xs font-semibold tracking-wider uppercase">다음 실행 예정</span>
              <span className="text-foreground font-medium text-[0.9375rem] font-mono">{formatDateTime(execution.nextRunAt) ?? "대기 중"}</span>
            </div>
          </div>
        </div>

        <section className="p-5 border border-border-soft rounded-xl bg-[#fafafa]">
          <div className="mb-4 pb-3 border-b border-border/60">
            <h3 className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">마지막 실행</h3>
          </div>
          {execution.lastRun ? (
            <div className="grid gap-4">
              <div className="grid gap-1">
                <span className="text-subtle text-xs font-semibold tracking-wider uppercase">실행 ID</span>
                <span className="text-foreground font-medium text-[0.9375rem] font-mono">{shortId(execution.lastRun.runId)}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-subtle text-xs font-semibold tracking-wider uppercase">상태</span>
                <span className="text-foreground font-medium text-[0.9375rem]">{execution.lastRun.status}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-subtle text-xs font-semibold tracking-wider uppercase">예정일</span>
                <span className="text-foreground font-medium text-[0.9375rem] font-mono">{execution.lastRun.scheduledDate}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-subtle text-xs font-semibold tracking-wider uppercase">시그널 수</span>
                <span className="text-foreground font-medium text-[0.9375rem]">{execution.lastRun.signalCount}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-subtle text-xs font-semibold tracking-wider uppercase">시작</span>
                <span className="text-foreground font-medium text-[0.9375rem] font-mono">{formatDateTime(execution.lastRun.startedAt) ?? "대기 중"}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-subtle text-xs font-semibold tracking-wider uppercase">완료</span>
                <span className="text-foreground font-medium text-[0.9375rem] font-mono">{formatDateTime(execution.lastRun.completedAt) ?? "대기 중"}</span>
              </div>
              {execution.lastRun.errorMessage ? (
                <div className="p-4 rounded-xl bg-error-soft border border-error/20">
                  <p className="m-0 text-[0.9375rem] font-medium text-error flex items-start gap-2">{execution.lastRun.errorMessage}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="m-0 text-muted text-[0.9375rem]">아직 실행 기록이 없습니다.</p>
          )}
        </section>

        <div className="flex items-center gap-3 pt-6 mt-2 border-t border-border-soft">
          <button
            type="button"
            onClick={handleExecutionSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "자동 실행 저장"}
          </button>
        </div>
      </div>
    </section>
  );
}
