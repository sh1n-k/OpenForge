"use client";

import Link from "next/link";
import type {
  BrokerLedgerMarket,
  BrokerLedgerSyncRun,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";

export type BrokerLedgerDataFilter = "all" | "trades" | "balances" | "profits";

type BrokerLedgerFiltersSectionProps = {
  successfulRuns: BrokerLedgerSyncRun[];
  selectedRunId: string;
  onSelectedRunIdChange: (runId: string) => void;
  marketFilter: BrokerLedgerMarket | null;
  onMarketFilterChange: (market: BrokerLedgerMarket | null) => void;
  dataFilter: BrokerLedgerDataFilter;
  onDataFilterChange: (filter: BrokerLedgerDataFilter) => void;
  selectedRun: BrokerLedgerSyncRun | null;
};

export function BrokerLedgerFiltersSection({
  successfulRuns,
  selectedRunId,
  onSelectedRunIdChange,
  marketFilter,
  onMarketFilterChange,
  dataFilter,
  onDataFilterChange,
  selectedRun,
}: BrokerLedgerFiltersSectionProps) {
  return (
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
                onChange={(event) => onSelectedRunIdChange(event.target.value)}
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
                  onMarketFilterChange(
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
                  onDataFilterChange(value as BrokerLedgerDataFilter)
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
  );
}
