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
} from "@/components/page-layout";

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
  requested: "status-chip status-chip-info",
  pending: "status-chip",
  rejected_duplicate: "status-chip status-chip-error",
  rejected_precheck: "status-chip status-chip-error",
  rejected_risk: "status-chip status-chip-error",
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
    <main className="page-shell docs-page-shell page-shell-operations">
      <PageIntroSection
        id="orders-summary"
        eyebrow="Orders"
        title="주문 및 체결"
        description="모든 전략의 주문 요청과 체결 내역을 통합 조회합니다."
      />

      <section className="doc-panel doc-panel-info doc-panel-compact">
        <p className="section-copy doc-panel-copy">
          이 화면은 OpenForge 내부 주문 기록만 표시합니다. 실제 계좌 원장은{" "}
          <Link href="/broker" className="table-link">
            Broker
          </Link>
          에서 확인하세요.
        </p>
      </section>

      <div className="summary-grid summary-grid-metrics">
        <article className="metric-card metric-card-accent-primary">
          <p className="metric-card-label">주문 요청</p>
          <p className="metric-card-value">{filteredOrders.length}</p>
          <p className="metric-card-copy">현재 필터 기준 주문 요청 수</p>
        </article>
        <article className="metric-card metric-card-accent-info">
          <p className="metric-card-label">체결 내역</p>
          <p className="metric-card-value">{filteredFills.length}</p>
          <p className="metric-card-copy">현재 필터 기준 체결 건수</p>
        </article>
      </div>

      <OperationsControlPanel
        id="orders-filters"
        title="조회 기준"
        description="전략 기준으로 주문 요청과 체결 내역을 함께 필터링합니다."
      >
        {strategies.length > 0 ? (
          <div className="filter-panel-form">
            <label className="form-field filter-panel-field">
              <span className="form-label">전략 필터</span>
              <select
                className="filter-select"
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
          <p className="filter-panel-note">
            저장된 전략이 없어 전체 기준으로 주문과 체결을 표시합니다.
          </p>
        )}
      </OperationsControlPanel>

      <section id="orders-requests">
        <SectionHeaderBlock title="주문 요청" />
        {filteredOrders.length === 0 ? (
          <div className="empty-state empty-state-compact">
            <p className="empty-state-message">주문 내역이 없습니다</p>
          </div>
        ) : (
          <div className="doc-panel">
            <div className="table-shell">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>심볼</th>
                    <th>전략</th>
                    <th>방향</th>
                    <th>수량</th>
                    <th>가격</th>
                    <th>모드</th>
                    <th>상태</th>
                    <th>시간</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600 }}>{order.symbol}</td>
                      <td>
                        <Link href={`/strategies/${order.strategyId}`} className="table-link">
                          {order.strategyName}
                        </Link>
                      </td>
                      <td className={order.side === "buy" ? "text-primary" : "text-error"} style={{ fontWeight: 600 }}>
                        {sideLabel[order.side] ?? order.side}
                      </td>
                      <td>{order.quantity}</td>
                      <td>{order.price.toLocaleString()}</td>
                      <td>{modeLabel[order.mode] ?? order.mode}</td>
                      <td>
                        <span className={orderStatusChip[order.status] ?? "status-chip"}>
                          {orderStatusLabel[order.status] ?? order.status}
                        </span>
                      </td>
                      <td>{formatDateTime(order.requestedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section id="orders-fills">
        <SectionHeaderBlock title="체결 내역" />
        {filteredFills.length === 0 ? (
          <div className="empty-state empty-state-compact">
            <p className="empty-state-message">체결 내역이 없습니다</p>
          </div>
        ) : (
          <div className="doc-panel">
            <div className="table-shell">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>심볼</th>
                    <th>전략</th>
                    <th>방향</th>
                    <th>수량</th>
                    <th>가격</th>
                    <th>손익</th>
                    <th>소스</th>
                    <th>시간</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFills.map((fill) => (
                    <tr key={fill.id}>
                      <td style={{ fontWeight: 600 }}>{fill.symbol}</td>
                      <td>
                        <Link href={`/strategies/${fill.strategyId}`} className="table-link">
                          {fill.strategyName}
                        </Link>
                      </td>
                      <td className={fill.side === "buy" ? "text-primary" : "text-error"} style={{ fontWeight: 600 }}>
                        {sideLabel[fill.side] ?? fill.side}
                      </td>
                      <td>{fill.quantity}</td>
                      <td>{fill.price.toLocaleString()}</td>
                      <td className={pnlClassName(fill.realizedPnl)} style={{ fontWeight: 600 }}>
                        {formatPnl(fill.realizedPnl)}
                      </td>
                      <td>{sourceLabel[fill.source] ?? fill.source}</td>
                      <td>{formatDateTime(fill.filledAt)}</td>
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
