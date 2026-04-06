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
    <main className="grid content-start gap-8 w-[min(100%,var(--content-width))] mx-auto px-5 pt-8 pb-16">
      <section id="broker-ledger-summary" className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6 mb-2 pb-6 border-b border-border/60">
          <div className="grid gap-2">
            <p className="m-0 text-primary font-bold tracking-wider uppercase text-xs">Broker Ledger</p>
            <h1 className="m-0 font-sans text-3xl font-bold tracking-tight text-foreground">원장 상세</h1>
            <p className="m-0 text-muted text-[0.9375rem] leading-relaxed">
              브로커 원장 기준 주문, 체결, 잔고, 손익 스냅샷을 조회합니다.
            </p>
          </div>
        </div>
      </section>

      <section className="p-4 rounded-xl bg-warning-soft text-warning border border-warning/20 text-[0.9375rem] font-medium flex items-start gap-2 shadow-sm">
        <p className="m-0">
          이 화면은 OpenForge 내부 주문 이력이 아니라 한국투자증권 실전 계좌 원장입니다.
          전략 매핑 없이 계좌 사실 데이터만 보여줍니다.
        </p>
      </section>

      {!initialStatus.liveConfigured ? (
        <section className="p-4 rounded-xl bg-error-soft text-error border border-error/20 text-[0.9375rem] font-medium flex items-start gap-2 shadow-sm">
          <p className="m-0">
            실전 브로커 연결이 설정되지 않았습니다.{" "}
            <Link href="/settings" className="underline font-bold hover:text-red-700">
              Settings
            </Link>
            에서 설정한 뒤 원장 동기화를 실행하세요.
          </p>
        </section>
      ) : null}

      {error ? (
        <section className="p-4 rounded-xl bg-error-soft text-error border border-error/20 text-[0.9375rem] font-medium flex items-start gap-2 shadow-sm">
          <p className="m-0">{error}</p>
        </section>
      ) : null}

      <section id="broker-ledger-filters" className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm grid gap-6">
        <div className="grid gap-2 border-b border-border/40 pb-4 mb-2">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">조회 기준</h2>
          <p className="m-0 text-muted text-[0.9375rem] leading-relaxed">
            가장 최근 성공 동기화를 기본값으로 사용하며, 원하는 run으로 변경할 수 있습니다.
          </p>
        </div>

        {successfulRuns.length === 0 ? (
          <div className="grid justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center shadow-sm bg-surface">
            <p className="m-0 text-foreground font-semibold text-[1.0625rem]">성공한 동기화 run이 없습니다</p>
            <p className="m-0 text-muted max-w-sm text-[0.9375rem] mt-2">
              <Link href="/broker" className="text-primary hover:underline font-medium">
                Broker
              </Link>
              에서 원장 동기화를 먼저 실행하세요.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 items-center bg-[#fafafa] p-4 rounded-xl border border-border-soft">
              <label className="grid gap-1">
                <span className="text-subtle text-xs font-semibold tracking-wider uppercase">동기화 run</span>
                <select
                  value={selectedRunId}
                  onChange={(event) => setSelectedRunId(event.target.value)}
                  className="px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all cursor-pointer min-w-[200px]"
                >
                  {successfulRuns.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.startDate} ~ {run.endDate} / {formatDateTime(run.completedAt ?? run.requestedAt)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-subtle text-xs font-semibold tracking-wider uppercase">시장</span>
                <select
                  value={marketFilter ?? ""}
                  onChange={(event) =>
                    setMarketFilter(
                      event.target.value
                        ? (event.target.value as BrokerLedgerMarket)
                        : null,
                    )
                  }
                  className="px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all cursor-pointer min-w-[120px]"
                >
                  <option value="">전체</option>
                  <option value="domestic">국내주식</option>
                  <option value="overseas">해외주식</option>
                </select>
              </label>
            </div>

            <div className="flex bg-surface border border-border-soft rounded-lg p-1.5 shadow-sm max-w-fit">
              {[
                ["all", "전체"],
                ["trades", "거래 원장"],
                ["balances", "잔고 스냅샷"],
                ["profits", "손익 스냅샷"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`px-4 py-2 font-medium text-sm rounded-md transition-all ${
                    dataFilter === value
                      ? "bg-primary text-white shadow"
                      : "text-muted hover:text-foreground hover:bg-slate-50"
                  }`}
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
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 justify-start mt-2">
                <article className="grid gap-2 p-5 border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-l-primary">
                  <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">거래 원장</p>
                  <p className="m-0 font-sans text-3xl font-bold text-foreground">{selectedRun.tradeCount}</p>
                  <p className="m-0 text-muted text-[0.875rem]">선택한 동기화 run 기준 거래 건수</p>
                </article>
                <article className="grid gap-2 p-5 border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-l-info">
                  <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">잔고 스냅샷</p>
                  <p className="m-0 font-sans text-3xl font-bold text-foreground">{selectedRun.balanceCount}</p>
                  <p className="m-0 text-muted text-[0.875rem]">선택한 동기화 run 기준 잔고 종목 수</p>
                </article>
                <article className="grid gap-2 p-5 border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-l-teal-500">
                  <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">손익 스냅샷</p>
                  <p className="m-0 font-sans text-3xl font-bold text-foreground">{selectedRun.profitCount}</p>
                  <p className="m-0 text-muted text-[0.875rem]">선택한 동기화 run 기준 손익 항목 수</p>
                </article>
              </div>
            ) : null}
          </>
        )}
      </section>

      {showTrades ? (
        <section id="broker-ledger-trades" className="grid gap-4">
          <div className="flex items-center gap-3">
            <h2 className="m-0 font-sans text-xl font-bold text-foreground">거래 원장</h2>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm font-mono text-xs font-semibold bg-border-soft text-foreground border border-border">{trades.length}건</span>
          </div>
          {trades.length === 0 ? (
            <div className="grid justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center shadow-sm bg-surface">
              <p className="m-0 text-foreground font-semibold text-[1.0625rem]">조회된 거래 원장 데이터가 없습니다</p>
            </div>
          ) : (
            <div className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm overflow-hidden">
              <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
                <table className="w-full text-left border-collapse text-[0.9375rem] whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-border/80">
                      <th className="py-3 px-2 font-semibold text-slate-800">시장</th>
                      <th className="py-3 px-2 font-semibold text-slate-800">심볼</th>
                      <th className="py-3 px-2 font-semibold text-slate-800">방향</th>
                      <th className="py-3 px-2 font-semibold text-slate-800">상태</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-right">주문수량</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-right">체결수량</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-right">체결가</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-right">시각</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {trades.map((trade) => (
                      <tr key={trade.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-2 text-slate-600">{marketLabel[trade.market]}</td>
                        <td className="py-3 px-2 font-semibold text-foreground">
                          {trade.symbol ?? trade.symbolName ?? "—"}
                        </td>
                        <td className="py-3 px-2 text-slate-600">{trade.side ?? "—"}</td>
                        <td className="py-3 px-2 text-slate-600">{trade.orderStatus ?? "—"}</td>
                        <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(trade.quantity)}</td>
                        <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(trade.filledQuantity)}</td>
                        <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(trade.price)}</td>
                        <td className="py-3 px-2 text-slate-500 font-mono text-right text-xs">{formatDateTime(trade.capturedAt) ?? "—"}</td>
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
        <section id="broker-ledger-balances" className="grid gap-4">
          <div className="flex items-center gap-3">
            <h2 className="m-0 font-sans text-xl font-bold text-foreground">잔고 스냅샷</h2>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm font-mono text-xs font-semibold bg-border-soft text-foreground border border-border">{balances.length}건</span>
          </div>
          {balances.length === 0 ? (
            <div className="grid justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center shadow-sm bg-surface">
              <p className="m-0 text-foreground font-semibold text-[1.0625rem]">조회된 잔고 데이터가 없습니다</p>
            </div>
          ) : (
            <div className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm overflow-hidden">
              <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
                <table className="w-full text-left border-collapse text-[0.9375rem] whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-border/80">
                      <th className="py-3 px-2 font-semibold text-slate-800">시장</th>
                      <th className="py-3 px-2 font-semibold text-slate-800">심볼</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-right">보유수량</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-right">현재가</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-right">평균단가</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-right">평가금액</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-right">평가손익</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-right">기준시각</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {balances.map((balance) => (
                      <tr key={balance.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-2 text-slate-600">{marketLabel[balance.market]}</td>
                        <td className="py-3 px-2 font-semibold text-foreground">
                          {balance.symbol ?? balance.symbolName ?? "—"}
                        </td>
                        <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(balance.quantity)}</td>
                        <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(balance.currentPrice)}</td>
                        <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(balance.averagePrice)}</td>
                        <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(balance.valuationAmount)}</td>
                        <td className={`py-3 px-2 font-mono text-right font-medium ${balance.unrealizedPnl && balance.unrealizedPnl > 0 ? 'text-rose-600' : balance.unrealizedPnl && balance.unrealizedPnl < 0 ? 'text-blue-600' : 'text-slate-600'}`}>{formatNullableNumber(balance.unrealizedPnl)}</td>
                        <td className="py-3 px-2 text-slate-500 font-mono text-right text-xs">{formatDateTime(balance.capturedAt) ?? "—"}</td>
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
        <section id="broker-ledger-profits" className="grid gap-4">
          <div className="flex items-center gap-3">
            <h2 className="m-0 font-sans text-xl font-bold text-foreground">손익 스냅샷</h2>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm font-mono text-xs font-semibold bg-border-soft text-foreground border border-border">{profits.length}건</span>
          </div>
          {profits.length === 0 ? (
            <div className="grid justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center shadow-sm bg-surface">
              <p className="m-0 text-foreground font-semibold text-[1.0625rem]">조회된 손익 데이터가 없습니다</p>
            </div>
          ) : (
            <div className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm overflow-hidden">
              <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
                <table className="w-full text-left border-collapse text-[0.9375rem] whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-border/80">
                      <th className="py-3 px-2 font-semibold text-slate-800">시장</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-left">기준시각</th>
                      <th className="py-3 px-2 font-semibold text-slate-800">심볼</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-right">실현손익</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-right">손익률</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-right">매수금액</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-right">매도금액</th>
                      <th className="py-3 px-2 font-semibold text-slate-800 text-center">통화</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {profits.map((profit) => (
                      <tr key={profit.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-2 text-slate-600">{marketLabel[profit.market]}</td>
                        <td className="py-3 px-2 text-slate-500 font-mono text-xs text-left">{formatDateTime(profit.capturedAt) ?? "—"}</td>
                        <td className="py-3 px-2 font-semibold text-foreground">
                          {profit.symbol ?? profit.symbolName ?? "합계"}
                        </td>
                        <td className={`py-3 px-2 font-mono text-right font-medium ${profit.realizedPnl > 0 ? 'text-rose-600' : profit.realizedPnl < 0 ? 'text-blue-600' : 'text-slate-600'}`}>{profit.realizedPnl.toLocaleString("ko-KR")}</td>
                        <td className={`py-3 px-2 font-mono text-right font-medium ${profit.profitRate && profit.profitRate > 0 ? 'text-rose-600' : profit.profitRate && profit.profitRate < 0 ? 'text-blue-600' : 'text-slate-600'}`}>{profit.profitRate === null ? "—" : `${profit.profitRate.toLocaleString("ko-KR")}%`}</td>
                        <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(profit.buyAmount)}</td>
                        <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(profit.sellAmount)}</td>
                        <td className="py-3 px-2 text-slate-600 font-mono text-center">{profit.currency ?? "—"}</td>
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
