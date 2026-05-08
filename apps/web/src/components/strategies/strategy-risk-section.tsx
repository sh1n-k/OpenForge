"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  updateStrategyRisk,
  type StrategyRiskConfig,
  type StrategyRiskEvent,
} from "@/lib/api";
import { formatDateTime, shortId } from "@/lib/format";

type Props = {
  strategyId: string;
  riskConfig: StrategyRiskConfig;
  riskEvents: StrategyRiskEvent[];
};

function stringifyNullable(value: number | null) {
  return value === null ? "" : String(value);
}

function parseNullableNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableInteger(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export function StrategyRiskSection({ strategyId, riskConfig, riskEvents }: Props) {
  const router = useRouter();
  const [isSavingRisk, setIsSavingRisk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskDraft, setRiskDraft] = useState({
    perSymbolMaxNotional: stringifyNullable(riskConfig.perSymbolMaxNotional),
    strategyMaxExposure: stringifyNullable(riskConfig.strategyMaxExposure),
    maxOpenPositions: stringifyNullable(riskConfig.maxOpenPositions),
    dailyLossLimit: stringifyNullable(riskConfig.dailyLossLimit),
    strategyKillSwitchEnabled: riskConfig.strategyKillSwitchEnabled,
  });

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

  async function handleSaveRisk() {
    try {
      setError(null);
      setIsSavingRisk(true);
      await updateStrategyRisk(strategyId, {
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

  return (
    <div className="grid gap-6">
      <section
        id="strategy-risk"
        className="p-6 md:p-8 border border-warning/30 rounded-2xl bg-warning-soft/10 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="grid gap-1.5">
            <p className="m-0 text-warning font-bold tracking-wider uppercase text-xs mb-1">
              risk
            </p>
            <h2 className="m-0 font-sans text-xl font-bold text-foreground">
              리스크 설정
            </h2>
            <p className="m-0 text-muted text-[0.9375rem]">
              비어있으면 해당 제한이 적용되지 않습니다. 전략별 킬 스위치만 바로 전환할 수 있습니다.
            </p>
          </div>
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-surface text-muted border border-border">
            {riskConfig.mode}
          </span>
        </div>

        {error ? (
          <div className="p-4 rounded-xl bg-error-soft text-error border border-error/20 mb-6 text-[0.9375rem] font-medium flex items-start gap-2">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="grid gap-1.5 focus-within:text-primary">
              <span className="text-subtle text-sm font-medium transition-colors">종목당 투자 한도</span>
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
                className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
              />
            </label>
            <label className="grid gap-1.5 focus-within:text-primary">
              <span className="text-subtle text-sm font-medium transition-colors">전략당 최대 노출</span>
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
                className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
              />
            </label>
            <label className="grid gap-1.5 focus-within:text-primary">
              <span className="text-subtle text-sm font-medium transition-colors">동시 보유 수 제한</span>
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
                className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
              />
            </label>
            <label className="grid gap-1.5 focus-within:text-primary">
              <span className="text-subtle text-sm font-medium transition-colors">일일 손실 한도</span>
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
                className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
              />
            </label>
          </div>
          
          <label className="flex items-center gap-4 mt-2 p-4 border border-border-soft rounded-xl bg-surface hover:shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-primary cursor-pointer w-full md:w-3/4">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-error focus:ring-error accent-error"
              checked={riskDraft.strategyKillSwitchEnabled}
              onChange={(event) =>
                setRiskDraft((current) => ({
                  ...current,
                  strategyKillSwitchEnabled: event.target.checked,
                }))
              }
            />
            <div className="grid gap-1">
              <p className={`m-0 font-semibold text-[0.9375rem] ${riskDraft.strategyKillSwitchEnabled ? 'text-error' : 'text-foreground'}`}>전략 킬 스위치</p>
              <p className="m-0 text-muted text-sm">
                {riskDraft.strategyKillSwitchEnabled ? "주문 차단 중" : "주문 허용"}
              </p>
            </div>
          </label>
          
          <div className="flex flex-wrap items-center gap-4 pt-6 mt-2 border-t border-border-soft">
            <button
              type="button"
              onClick={handleSaveRisk}
              disabled={isSavingRisk}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {isSavingRisk ? "저장 중..." : "리스크 저장"}
            </button>
            <span className="text-subtle text-sm">
              마지막 업데이트: {formatDateTime(riskConfig.updatedAt) ?? "없음"}
            </span>
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm">
        <div className="mb-6 pb-4 border-b border-border/60">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">최근 리스크 이벤트</h2>
        </div>
        <div className="grid gap-3">
          {riskEvents.length === 0 ? (
            <p className="m-0 text-muted text-[0.9375rem]">최근 리스크 이벤트가 없습니다.</p>
          ) : (
            riskEvents.map((event) => (
              <article
                key={event.id}
                className="p-5 border border-border-soft rounded-xl bg-[#fafafa]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="grid gap-1.5">
                    <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">
                      {event.eventType} / {event.reasonCode}
                    </p>
                    <p className="m-0 text-foreground font-medium text-[0.9375rem]">
                      {event.scope}
                      {event.orderRequestId ? ` / order ${shortId(event.orderRequestId)}` : ""}
                    </p>
                  </div>
                  <span className="text-muted text-[0.8125rem]">
                    {formatDateTime(event.occurredAt)}
                  </span>
                </div>
                <p className="m-0 mt-3 text-muted text-[0.9375rem]">{event.message}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
