"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadBrokerLedgerStatus,
  loadBrokerLedgerSyncRuns,
  startBrokerLedgerSync,
  type BrokerLedgerMarket,
  type BrokerLedgerStatus,
  type BrokerLedgerSyncRun,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  OperationsControlPanel,
  PageIntroSection,
  SectionHeaderBlock,
} from "@/components/common/page-layout";

type BrokerPageClientProps = {
  initialStatus: BrokerLedgerStatus;
  initialRuns: BrokerLedgerSyncRun[];
};

const marketLabel: Record<BrokerLedgerMarket, string> = {
  domestic: "국내주식",
  overseas: "해외주식",
};

const runStatusLabel: Record<BrokerLedgerSyncRun["status"], string> = {
  queued: "대기",
  running: "실행 중",
  succeeded: "성공",
  failed: "실패",
};

const runStatusChip: Record<BrokerLedgerSyncRun["status"], string> = {
  queued: "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-warning-soft text-warning border border-warning/20",
  running: "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-info-soft text-info border border-info/20",
  succeeded: "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-success-soft text-success border border-success/20",
  failed: "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-error-soft text-error border border-error/20",
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultRange() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);
  return {
    startDate: toDateInputValue(startDate),
    endDate: toDateInputValue(endDate),
  };
}

export function BrokerPageClient({
  initialStatus,
  initialRuns,
}: BrokerPageClientProps) {
  const [status, setStatus] = useState(initialStatus);
  const [runs, setRuns] = useState(initialRuns);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMarkets, setSelectedMarkets] = useState<BrokerLedgerMarket[]>([
    "domestic",
    "overseas",
  ]);
  const [dateRange, setDateRange] = useState(defaultRange);
  const activeRun =
    status.latestSyncRun?.status === "queued" || status.latestSyncRun?.status === "running"
      ? status.latestSyncRun
      : null;
  const activeRunId = activeRun?.id ?? null;
  const activeRunStatus = activeRun?.status ?? null;

  async function refreshStatus() {
    const [nextStatus, nextRuns] = await Promise.all([
      loadBrokerLedgerStatus(),
      loadBrokerLedgerSyncRuns(20),
    ]);
    setStatus(nextStatus);
    setRuns(nextRuns);
  }

  useEffect(() => {
    if (activeRunStatus !== "queued" && activeRunStatus !== "running") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      Promise.all([loadBrokerLedgerStatus(), loadBrokerLedgerSyncRuns(20)])
        .then(([nextStatus, nextRuns]) => {
          setStatus(nextStatus);
          setRuns(nextRuns);
        })
        .catch((refreshError) => {
          setError(
            refreshError instanceof Error
              ? refreshError.message
              : "원장 상태 갱신에 실패했습니다.",
          );
        });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [activeRunId, activeRunStatus]);

  function toggleMarket(market: BrokerLedgerMarket) {
    setSelectedMarkets((current) =>
      current.includes(market)
        ? current.filter((item) => item !== market)
        : [...current, market],
    );
  }

  async function handleStartSync() {
    if (selectedMarkets.length === 0) {
      setError("최소 한 개 시장을 선택하세요.");
      return;
    }
    if (dateRange.startDate > dateRange.endDate) {
      setError("시작일은 종료일보다 늦을 수 없습니다.");
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      await startBrokerLedgerSync({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        markets: selectedMarkets,
      });
      await refreshStatus();
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "원장 동기화 시작에 실패했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const latestRun = status.latestSuccessfulSyncRun;

  return (
    <main className="grid content-start gap-8 w-[min(100%,var(--content-width))] mx-auto px-5 pt-8 pb-16">
      <PageIntroSection
        id="broker-summary"
        eyebrow="Broker"
        title="계좌 원장"
        description="한국투자증권 실전 계좌 원장을 읽기 전용으로 조회합니다."
      />

      <section className="p-5 bg-warning-soft/30 border border-warning/20 rounded-xl">
        <p className="m-0 text-muted text-[0.9375rem] leading-relaxed">
          이 화면은 OpenForge 전략 기록이 아니라 한국투자증권 실전 계좌 원장입니다.
          HTS, MTS, 다른 프로그램에서 발생한 거래도 포함될 수 있습니다.
        </p>
      </section>

      {!status.liveConfigured ? (
        <section className="p-5 bg-error-soft/30 border border-error/20 rounded-xl">
          <p className="m-0 text-muted text-[0.9375rem] leading-relaxed">
            실전 브로커 연결이 설정되지 않았습니다.{" "}
            <Link href="/settings" className="font-semibold text-primary hover:text-primary-hover underline underline-offset-2 transition-colors">
              Settings
            </Link>
            에서 실전 계좌 연결을 먼저 완료하세요.
          </p>
        </section>
      ) : null}

      {error ? (
        <section className="p-5 bg-error-soft border border-error/20 rounded-xl">
          <p className="m-0 text-error font-medium text-[0.9375rem]">{error}</p>
        </section>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 justify-start">
        <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-primary">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">최신 주문/체결</p>
          <p className="m-0 font-sans text-3xl leading-snug font-bold text-foreground">{latestRun?.tradeCount ?? 0}</p>
          <p className="m-0 text-muted text-[0.875rem]">가장 최근 성공 동기화 기준 거래 건수</p>
        </article>
        <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-info">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">최신 잔고 종목</p>
          <p className="m-0 font-sans text-3xl leading-snug font-bold text-foreground">{latestRun?.balanceCount ?? 0}</p>
          <p className="m-0 text-muted text-[0.875rem]">가장 최근 성공 동기화 기준 잔고 종목 수</p>
        </article>
        <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-secondary">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">최신 손익 항목</p>
          <p className="m-0 font-sans text-3xl leading-snug font-bold text-foreground">{latestRun?.profitCount ?? 0}</p>
          <p className="m-0 text-muted text-[0.875rem]">가장 최근 성공 동기화 기준 손익 항목 수</p>
        </article>
      </div>

      <OperationsControlPanel
        id="broker-sync"
        title="수동 동기화"
        description="조회 기간과 시장을 선택해 계좌 원장을 DB에 적재합니다."
      >
        {activeRun ? (
          <div className="flex items-center gap-3 mb-4">
            <span className={runStatusChip[activeRun.status]}>
              {runStatusLabel[activeRun.status]}
            </span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <label className="grid gap-1.5 focus-within:text-primary">
            <span className="text-subtle text-sm font-medium transition-colors">시작일</span>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(event) =>
                setDateRange((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
            />
          </label>
          <label className="grid gap-1.5 focus-within:text-primary">
            <span className="text-subtle text-sm font-medium transition-colors">종료일</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(event) =>
                setDateRange((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
            />
          </label>
        </div>

        <div className="grid gap-2 mt-5">
          <span className="text-subtle text-sm font-medium">시장 선택</span>
          <div className="flex flex-wrap items-center gap-3">
            {(["domestic", "overseas"] as BrokerLedgerMarket[]).map((market) => (
              <button
                key={market}
                type="button"
                className={`inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedMarkets.includes(market) ? "bg-primary-soft text-primary border-primary/20" : "bg-surface text-muted border-border hover:border-gray-300 hover:text-foreground"}`}
                onClick={() => toggleMarket(market)}
              >
                {marketLabel[market]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-border-soft">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            onClick={handleStartSync}
            disabled={!status.liveConfigured || isSubmitting}
          >
            {isSubmitting ? "동기화 시작 중..." : "동기화 시작"}
          </button>
          <Link href="/broker/ledger" className="inline-flex items-center justify-center px-4 py-2 font-medium rounded-lg bg-surface border border-border text-foreground hover:bg-[#fafafa] hover:border-gray-300 shadow-sm transition-all">
            원장 상세 보기
          </Link>
        </div>

        {activeRun ? (
          <div className="flex flex-wrap gap-2 items-center mt-5 p-3 rounded-lg bg-[#fafafa] border border-border-soft text-[0.9375rem]">
            <span className="font-semibold text-muted">현재 실행</span>
            <span className="text-foreground">
              {activeRun.startDate} ~ {activeRun.endDate} /{" "}
              {activeRun.markets.map((market) => marketLabel[market]).join(", ")}
            </span>
          </div>
        ) : null}
      </OperationsControlPanel>

      <section id="broker-sync-runs" className="grid gap-5">
        <SectionHeaderBlock
          title="동기화 이력"
          count={`${runs.length}건`}
          countStrong
          description="최신 동기화부터 순서대로 표시합니다. 원장 상세는 가장 최근 성공 run을 기본으로 사용합니다."
        />

        {runs.length === 0 ? (
          <div className="grid justify-items-center p-12 px-6 border border-dashed border-border rounded-xl text-center bg-surface shadow-sm">
            <p className="m-0 text-foreground font-semibold text-[1.0625rem]">동기화 이력이 없습니다</p>
            <p className="m-0 text-muted max-w-sm text-sm">실전 계좌 원장 동기화를 한 번 실행해 주세요.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {runs.map((run) => (
              <article key={run.id} className="p-5 bg-surface border border-border-soft rounded-xl shadow-sm hover:shadow hover:border-gray-300 transition-all group">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={runStatusChip[run.status]}>
                      {runStatusLabel[run.status]}
                    </span>
                    <span className="text-muted font-mono text-[0.9375rem]">
                      {run.startDate} ~ {run.endDate}
                    </span>
                    <span className="text-subtle text-[0.9375rem]">
                      {run.markets.map((market) => marketLabel[market]).join(", ")}
                    </span>
                  </div>
                  <span className="text-muted text-[0.8125rem]">
                    {formatDateTime(run.completedAt ?? run.startedAt ?? run.requestedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-4 text-[0.9375rem]">
                  <span className="font-semibold text-subtle">건수</span>
                  <span className="text-foreground">
                    거래 <span className="font-mono">{run.tradeCount}</span> / 잔고 <span className="font-mono">{run.balanceCount}</span> / 손익 <span className="font-mono">{run.profitCount}</span>
                  </span>
                </div>
                {run.errorMessage ? (
                  <p className="m-0 mt-3 p-3 bg-error-soft text-error text-[0.9375rem] rounded-md">
                    {run.errorMessage}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
