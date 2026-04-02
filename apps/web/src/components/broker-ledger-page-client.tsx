"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadBrokerLedgerBalances,
  loadBrokerLedgerProfits,
  loadBrokerLedgerTrades,
  type BrokerLedgerBalance,
  type BrokerLedgerMarket,
  type BrokerLedgerProfit,
  type BrokerLedgerStatus,
  type BrokerLedgerSyncRun,
  type BrokerLedgerTrade,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type BrokerLedgerPageClientProps = {
  initialStatus: BrokerLedgerStatus;
  initialRuns: BrokerLedgerSyncRun[];
  initialTrades: BrokerLedgerTrade[];
  initialBalances: BrokerLedgerBalance[];
  initialProfits: BrokerLedgerProfit[];
};

const marketLabel: Record<BrokerLedgerMarket, string> = {
  domestic: "국내주식",
  overseas: "해외주식",
};

function formatNullableNumber(value: number | null) {
  return value === null ? "—" : value.toLocaleString("ko-KR");
}

function filterSucceededRuns(runs: BrokerLedgerSyncRun[]) {
  return runs.filter((run) => run.status === "succeeded");
}

export function BrokerLedgerPageClient({
  initialStatus,
  initialRuns,
  initialTrades,
  initialBalances,
  initialProfits,
}: BrokerLedgerPageClientProps) {
  const successfulRuns = filterSucceededRuns(initialRuns);
  const defaultRunId =
    initialStatus.latestSuccessfulSyncRun?.id ?? successfulRuns[0]?.id ?? "";

  const [selectedRunId, setSelectedRunId] = useState(defaultRunId);
  const [marketFilter, setMarketFilter] = useState<BrokerLedgerMarket | null>(null);
  const [dataFilter, setDataFilter] = useState<"all" | "trades" | "balances" | "profits">(
    "all",
  );
  const [trades, setTrades] = useState(initialTrades);
  const [balances, setBalances] = useState(initialBalances);
  const [profits, setProfits] = useState(initialProfits);
  const [error, setError] = useState<string | null>(null);

  const selectedRun =
    successfulRuns.find((run) => run.id === selectedRunId) ?? null;

  useEffect(() => {
    if (!selectedRunId) {
      return;
    }

    const shouldUseInitialData =
      selectedRunId === defaultRunId && marketFilter === null;
    if (shouldUseInitialData) {
      return;
    }

    Promise.all([
      loadBrokerLedgerTrades({ syncRunId: selectedRunId, market: marketFilter, limit: 200 }),
      loadBrokerLedgerBalances({ syncRunId: selectedRunId, market: marketFilter, limit: 200 }),
      loadBrokerLedgerProfits({ syncRunId: selectedRunId, market: marketFilter, limit: 200 }),
    ])
      .then(([nextTrades, nextBalances, nextProfits]) => {
        setError(null);
        setTrades(nextTrades);
        setBalances(nextBalances);
        setProfits(nextProfits);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "원장 상세 조회에 실패했습니다.",
        );
      });
  }, [selectedRunId, marketFilter, defaultRunId]);

  const showTrades = dataFilter === "all" || dataFilter === "trades";
  const showBalances = dataFilter === "all" || dataFilter === "balances";
  const showProfits = dataFilter === "all" || dataFilter === "profits";

  return (
    <main className="page-shell docs-page-shell">
      <section id="broker-ledger-summary" className="page-intro">
        <p className="page-eyebrow">Broker Ledger</p>
        <h1 className="page-title">원장 상세</h1>
        <p className="page-description">
          브로커 원장 기준 주문, 체결, 잔고, 손익 스냅샷을 조회합니다.
        </p>
      </section>

      <section className="doc-panel doc-panel-warn">
        <p className="section-copy" style={{ marginTop: 0 }}>
          이 화면은 OpenForge 내부 주문 이력이 아니라 한국투자증권 실전 계좌 원장입니다.
          전략 매핑 없이 계좌 사실 데이터만 보여줍니다.
        </p>
      </section>

      {!initialStatus.liveConfigured ? (
        <section className="doc-panel doc-panel-error">
          <p className="section-copy" style={{ marginTop: 0 }}>
            실전 브로커 연결이 설정되지 않았습니다.{" "}
            <Link href="/settings" className="table-link">
              Settings
            </Link>
            에서 설정한 뒤 원장 동기화를 실행하세요.
          </p>
        </section>
      ) : null}

      {error ? (
        <section className="doc-panel doc-panel-error">
          <p className="section-copy" style={{ marginTop: 0 }}>{error}</p>
        </section>
      ) : null}

      <section id="broker-ledger-filters" className="doc-panel">
        <div className="flex-between">
          <div>
            <h2 className="section-title">조회 기준</h2>
            <p className="section-copy">
              가장 최근 성공 동기화를 기본값으로 사용하며, 원하는 run으로 변경할 수 있습니다.
            </p>
          </div>
        </div>

        {successfulRuns.length === 0 ? (
          <div className="empty-state empty-state-compact" style={{ marginTop: 16 }}>
            <p className="empty-state-message">성공한 동기화 run이 없습니다</p>
            <p className="empty-state-hint">
              <Link href="/broker" className="table-link">
                Broker
              </Link>
              에서 원장 동기화를 먼저 실행하세요.
            </p>
          </div>
        ) : (
          <>
            <div className="form-row" style={{ marginTop: 16 }}>
              <label className="form-field">
                <span className="form-label">동기화 run</span>
                <select
                  value={selectedRunId}
                  onChange={(event) => setSelectedRunId(event.target.value)}
                >
                  {successfulRuns.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.startDate} ~ {run.endDate} / {formatDateTime(run.completedAt ?? run.requestedAt)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">시장</span>
                <select
                  value={marketFilter ?? ""}
                  onChange={(event) =>
                    setMarketFilter(
                      event.target.value
                        ? (event.target.value as BrokerLedgerMarket)
                        : null,
                    )
                  }
                >
                  <option value="">전체</option>
                  <option value="domestic">국내주식</option>
                  <option value="overseas">해외주식</option>
                </select>
              </label>
            </div>

            <div className="filter-bar" style={{ marginTop: 16 }}>
              <span className="form-label">표시 데이터</span>
              {[
                ["all", "전체"],
                ["trades", "거래 원장"],
                ["balances", "잔고 스냅샷"],
                ["profits", "손익 스냅샷"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    dataFilter === value
                      ? "status-chip status-chip-info"
                      : "status-chip"
                  }
                  onClick={() =>
                    setDataFilter(
                      value as "all" | "trades" | "balances" | "profits",
                    )
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {selectedRun ? (
              <div className="summary-grid summary-grid-columns-3" style={{ marginTop: 16 }}>
                <article className="metric-card metric-card-accent-primary">
                  <p className="metric-card-label">거래 원장</p>
                  <p className="metric-card-value">{selectedRun.tradeCount}</p>
                </article>
                <article className="metric-card metric-card-accent-info">
                  <p className="metric-card-label">잔고 스냅샷</p>
                  <p className="metric-card-value">{selectedRun.balanceCount}</p>
                </article>
                <article className="metric-card metric-card-accent-secondary">
                  <p className="metric-card-label">손익 스냅샷</p>
                  <p className="metric-card-value">{selectedRun.profitCount}</p>
                </article>
              </div>
            ) : null}
          </>
        )}
      </section>

      {showTrades ? (
        <section id="broker-ledger-trades">
          <h2 className="section-title">
            거래 원장
            <span className="section-count">{trades.length}건</span>
          </h2>
          {trades.length === 0 ? (
            <div className="empty-state empty-state-compact" style={{ marginTop: 16 }}>
              <p className="empty-state-message">조회된 거래 원장 데이터가 없습니다</p>
            </div>
          ) : (
            <div className="doc-panel" style={{ marginTop: 16 }}>
              <div className="table-shell">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>시장</th>
                      <th>심볼</th>
                      <th>방향</th>
                      <th>상태</th>
                      <th>주문수량</th>
                      <th>체결수량</th>
                      <th>체결가</th>
                      <th>시각</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.id}>
                        <td>{marketLabel[trade.market]}</td>
                        <td style={{ fontWeight: 600 }}>
                          {trade.symbol ?? trade.symbolName ?? "—"}
                        </td>
                        <td>{trade.side ?? "—"}</td>
                        <td>{trade.orderStatus ?? "—"}</td>
                        <td>{formatNullableNumber(trade.quantity)}</td>
                        <td>{formatNullableNumber(trade.filledQuantity)}</td>
                        <td>{formatNullableNumber(trade.price)}</td>
                        <td>{formatDateTime(trade.capturedAt) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {showBalances ? (
        <section id="broker-ledger-balances">
          <h2 className="section-title">
            잔고 스냅샷
            <span className="section-count">{balances.length}건</span>
          </h2>
          {balances.length === 0 ? (
            <div className="empty-state empty-state-compact" style={{ marginTop: 16 }}>
              <p className="empty-state-message">조회된 잔고 데이터가 없습니다</p>
            </div>
          ) : (
            <div className="doc-panel" style={{ marginTop: 16 }}>
              <div className="table-shell">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>시장</th>
                      <th>심볼</th>
                      <th>보유수량</th>
                      <th>현재가</th>
                      <th>평균단가</th>
                      <th>평가금액</th>
                      <th>평가손익</th>
                      <th>기준시각</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((balance) => (
                      <tr key={balance.id}>
                        <td>{marketLabel[balance.market]}</td>
                        <td style={{ fontWeight: 600 }}>
                          {balance.symbol ?? balance.symbolName ?? "—"}
                        </td>
                        <td>{formatNullableNumber(balance.quantity)}</td>
                        <td>{formatNullableNumber(balance.currentPrice)}</td>
                        <td>{formatNullableNumber(balance.averagePrice)}</td>
                        <td>{formatNullableNumber(balance.valuationAmount)}</td>
                        <td>{formatNullableNumber(balance.unrealizedPnl)}</td>
                        <td>{formatDateTime(balance.capturedAt) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {showProfits ? (
        <section id="broker-ledger-profits">
          <h2 className="section-title">
            손익 스냅샷
            <span className="section-count">{profits.length}건</span>
          </h2>
          {profits.length === 0 ? (
            <div className="empty-state empty-state-compact" style={{ marginTop: 16 }}>
              <p className="empty-state-message">조회된 손익 데이터가 없습니다</p>
            </div>
          ) : (
            <div className="doc-panel" style={{ marginTop: 16 }}>
              <div className="table-shell">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>시장</th>
                      <th>기준시각</th>
                      <th>심볼</th>
                      <th>실현손익</th>
                      <th>손익률</th>
                      <th>매수금액</th>
                      <th>매도금액</th>
                      <th>통화</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profits.map((profit) => (
                      <tr key={profit.id}>
                        <td>{marketLabel[profit.market]}</td>
                        <td>{formatDateTime(profit.capturedAt) ?? "—"}</td>
                        <td style={{ fontWeight: 600 }}>
                          {profit.symbol ?? profit.symbolName ?? "합계"}
                        </td>
                        <td>{profit.realizedPnl.toLocaleString("ko-KR")}</td>
                        <td>{profit.profitRate === null ? "—" : `${profit.profitRate.toLocaleString("ko-KR")}%`}</td>
                        <td>{formatNullableNumber(profit.buyAmount)}</td>
                        <td>{formatNullableNumber(profit.sellAmount)}</td>
                        <td>{profit.currency ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
