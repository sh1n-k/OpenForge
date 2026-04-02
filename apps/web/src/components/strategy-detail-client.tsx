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
import { formatDateTime, shortId } from "@/lib/format";

const statusLabel: Record<string, string> = {
  running: "실행 중",
  stopped: "중지",
  draft: "초안",
  backtest_completed: "백테스트 완료",
};

const statusChip: Record<string, string> = {
  running: "status-chip status-chip-success",
  stopped: "status-chip status-chip-warning",
  draft: "status-chip",
  backtest_completed: "status-chip status-chip-info",
};

const typeLabel: Record<string, string> = {
  builder: "빌더형",
  code: "코드형",
};

const precheckLabel: Record<string, string> = {
  marketHours: "장 운영 시간",
  strategyStatus: "전략 상태",
  duplicateOrder: "중복 주문",
  quantityValid: "수량 유효",
  priceValid: "가격 유효",
  riskPassed: "리스크 통과",
};

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
    <main className="page-shell docs-page-shell">
      <section
        id="strategy-overview"
        className="doc-panel"
      >
        <div className="page-intro-row">
          <div className="page-intro">
            <p className="page-eyebrow">전략 상세</p>
            <h1 className="page-title">{strategy.name}</h1>
            <p className="page-description">
              {typeLabel[strategy.strategyType] ?? strategy.strategyType} / {statusLabel[strategy.status] ?? strategy.status} / 최신 v
              {strategy.latestVersionNumber ?? 0}
            </p>
          </div>
          <span className={statusChip[strategy.latestValidationStatus ?? ""] ?? "status-chip status-chip-info"}>
            {strategy.latestValidationStatus ?? "미검증"}
          </span>
        </div>

        <div className="summary-grid summary-grid-columns-3" style={{ marginTop: 16 }}>
          <div className="metric-card">
            <p className="metric-card-label">버전 수</p>
            <p className="metric-card-value">{strategy.versionCount}</p>
          </div>
          <div className="metric-card">
            <p className="metric-card-label">유니버스</p>
            <p className="metric-card-value">{strategy.universeCount}</p>
          </div>
          <div className="metric-card">
            <p className="metric-card-label">현재 상태</p>
            <p className="metric-card-value">{statusLabel[strategy.status] ?? strategy.status}</p>
          </div>
        </div>

        <div className="stack-list" style={{ marginTop: 16 }}>
          <div className="detail-row">
            <span className="detail-label">최신 검증</span>
            <span className="detail-value">{strategy.latestValidationStatus ?? "미검증"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">실행 모드</span>
            <span className="detail-value">{execution.mode}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">다음 실행</span>
            <span className="detail-value">{formatDateTime(execution.nextRunAt) ?? "대기 중"}</span>
          </div>
        </div>

        <div className="page-actions" style={{ marginTop: 16 }}>
          <Link
            href={`/strategies/${strategy.id}/backtest`}
            className="button-secondary"
          >
            백테스트
          </Link>
          <Link
            href={`/strategies/${strategy.id}/edit`}
            className="button-primary"
          >
            편집기 열기
          </Link>
          <button
            type="button"
            onClick={async () => {
              await cloneStrategy(strategy.id);
              startTransition(() => router.push("/strategies"));
            }}
            className="button-secondary"
          >
            복제
          </button>
          <button
            type="button"
            onClick={async () => {
              await archiveStrategy(strategy.id);
              startTransition(() => router.push("/strategies"));
            }}
            className="button-danger"
          >
            보관
          </button>
        </div>
      </section>

      {error ? (
        <section className="doc-panel doc-panel-error">
          {error}
        </section>
      ) : null}

      <section className="summary-grid summary-grid-columns-2">
        <section className="doc-panel">
          <h2 className="detail-heading">개요</h2>
          <div className="stack-list" style={{ marginTop: 16 }}>
            <div>
              <p className="detail-label">설명</p>
              <p className="detail-value">{strategy.description ?? "설명 없음"}</p>
            </div>
            <div>
              <p className="detail-label">검증 상태</p>
              <p className="detail-value">{strategy.latestValidationStatus ?? "미검증"}</p>
            </div>
            <div>
              <p className="detail-label">버전 수</p>
              <p className="detail-value">{strategy.versionCount}</p>
            </div>
            <div>
              <p className="detail-label">현재 상태</p>
              <p className="detail-value">{statusLabel[strategy.status] ?? strategy.status}</p>
            </div>
          </div>
          {strategy.latestValidationErrors.length > 0 ? (
            <div className="doc-panel doc-panel-error" style={{ marginTop: 16 }}>
              {strategy.latestValidationErrors.map((item, index) => (
                <p key={`${item.category}-${index}`} className="inline-error">
                  [{item.category}] {item.message}
                </p>
              ))}
            </div>
          ) : null}
          {strategy.latestValidationWarnings.length > 0 ? (
            <div className="doc-panel doc-panel-warn" style={{ marginTop: 16 }}>
              {strategy.latestValidationWarnings.map((item, index) => (
                <p key={`${item.category}-${index}`} className="inline-warning">
                  [{item.category}] {item.message}
                </p>
              ))}
            </div>
          ) : null}
        </section>

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
              <span className="form-label">실행 시각</span>
              <input
                type="time"
                value={scheduleTime}
                onChange={(event) => setScheduleTime(event.target.value)}
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
      </section>

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

      <section className="summary-grid summary-grid-columns-2">
        <section
          id="strategy-versions"
          className="doc-panel"
        >
          <div className="detail-card-header">
            <h2 className="detail-heading">버전</h2>
            <Link
              href={`/strategies/${strategy.id}/edit`}
              className="button-secondary"
            >
              새 버전 만들기
            </Link>
          </div>
          <div className="stack-list" style={{ marginTop: 16 }}>
            {versions.map((version) => (
              <article
                key={version.id}
                className="detail-card"
              >
                <div className="detail-card-header">
                  <h3 className="detail-label">
                    Version {version.versionNumber}
                  </h3>
                  <span className="detail-timestamp">
                    {version.validationStatus}
                  </span>
                </div>
                <p className="section-copy">
                  {version.changeSummary ?? "변경 메모 없음"}
                </p>
                {version.validationErrors.length > 0 ? (
                  <p className="inline-error" style={{ marginTop: 8 }}>
                    {version.validationErrors[0].message}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="doc-panel">
          <h2 className="detail-heading">연결된 유니버스</h2>
          <div className="stack-list" style={{ marginTop: 16 }}>
            {universes.length === 0 ? (
              <p className="section-copy">
                생성된 유니버스가 아직 없습니다.
              </p>
            ) : (
              universes.map((universe) => (
                <label
                  key={universe.id}
                  className="list-card flex-center"
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
            className="button-primary"
            style={{ marginTop: 16 }}
          >
            유니버스 연결 저장
          </button>
        </section>
      </section>

      <section
        id="strategy-orders"
        className="doc-panel"
      >
        <div className="detail-card-header">
          <h2 className="detail-heading">주문 후보</h2>
        </div>
        <div className="stack-list" style={{ marginTop: 16 }}>
          {orderCandidates.length === 0 ? (
            <p className="section-copy">주문 후보가 아직 없습니다.</p>
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
                  className="detail-card"
                >
                  <div className="flex-between">
                    <div>
                      <p className="detail-label">
                        {candidate.symbol} / {candidate.side}
                      </p>
                      <p className="detail-value">
                        {candidate.tradingDate} / {candidate.mode} / qty {candidate.quantity} / price {candidate.price}
                      </p>
                    </div>
                    <span className="detail-badge">
                      {candidate.precheck.passed ? "통과" : "실패"}
                    </span>
                  </div>
                  <div className="stack-list" style={{ marginTop: 12 }}>
                    <PrecheckRow label="marketHours" value={candidate.precheck.marketHours} />
                    <PrecheckRow label="strategyStatus" value={candidate.precheck.strategyStatus} />
                    <PrecheckRow label="duplicateOrder" value={candidate.precheck.duplicateOrder} />
                    <PrecheckRow label="quantityValid" value={candidate.precheck.quantityValid} />
                    <PrecheckRow label="priceValid" value={candidate.precheck.priceValid} />
                    <PrecheckRow label="riskPassed" value={candidate.riskCheck.passed} />
                    <div className="detail-row">
                      <span className="detail-label">이미 요청됨</span>
                      <span className="detail-value">{candidate.alreadyRequested ? "예" : "아니오"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">리스크 검증</span>
                      <span className="detail-value">
                        {candidate.riskCheck.reasonCodes.length > 0
                          ? candidate.riskCheck.reasonCodes.join(", ")
                          : "ok"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">예상 종목 노출</span>
                      <span className="detail-value">{formatNullableNumber(candidate.riskCheck.projectedSymbolExposure)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">예상 전략 노출</span>
                      <span className="detail-value">{formatNullableNumber(candidate.riskCheck.projectedStrategyExposure)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">예상 보유 종목 수</span>
                      <span className="detail-value">{candidate.riskCheck.projectedOpenPositions}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">금일 실현 손실</span>
                      <span className="detail-value">{candidate.riskCheck.currentDailyRealizedLoss}</span>
                    </div>
                  </div>
                  {candidate.precheck.reasonCodes.length > 0 ? (
                    <div className="doc-panel doc-panel-warn" style={{ marginTop: 12 }}>
                      <p className="inline-warning">{candidate.precheck.reasonCodes.join(", ")}</p>
                    </div>
                  ) : null}
                  {!candidate.riskCheck.passed ? (
                    <div className="doc-panel doc-panel-error" style={{ marginTop: 12 }}>
                      <p className="inline-error">{candidate.riskCheck.reasonCodes.join(", ")}</p>
                    </div>
                  ) : null}
                  <div className="flex-center" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      disabled={!canCreate || pendingOrderSignalId === candidate.signalEventId}
                      onClick={async () => handleCreateOrder(candidate.signalEventId)}
                      className="button-primary"
                    >
                      {pendingOrderSignalId === candidate.signalEventId
                        ? "생성 중..."
                        : "paper 주문 생성"}
                    </button>
                    <span className="detail-timestamp">
                      {candidate.alreadyRequested ? "이미 요청됨" : "생성 가능"}
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="doc-panel">
        <div className="detail-card-header">
          <h2 className="detail-heading">주문 요청 이력</h2>
        </div>
        <div className="stack-list" style={{ marginTop: 16 }}>
          {orderRequests.length === 0 ? (
            <p className="section-copy">주문 요청이 아직 없습니다.</p>
          ) : (
            orderRequests.map((request) => (
              <article
                key={request.id}
                className="detail-card"
              >
                <div className="flex-between">
                  <div>
                    <p className="detail-label">
                      {request.symbol} / {request.side}
                    </p>
                    <p className="detail-value">
                      {request.mode} / current {request.currentStatus} / filled{" "}
                      {request.filledQuantity} / {request.quantity} / remaining{" "}
                      {request.remainingQuantity}
                    </p>
                  </div>
                  <span className="detail-badge">
                    {request.status}
                  </span>
                </div>
                <div className="stack-list" style={{ marginTop: 12 }}>
                  <div className="detail-row">
                    <span className="detail-label">요청 시간</span>
                    <span className="detail-value">{formatDateTime(request.requestedAt)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">사전검증</span>
                    <span className="detail-value">{request.precheckPassed ? "통과" : "실패"}</span>
                  </div>
                </div>
                {request.failureReason ? (
                  <div className="doc-panel doc-panel-error" style={{ marginTop: 12 }}>
                    <p className="inline-error">{request.failureReason}</p>
                  </div>
                ) : null}
                <section className="detail-card" style={{ marginTop: 16 }}>
                  <div className="detail-card-header">
                    <h3 className="detail-label">주문 상태 이력</h3>
                    <span className="detail-timestamp">
                      {statusEventsByRequestId[request.id]?.length ?? 0}건
                    </span>
                  </div>
                  {statusEventsByRequestId[request.id]?.length ? (
                    <div className="stack-list" style={{ marginTop: 12 }}>
                      {statusEventsByRequestId[request.id].map((event) => (
                        <article
                          key={event.id}
                          className="detail-card"
                        >
                          <div className="detail-card-header">
                            <span className="detail-label">{event.status}</span>
                            <span className="detail-timestamp">
                              {formatDateTime(event.occurredAt)}
                            </span>
                          </div>
                          <p className="detail-value" style={{ marginTop: 4 }}>
                            {event.reason ?? "사유 없음"}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="section-copy">
                      상태 이력이 아직 없습니다.
                    </p>
                  )}
                </section>

                <form
                  className="detail-card grid-section"
                  style={{ marginTop: 16 }}
                  onSubmit={async (event) => {
                    event.preventDefault();
                    await handleCreateFill(request.id);
                  }}
                >
                  <div className="detail-card-header">
                    <h3 className="detail-label">수동 체결 등록</h3>
                    <span className="detail-timestamp">
                      모의(수동)
                    </span>
                  </div>
                  <div className="form-row">
                    <label className="form-field">
                      <span className="form-label">체결 수량</span>
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
                      />
                    </label>
                    <label className="form-field">
                      <span className="form-label">체결 가격</span>
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
                      />
                    </label>
                  </div>
                  <div className="flex-center">
                    <button
                      type="submit"
                      disabled={
                        pendingFillRequestId === request.id ||
                        request.remainingQuantity <= 0
                      }
                      className="button-primary"
                    >
                      {pendingFillRequestId === request.id
                        ? "등록 중..."
                        : request.remainingQuantity <= 0
                          ? "체결 완료"
                          : "체결 등록"}
                    </button>
                    <span className="detail-value">
                      filledAt는 현재 시각으로 자동 저장됩니다.
                    </span>
                  </div>
                </form>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="summary-grid summary-grid-columns-2">
        <section className="doc-panel">
          <div className="detail-card-header">
            <h2 className="detail-heading">체결 이력</h2>
          </div>
          <div className="stack-list" style={{ marginTop: 16 }}>
            {fills.length === 0 ? (
              <p className="section-copy">체결 이력이 아직 없습니다.</p>
            ) : (
              fills.map((fill) => (
                <article
                  key={fill.id}
                  className="detail-card"
                >
                  <div className="flex-between">
                    <div>
                      <p className="detail-label">
                        {fill.symbol} / {fill.side}
                      </p>
                      <p className="detail-value">
                        qty {fill.quantity} / price {fill.price} / {fill.source}
                      </p>
                    </div>
                    <span className="detail-timestamp">
                      {formatDateTime(fill.filledAt)}
                    </span>
                  </div>
                  <p className="section-copy">
                    order {shortId(fill.orderRequestId)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="doc-panel">
          <div className="detail-card-header">
            <h2 className="detail-heading">현재 포지션</h2>
          </div>
          <div className="stack-list" style={{ marginTop: 16 }}>
            {positions.length === 0 ? (
              <p className="section-copy">현재 포지션이 없습니다.</p>
            ) : (
              positions.map((position) => (
                <article
                  key={position.symbol}
                  className="detail-card"
                >
                  <div className="flex-between">
                    <div>
                      <p className="detail-label">{position.symbol}</p>
                      <p className="detail-value">
                        net {position.netQuantity} / avg {position.avgEntryPrice}
                      </p>
                    </div>
                    <span className="detail-timestamp">
                      {formatDateTime(position.lastFillAt)}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="summary-grid summary-grid-columns-2">
        <section
          id="strategy-activity"
          className="doc-panel"
        >
          <div className="detail-card-header">
            <h2 className="detail-heading">최근 실행 로그</h2>
          </div>
          <div className="stack-list" style={{ marginTop: 16 }}>
            {runs.length === 0 ? (
              <p className="section-copy">
                아직 실행 로그가 없습니다.
              </p>
            ) : (
              runs.map((run) => (
                <article
                  key={run.runId}
                  className="detail-card"
                >
                  <div className="flex-between">
                    <div>
                      <p className="detail-label">
                        {shortId(run.runId)}
                      </p>
                      <p className="detail-value">
                        {run.triggerType} / {run.scheduledDate} / v
                        {shortId(run.strategyVersionId)}
                      </p>
                    </div>
                    <span className="detail-badge">
                      {run.status}
                    </span>
                  </div>
                  <div className="stack-list" style={{ marginTop: 12 }}>
                    <div className="detail-row">
                      <span className="detail-label">종목 수</span>
                      <span className="detail-value">{run.symbolCount}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">시그널 수</span>
                      <span className="detail-value">{run.signalCount}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">시작</span>
                      <span className="detail-value">{formatDateTime(run.startedAt) ?? "대기 중"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">완료</span>
                      <span className="detail-value">{formatDateTime(run.completedAt) ?? "대기 중"}</span>
                    </div>
                  </div>
                  {run.errorMessage ? (
                    <div className="doc-panel doc-panel-error" style={{ marginTop: 12 }}>
                      <p className="inline-error">{run.errorMessage}</p>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="doc-panel">
          <div className="detail-card-header">
            <h2 className="detail-heading">최근 시그널 이력</h2>
          </div>
          <div className="stack-list" style={{ marginTop: 16 }}>
            {signals.length === 0 ? (
              <p className="section-copy">
                아직 시그널 이력이 없습니다.
              </p>
            ) : (
              signals.map((signal) => (
                <article
                  key={signal.id}
                  className="detail-card"
                >
                  <div className="flex-between">
                    <div>
                      <p className="detail-label">
                        {signal.symbol} / {signal.signalType}
                      </p>
                      <p className="detail-value">
                        {signal.tradingDate} / v{shortId(signal.strategyVersionId)}
                      </p>
                    </div>
                    <span className="detail-timestamp">
                      {formatDateTime(signal.createdAt)}
                    </span>
                  </div>
                  <pre className="code-block" style={{ marginTop: 12, wordBreak: "break-all" }}>
                    {JSON.stringify(signal.payload)}
                  </pre>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function PrecheckRow({
  label,
  value,
}: {
  label: string;
  value: boolean;
}) {
  return (
    <div className="detail-row">
      <span className="detail-label">{precheckLabel[label] ?? label}</span>
      <span className="detail-value">{value ? "통과" : "미통과"}</span>
    </div>
  );
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
