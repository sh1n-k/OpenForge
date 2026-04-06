"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  createOrderFill,
  createOrderRequest,
  type OrderCandidate,
  type OrderFill,
  type OrderRequest,
  type OrderStatusEvent,
  type StrategyPosition,
} from "@/lib/api";
import { formatDateTime, shortId } from "@/lib/format";

const precheckLabel: Record<string, string> = {
  marketHours: "장 운영 시간",
  strategyStatus: "전략 상태",
  duplicateOrder: "중복 주문",
  quantityValid: "수량 유효",
  priceValid: "가격 유효",
  riskPassed: "리스크 통과",
};

type Props = {
  strategyId: string;
  orderCandidates: OrderCandidate[];
  orderRequests: OrderRequest[];
  fills: OrderFill[];
  positions: StrategyPosition[];
  statusEventsByRequestId: Record<string, OrderStatusEvent[]>;
};

function formatNullableNumber(value: number | null) {
  return value === null ? "null" : value.toLocaleString("ko-KR");
}

export function StrategyOrdersSection({
  strategyId,
  orderCandidates,
  orderRequests,
  fills,
  positions,
  statusEventsByRequestId,
}: Props) {
  const router = useRouter();
  const [pendingOrderSignalId, setPendingOrderSignalId] = useState<string | null>(null);
  const [pendingFillRequestId, setPendingFillRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fillDrafts, setFillDrafts] = useState<
    Record<string, { quantity: string; price: string }>
  >({});

  async function handleCreateOrder(signalEventId: string) {
    try {
      setError(null);
      setPendingOrderSignalId(signalEventId);
      await createOrderRequest(strategyId, {
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
      await createOrderFill(strategyId, orderRequestId, {
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
    <>
      {error ? (
        <section className="p-4 rounded-xl bg-error-soft text-error border border-error/20 mb-6 text-[0.9375rem] font-medium flex items-start gap-2">
          {error}
        </section>
      ) : null}

      <section
        id="strategy-orders"
        className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
      >
        <div className="mb-6 pb-4 border-b border-border/60">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">주문 후보</h2>
        </div>
        <div className="grid gap-3">
          {orderCandidates.length === 0 ? (
            <p className="m-0 text-muted text-[0.9375rem]">주문 후보가 아직 없습니다.</p>
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
                  className="p-5 border border-border-soft rounded-xl bg-[#fafafa]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="grid gap-1.5">
                      <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">
                        {candidate.symbol} / {candidate.side}
                      </p>
                      <p className="m-0 text-foreground font-medium text-[0.9375rem]">
                        {candidate.tradingDate} / {candidate.mode} / qty {candidate.quantity} / price {candidate.price}
                      </p>
                    </div>
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-surface text-muted border border-border">
                      {candidate.precheck.passed ? "통과" : "실패"}
                    </span>
                  </div>
                  <div className="grid gap-3 mt-4">
                    <PrecheckRow label="marketHours" value={candidate.precheck.marketHours} />
                    <PrecheckRow label="strategyStatus" value={candidate.precheck.strategyStatus} />
                    <PrecheckRow label="duplicateOrder" value={candidate.precheck.duplicateOrder} />
                    <PrecheckRow label="quantityValid" value={candidate.precheck.quantityValid} />
                    <PrecheckRow label="priceValid" value={candidate.precheck.priceValid} />
                    <PrecheckRow label="riskPassed" value={candidate.riskCheck.passed} />
                    <div className="grid gap-1">
                      <span className="text-subtle text-xs font-semibold tracking-wider uppercase">이미 요청됨</span>
                      <span className="text-foreground font-medium text-[0.9375rem]">{candidate.alreadyRequested ? "예" : "아니오"}</span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-subtle text-xs font-semibold tracking-wider uppercase">리스크 검증</span>
                      <span className="text-foreground font-medium text-[0.9375rem]">
                        {candidate.riskCheck.reasonCodes.length > 0
                          ? candidate.riskCheck.reasonCodes.join(", ")
                          : "ok"}
                      </span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-subtle text-xs font-semibold tracking-wider uppercase">예상 종목 노출</span>
                      <span className="text-foreground font-medium text-[0.9375rem] font-mono">{formatNullableNumber(candidate.riskCheck.projectedSymbolExposure)}</span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-subtle text-xs font-semibold tracking-wider uppercase">예상 전략 노출</span>
                      <span className="text-foreground font-medium text-[0.9375rem] font-mono">{formatNullableNumber(candidate.riskCheck.projectedStrategyExposure)}</span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-subtle text-xs font-semibold tracking-wider uppercase">예상 보유 종목 수</span>
                      <span className="text-foreground font-medium text-[0.9375rem]">{candidate.riskCheck.projectedOpenPositions}</span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-subtle text-xs font-semibold tracking-wider uppercase">금일 실현 손실</span>
                      <span className="text-foreground font-medium text-[0.9375rem] font-mono">{candidate.riskCheck.currentDailyRealizedLoss}</span>
                    </div>
                  </div>
                  {candidate.precheck.reasonCodes.length > 0 ? (
                    <div className="p-4 rounded-xl bg-warning-soft border border-warning/20 mt-4 text-warning font-medium text-[0.9375rem] flex items-start gap-2">
                      <p className="m-0 text-[0.9375rem] font-medium text-warning flex items-start gap-2">{candidate.precheck.reasonCodes.join(", ")}</p>
                    </div>
                  ) : null}
                  {!candidate.riskCheck.passed ? (
                    <div className="p-4 rounded-xl bg-error-soft border border-error/20 mt-4 text-error font-medium text-[0.9375rem] flex items-start gap-2">
                      <p className="m-0 text-[0.9375rem] font-medium text-error flex items-start gap-2">{candidate.riskCheck.reasonCodes.join(", ")}</p>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border-soft">
                    <button
                      type="button"
                      disabled={!canCreate || pendingOrderSignalId === candidate.signalEventId}
                      onClick={async () => handleCreateOrder(candidate.signalEventId)}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                    >
                      {pendingOrderSignalId === candidate.signalEventId
                        ? "생성 중..."
                        : "paper 주문 생성"}
                    </button>
                    <span className="text-muted text-[0.8125rem]">
                      {candidate.alreadyRequested ? "이미 요청됨" : "생성 가능"}
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm mt-8">
        <div className="mb-6 pb-4 border-b border-border/60">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">주문 요청 이력</h2>
        </div>
        <div className="grid gap-3">
          {orderRequests.length === 0 ? (
            <p className="m-0 text-muted text-[0.9375rem]">주문 요청이 아직 없습니다.</p>
          ) : (
            orderRequests.map((request) => (
              <article
                key={request.id}
                className="p-5 border border-border-soft rounded-xl bg-[#fafafa]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="grid gap-1.5">
                    <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">
                      {request.symbol} / {request.side}
                    </p>
                    <p className="m-0 text-foreground font-medium text-[0.9375rem]">
                      {request.mode} / current {request.currentStatus} / filled{" "}
                      {request.filledQuantity} / {request.quantity} / remaining{" "}
                      {request.remainingQuantity}
                    </p>
                  </div>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-surface text-muted border border-border">
                    {request.status}
                  </span>
                </div>
                <div className="grid gap-3 mt-4">
                  <div className="grid gap-1">
                    <span className="text-subtle text-xs font-semibold tracking-wider uppercase">요청 시간</span>
                    <span className="text-foreground font-medium text-[0.9375rem] font-mono">{formatDateTime(request.requestedAt)}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-subtle text-xs font-semibold tracking-wider uppercase">사전검증</span>
                    <span className="text-foreground font-medium text-[0.9375rem]">{request.precheckPassed ? "통과" : "실패"}</span>
                  </div>
                </div>
                {request.failureReason ? (
                  <div className="p-4 rounded-xl bg-error-soft border border-error/20 mt-4 text-error font-medium text-[0.9375rem] flex items-start gap-2">
                    <p className="m-0 text-[0.9375rem] font-medium text-error flex items-start gap-2">{request.failureReason}</p>
                  </div>
                ) : null}
                <section className="p-5 border border-border-soft rounded-xl bg-surface mt-4 shadow-sm">
                  <div className="mb-4 pb-3 border-b border-border/60 flex items-center justify-between">
                    <h3 className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">주문 상태 이력</h3>
                    <span className="text-muted text-[0.8125rem]">
                      {statusEventsByRequestId[request.id]?.length ?? 0}건
                    </span>
                  </div>
                  {statusEventsByRequestId[request.id]?.length ? (
                    <div className="grid gap-3">
                      {statusEventsByRequestId[request.id].map((event) => (
                        <article
                          key={event.id}
                          className="p-5 border border-border-soft rounded-xl bg-[#fafafa]"
                        >
                          <div className="mb-4 pb-3 border-b border-border/60 flex items-center justify-between">
                            <span className="text-subtle text-xs font-semibold tracking-wider uppercase">{event.status}</span>
                            <span className="text-muted text-[0.8125rem]">
                              {formatDateTime(event.occurredAt)}
                            </span>
                          </div>
                          <p className="m-0 text-foreground font-medium text-[0.9375rem] mt-1">
                            {event.reason ?? "사유 없음"}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="m-0 text-muted text-[0.9375rem]">
                      상태 이력이 아직 없습니다.
                    </p>
                  )}
                </section>

                <form
                  className="p-5 border border-border-soft rounded-xl bg-surface mt-4 shadow-sm grid gap-6 flex-1"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    await handleCreateFill(request.id);
                  }}
                >
                  <div className="mb-4 pb-3 border-b border-border/60 flex items-center justify-between">
                    <h3 className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">수동 체결 등록</h3>
                    <span className="text-muted text-[0.8125rem]">
                      모의(수동)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="grid gap-1.5 focus-within:text-primary">
                      <span className="text-subtle text-sm font-medium transition-colors">체결 수량</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
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
                    <label className="grid gap-1.5 focus-within:text-primary">
                      <span className="text-subtle text-sm font-medium transition-colors">체결 가격</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
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
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={
                        pendingFillRequestId === request.id ||
                        request.remainingQuantity <= 0
                      }
                      className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                    >
                      {pendingFillRequestId === request.id
                        ? "등록 중..."
                        : request.remainingQuantity <= 0
                          ? "체결 완료"
                          : "체결 등록"}
                    </button>
                    <span className="text-foreground font-medium text-[0.9375rem]">
                      filledAt는 현재 시각으로 자동 저장됩니다.
                    </span>
                  </div>
                </form>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-8">
        <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm">
          <div className="mb-6 pb-4 border-b border-border/60">
            <h2 className="m-0 font-sans text-xl font-bold text-foreground">체결 이력</h2>
          </div>
          <div className="grid gap-3">
            {fills.length === 0 ? (
              <p className="m-0 text-muted text-[0.9375rem]">체결 이력이 아직 없습니다.</p>
            ) : (
              fills.map((fill) => (
                <article
                  key={fill.id}
                  className="p-5 border border-border-soft rounded-xl bg-[#fafafa]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="grid gap-1.5">
                      <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">
                        {fill.symbol} / {fill.side}
                      </p>
                      <p className="m-0 text-foreground font-medium text-[0.9375rem]">
                        qty {fill.quantity} / price {fill.price} / {fill.source}
                      </p>
                    </div>
                    <span className="text-muted text-[0.8125rem]">
                      {formatDateTime(fill.filledAt)}
                    </span>
                  </div>
                  <p className="m-0 text-muted text-[0.9375rem] leading-relaxed mt-2 font-mono text-sm">
                    order {shortId(fill.orderRequestId)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm">
          <div className="mb-6 pb-4 border-b border-border/60">
            <h2 className="m-0 font-sans text-xl font-bold text-foreground">현재 포지션</h2>
          </div>
          <div className="grid gap-3">
            {positions.length === 0 ? (
              <p className="m-0 text-muted text-[0.9375rem]">현재 포지션이 없습니다.</p>
            ) : (
              positions.map((position) => (
                <article
                  key={position.symbol}
                  className="p-5 border border-border-soft rounded-xl bg-[#fafafa]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="grid gap-1.5">
                      <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">{position.symbol}</p>
                      <p className="m-0 text-foreground font-medium text-[0.9375rem]">
                        net {position.netQuantity} / avg {position.avgEntryPrice}
                      </p>
                    </div>
                    <span className="text-muted text-[0.8125rem]">
                      {formatDateTime(position.lastFillAt)}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </>
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
    <div className="grid gap-1">
      <span className="text-subtle text-xs font-semibold tracking-wider uppercase">{precheckLabel[label] ?? label}</span>
      <span className="text-foreground font-medium text-[0.9375rem]">{value ? "통과" : "미통과"}</span>
    </div>
  );
}
