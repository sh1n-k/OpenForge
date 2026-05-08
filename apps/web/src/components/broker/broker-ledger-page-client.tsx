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
import {
  BrokerLedgerFiltersSection,
  type BrokerLedgerDataFilter,
} from "./broker-ledger-filters-section";
import { BrokerLedgerTradesTable } from "./broker-ledger-trades-table";
import { BrokerLedgerBalancesTable } from "./broker-ledger-balances-table";
import { BrokerLedgerProfitsTable } from "./broker-ledger-profits-table";

type BrokerLedgerPageClientProps = {
  initialStatus: BrokerLedgerStatus;
  initialRuns: BrokerLedgerSyncRun[];
  initialTrades: BrokerLedgerTrade[];
  initialBalances: BrokerLedgerBalance[];
  initialProfits: BrokerLedgerProfit[];
};

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
  const [dataFilter, setDataFilter] = useState<BrokerLedgerDataFilter>("all");
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

      <BrokerLedgerFiltersSection
        successfulRuns={successfulRuns}
        selectedRunId={selectedRunId}
        onSelectedRunIdChange={setSelectedRunId}
        marketFilter={marketFilter}
        onMarketFilterChange={setMarketFilter}
        dataFilter={dataFilter}
        onDataFilterChange={setDataFilter}
        selectedRun={selectedRun}
      />

      {showTrades ? <BrokerLedgerTradesTable trades={trades} /> : null}
      {showBalances ? <BrokerLedgerBalancesTable balances={balances} /> : null}
      {showProfits ? <BrokerLedgerProfitsTable profits={profits} /> : null}
    </main>
  );
}
