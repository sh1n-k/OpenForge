"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  updateStrategyExecution,
  type StrategyExecutionMode,
  type StrategyExecutionResponse,
} from "@/lib/api";
import { formatDateTime, shortId } from "@/lib/format";

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
      className="doc-panel"
    >
      <div className="flex-between">
        <div>
          <p className="detail-eyebrow text-success">
            paper
          </p>
          <h2 className="detail-heading">
            자동 실행 설정
          </h2>
        </div>
        <span className="detail-badge">
          {execution.mode}
        </span>
      </div>

      {hasOverseasUniverses ? (
        <div className="doc-panel doc-panel-warn" style={{ marginTop: 12 }}>
          미국 유니버스가 연결되어 있습니다. 현재 실행 경로는 국내 시장 기준이므로 `enabled=true` 저장이 실패할 수 있습니다.
        </div>
      ) : null}

      {error ? (
        <div className="doc-panel doc-panel-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      ) : null}

      <div className="grid-section" style={{ marginTop: 16 }}>
        <label className="list-card flex-center">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <div>
            <p className="detail-label">자동 실행 활성화</p>
            <p className="detail-value">
              {enabled ? "대기 중인 스케줄을 다음 폴링에서 실행합니다." : "비활성 상태입니다."}
            </p>
          </div>
        </label>

        <label className="form-field">
          <span className="form-label">실행 모드</span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as StrategyExecutionMode)}
          >
            <option value="paper">paper</option>
          </select>
        </label>

        <label className="form-field">
          <span className="form-label">실행 시각</span>
          <input
            type="time"
            value={scheduleTime}
            onChange={(event) => setScheduleTime(event.target.value)}
          />
        </label>

        <label className="form-field">
          <span className="form-label">시간대</span>
          <input
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            placeholder="예: Asia/Seoul"
          />
        </label>

        <div className="detail-card">
          <div className="stack-list">
            <div className="detail-row">
              <span className="detail-label">현재 상태</span>
              <span className="detail-value">{statusLabel[execution.strategyStatus] ?? execution.strategyStatus}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">시간대</span>
              <span className="detail-value">{execution.timezone}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">다음 실행 예정</span>
              <span className="detail-value">{formatDateTime(execution.nextRunAt) ?? "대기 중"}</span>
            </div>
          </div>
        </div>

        <section className="detail-card">
          <div className="detail-card-header">
            <h3 className="detail-label">마지막 실행</h3>
          </div>
          {execution.lastRun ? (
            <div className="stack-list" style={{ marginTop: 12 }}>
              <div className="detail-row">
                <span className="detail-label">실행 ID</span>
                <span className="detail-value">{shortId(execution.lastRun.runId)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">상태</span>
                <span className="detail-value">{execution.lastRun.status}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">예정일</span>
                <span className="detail-value">{execution.lastRun.scheduledDate}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">시그널 수</span>
                <span className="detail-value">{execution.lastRun.signalCount}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">시작</span>
                <span className="detail-value">{formatDateTime(execution.lastRun.startedAt) ?? "대기 중"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">완료</span>
                <span className="detail-value">{formatDateTime(execution.lastRun.completedAt) ?? "대기 중"}</span>
              </div>
              {execution.lastRun.errorMessage ? (
                <div className="doc-panel doc-panel-error">
                  <p className="inline-error">{execution.lastRun.errorMessage}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="section-copy">아직 실행 기록이 없습니다.</p>
          )}
        </section>

        <div className="page-actions">
          <button
            type="button"
            onClick={handleExecutionSave}
            disabled={isSaving}
            className="button-primary"
          >
            {isSaving ? "저장 중..." : "자동 실행 저장"}
          </button>
        </div>
      </div>
    </section>
  );
}
