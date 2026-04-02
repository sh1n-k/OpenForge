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
    <>
      <section
        id="strategy-risk"
        className="doc-panel doc-panel-warn"
      >
        <div className="flex-between">
          <div>
            <p className="detail-eyebrow text-warning">
              risk
            </p>
            <h2 className="detail-heading">
              리스크 설정
            </h2>
            <p className="section-copy">
              비어있으면 해당 제한이 적용되지 않습니다. 전략별 킬 스위치만 바로 전환할 수 있습니다.
            </p>
          </div>
          <span className="detail-badge">
            {riskConfig.mode}
          </span>
        </div>

        {error ? (
          <div className="doc-panel doc-panel-error" style={{ marginTop: 12 }}>
            {error}
          </div>
        ) : null}

        <div className="grid-section" style={{ marginTop: 16 }}>
          <label className="form-field">
            <span className="form-label">종목당 투자 한도</span>
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
            />
          </label>
          <label className="form-field">
            <span className="form-label">전략당 최대 노출</span>
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
            />
          </label>
          <label className="form-field">
            <span className="form-label">동시 보유 수 제한</span>
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
            />
          </label>
          <label className="form-field">
            <span className="form-label">일일 손실 한도</span>
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
            />
          </label>
          <label className="list-card flex-center">
            <input
              type="checkbox"
              checked={riskDraft.strategyKillSwitchEnabled}
              onChange={(event) =>
                setRiskDraft((current) => ({
                  ...current,
                  strategyKillSwitchEnabled: event.target.checked,
                }))
              }
            />
            <div>
              <p className="detail-label">전략 킬 스위치</p>
              <p className="detail-value">
                {riskDraft.strategyKillSwitchEnabled ? "주문 차단 중" : "주문 허용"}
              </p>
            </div>
          </label>
          <div className="flex-center">
            <button
              type="button"
              onClick={handleSaveRisk}
              disabled={isSavingRisk}
              className="button-primary"
            >
              {isSavingRisk ? "저장 중..." : "리스크 저장"}
            </button>
            <span className="detail-value">
              {formatDateTime(riskConfig.updatedAt) ?? "업데이트 없음"}
            </span>
          </div>
        </div>
      </section>

      <section className="doc-panel">
        <div className="detail-card-header">
          <h2 className="detail-heading">최근 리스크 이벤트</h2>
        </div>
        <div className="stack-list" style={{ marginTop: 16 }}>
          {riskEvents.length === 0 ? (
            <p className="section-copy">최근 리스크 이벤트가 없습니다.</p>
          ) : (
            riskEvents.map((event) => (
              <article
                key={event.id}
                className="detail-card"
              >
                <div className="flex-between">
                  <div>
                    <p className="detail-label">
                      {event.eventType} / {event.reasonCode}
                    </p>
                    <p className="detail-value">
                      {event.scope}
                      {event.orderRequestId ? ` / order ${shortId(event.orderRequestId)}` : ""}
                    </p>
                  </div>
                  <span className="detail-timestamp">
                    {formatDateTime(event.occurredAt)}
                  </span>
                </div>
                <p className="section-copy">{event.message}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}
