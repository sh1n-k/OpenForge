"use client";

import { useState } from "react";
import type {
  CrossStrategyOrderRequest,
  CrossStrategyFill,
  StrategySummary,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type OrdersPageClientProps = {
  orders: CrossStrategyOrderRequest[];
  fills: CrossStrategyFill[];
  strategies: StrategySummary[];
};

function orderStatusChipClass(status: string): string {
  if (status === "requested") return "status-chip status-chip-info";
  if (status.startsWith("rejected")) return "status-chip status-chip-error";
  return "status-chip";
}

function sideColor(side: string): string {
  return side === "buy" ? "var(--primary)" : "var(--error)";
}

function pnlColor(value: number): string {
  if (value > 0) return "var(--success)";
  if (value < 0) return "var(--error)";
  return "inherit";
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
    <main className="page-shell workbench-page-shell">
      <section id="orders-summary" className="doc-panel">
        <div className="page-intro-row">
          <div className="page-intro">
            <p className="page-eyebrow">Orders</p>
            <h1 className="page-title">주문 및 체결</h1>
          </div>
        </div>
        <div className="summary-grid summary-grid-columns-2" style={{ marginTop: 16 }}>
          <div className="metric-card">
            <p className="metric-card-label">전체 주문</p>
            <p className="metric-card-value">{filteredOrders.length}</p>
          </div>
          <div className="metric-card">
            <p className="metric-card-label">전체 체결</p>
            <p className="metric-card-value">{filteredFills.length}</p>
          </div>
        </div>
      </section>

      <section id="orders-filter" className="doc-panel">
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
            전략 필터
          </span>
          <select
            value={selectedStrategyId ?? ""}
            onChange={(e) => setSelectedStrategyId(e.target.value || null)}
          >
            <option value="">전체</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
      </section>

      <section id="orders-requests" className="doc-panel">
        <h2 className="section-title">주문 요청</h2>
        {filteredOrders.length === 0 ? (
          <p className="section-copy">주문 내역이 없습니다</p>
        ) : (
          <div className="table-shell" style={{ marginTop: 16 }}>
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
                    <td>{order.strategyName}</td>
                    <td style={{ color: sideColor(order.side), fontWeight: 600 }}>
                      {order.side.toUpperCase()}
                    </td>
                    <td>{order.quantity}</td>
                    <td>{order.price.toLocaleString()}</td>
                    <td>{order.mode}</td>
                    <td>
                      <span className={orderStatusChipClass(order.status)}>
                        {order.status}
                      </span>
                    </td>
                    <td>{formatDateTime(order.requestedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="orders-fills" className="doc-panel">
        <h2 className="section-title">체결 내역</h2>
        {filteredFills.length === 0 ? (
          <p className="section-copy">체결 내역이 없습니다</p>
        ) : (
          <div className="table-shell" style={{ marginTop: 16 }}>
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
                    <td>{fill.strategyName}</td>
                    <td style={{ color: sideColor(fill.side), fontWeight: 600 }}>
                      {fill.side.toUpperCase()}
                    </td>
                    <td>{fill.quantity}</td>
                    <td>{fill.price.toLocaleString()}</td>
                    <td style={{ color: pnlColor(fill.realizedPnl), fontWeight: 600 }}>
                      {fill.realizedPnl > 0 ? "+" : ""}{fill.realizedPnl.toLocaleString()}
                    </td>
                    <td>{fill.source}</td>
                    <td>{formatDateTime(fill.filledAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
