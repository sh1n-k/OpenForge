"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  CrossStrategyOrderRequest,
  CrossStrategyFill,
  StrategySummary,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  OperationsControlPanel,
  PageIntroSection,
  SectionHeaderBlock,
} from "@/components/common/page-layout";

type OrdersPageClientProps = {
  orders: CrossStrategyOrderRequest[];
  fills: CrossStrategyFill[];
  strategies: StrategySummary[];
};

const orderStatusLabel: Record<string, string> = {
  requested: "요청",
  pending: "대기",
  rejected_duplicate: "중복 거부",
  rejected_precheck: "사전검증 거부",
  rejected_risk: "리스크 거부",
};

const orderStatusChip: Record<string, string> = {
  requested: "inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-primary-soft text-primary border border-primary/20",
  pending: "inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-surface text-foreground border border-border",
  rejected_duplicate: "inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-error-soft text-error border border-error/20",
  rejected_precheck: "inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-error-soft text-error border border-error/20",
  rejected_risk: "inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-error-soft text-error border border-error/20",
};

const sideLabel: Record<string, string> = { buy: "매수", sell: "매도" };
const modeLabel: Record<string, string> = { paper: "모의", live: "실전" };
const sourceLabel: Record<string, string> = { paper_manual: "모의(수동)", live_sync_reserved: "실전(동기화)" };

function pnlClassName(value: number): string {
  if (value > 0) return "text-success";
  if (value < 0) return "text-error";
  return "text-muted";
}

function formatPnl(value: number): string {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
}

export function OrdersPageClient({
  orders,
  fills,
  strategies,
}: OrdersPageClientProps) {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

  const filteredOrders = selectedStrategyId
    ? orders.filter((o) => o.strategyId === selectedStrategyId)
    : orders;

  const filteredFills = selectedStrategyId
    ? fills.filter((f) => f.strategyId === selectedStrategyId)
    : fills;

  return (
    <main className="grid content-start gap-8 w-[min(100%,var(--content-width))] mx-auto px-5 pt-8 pb-16">
      <PageIntroSection
        id="orders-summary"
        eyebrow="Orders"
        title="주문 및 체결"
        description="모든 전략의 주문 요청과 체결 내역을 통합 조회합니다."
      />

      <section className="p-5 bg-primary-soft/30 border border-primary/20 rounded-xl">
        <p className="m-0 text-muted text-[0.9375rem] leading-relaxed">
          이 화면은 OpenForge 내부 주문 기록만 표시합니다. 실제 계좌 원장은{" "}
          <Link href="/broker" className="font-semibold text-primary hover:text-primary-hover underline underline-offset-2 transition-colors">
            Broker
          </Link>
          에서 확인하세요.
        </p>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 justify-start">
        <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-primary">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">주문 요청</p>
          <p className="m-0 font-sans text-3xl leading-snug font-bold text-foreground">{filteredOrders.length}</p>
          <p className="m-0 text-muted text-[0.875rem]">현재 필터 기준 주문 요청 수</p>
        </article>
        <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-secondary">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">체결 내역</p>
          <p className="m-0 font-sans text-3xl leading-snug font-bold text-foreground">{filteredFills.length}</p>
          <p className="m-0 text-muted text-[0.875rem]">현재 필터 기준 체결 건수</p>
        </article>
      </div>

      <OperationsControlPanel
        id="orders-filters"
        title="조회 기준"
        description="전략 기준으로 주문 요청과 체결 내역을 함께 필터링합니다."
      >
        {strategies.length > 0 ? (
          <div className="mt-4">
            <label className="grid gap-1.5 focus-within:text-primary max-w-sm">
              <span className="text-subtle text-sm font-medium transition-colors">전략 필터</span>
              <select
                className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%221.5%22%20stroke%3D%22%2371717a%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M8.25%2015L12%2018.75%2015.75%2015m-7.5-6L12%205.25%2015.75%209%22%20%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[size:1.5em_1.5em] pr-10"
                value={selectedStrategyId ?? ""}
                onChange={(e) => setSelectedStrategyId(e.target.value || null)}
              >
                <option value="">전체</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <p className="m-0 mt-4 text-muted text-sm border-l-2 border-border pl-3">
            저장된 전략이 없어 전체 기준으로 주문과 체결을 표시합니다.
          </p>
        )}
      </OperationsControlPanel>

      <section id="orders-requests" className="grid gap-5">
        <SectionHeaderBlock title="주문 요청" />
        {filteredOrders.length === 0 ? (
          <div className="grid justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center bg-surface shadow-sm">
            <p className="m-0 font-medium text-muted">주문 내역이 없습니다</p>
          </div>
        ) : (
          <div className="p-6 border border-border-soft rounded-xl bg-surface shadow-sm overflow-hidden">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">심볼</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">전략</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">방향</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">수량</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">가격</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">모드</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">상태</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">시간</th>
                  </tr>
                </thead>
                <tbody className="align-baseline">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="group hover:bg-slate-50/50">
                      <td className="py-3 border-b border-border-soft font-mono font-semibold text-foreground">{order.symbol}</td>
                      <td className="py-3 border-b border-border-soft">
                        <Link href={`/strategies/${order.strategyId}`} className="font-medium text-foreground hover:text-primary transition-colors">
                          {order.strategyName}
                        </Link>
                      </td>
                      <td className={`py-3 border-b border-border-soft font-bold ${order.side === "buy" ? "text-primary" : "text-error"}`}>
                        {sideLabel[order.side] ?? order.side}
                      </td>
                      <td className="py-3 border-b border-border-soft font-mono text-right text-muted">{order.quantity}</td>
                      <td className="py-3 border-b border-border-soft font-mono text-right text-muted">{order.price.toLocaleString()}</td>
                      <td className="py-3 border-b border-border-soft text-muted">{modeLabel[order.mode] ?? order.mode}</td>
                      <td className="py-3 border-b border-border-soft">
                        <span className={orderStatusChip[order.status] ?? "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase border bg-surface text-foreground border-border"}>
                          {orderStatusLabel[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="py-3 border-b border-border-soft text-right text-[0.8125rem] text-muted">{formatDateTime(order.requestedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section id="orders-fills" className="grid gap-5">
        <SectionHeaderBlock title="체결 내역" />
        {filteredFills.length === 0 ? (
          <div className="grid justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center bg-surface shadow-sm">
            <p className="m-0 font-medium text-muted">체결 내역이 없습니다</p>
          </div>
        ) : (
          <div className="p-6 border border-border-soft rounded-xl bg-surface shadow-sm overflow-hidden">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">심볼</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">전략</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">방향</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">수량</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">가격</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">손익</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">소스</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">시간</th>
                  </tr>
                </thead>
                <tbody className="align-baseline">
                  {filteredFills.map((fill) => (
                    <tr key={fill.id} className="group hover:bg-slate-50/50">
                      <td className="py-3 border-b border-border-soft font-mono font-semibold text-foreground">{fill.symbol}</td>
                      <td className="py-3 border-b border-border-soft">
                        <Link href={`/strategies/${fill.strategyId}`} className="font-medium text-foreground hover:text-primary transition-colors">
                          {fill.strategyName}
                        </Link>
                      </td>
                      <td className={`py-3 border-b border-border-soft font-bold ${fill.side === "buy" ? "text-primary" : "text-error"}`}>
                        {sideLabel[fill.side] ?? fill.side}
                      </td>
                      <td className="py-3 border-b border-border-soft font-mono text-right text-muted">{fill.quantity}</td>
                      <td className="py-3 border-b border-border-soft font-mono text-right text-muted">{fill.price.toLocaleString()}</td>
                      <td className={`py-3 border-b border-border-soft font-mono font-bold text-right ${pnlClassName(fill.realizedPnl)}`}>
                        {formatPnl(fill.realizedPnl)}
                      </td>
                      <td className="py-3 border-b border-border-soft text-muted">{sourceLabel[fill.source] ?? fill.source}</td>
                      <td className="py-3 border-b border-border-soft text-right text-[0.8125rem] text-muted">{formatDateTime(fill.filledAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
