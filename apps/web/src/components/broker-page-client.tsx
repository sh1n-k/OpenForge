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
} from "@/components/page-layout";

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
  queued: "status-chip status-chip-warning",
  running: "status-chip status-chip-info",
  succeeded: "status-chip status-chip-success",
  failed: "status-chip status-chip-error",
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
    <main className="page-shell docs-page-shell page-shell-operations">
      <PageIntroSection
        id="broker-summary"
        eyebrow="Broker"
        title="계좌 원장"
        description="한국투자증권 실전 계좌 원장을 읽기 전용으로 조회합니다."
      />

      <section className="doc-panel doc-panel-warn doc-panel-compact">
        <p className="section-copy doc-panel-copy">
          이 화면은 OpenForge 전략 기록이 아니라 한국투자증권 실전 계좌 원장입니다.
          HTS, MTS, 다른 프로그램에서 발생한 거래도 포함될 수 있습니다.
        </p>
      </section>

      {!status.liveConfigured ? (
        <section className="doc-panel doc-panel-error doc-panel-compact">
          <p className="section-copy doc-panel-copy">
            실전 브로커 연결이 설정되지 않았습니다.{" "}
            <Link href="/settings" className="table-link">
              Settings
            </Link>
            에서 실전 계좌 연결을 먼저 완료하세요.
          </p>
        </section>
      ) : null}

      {error ? (
        <section className="doc-panel doc-panel-error doc-panel-compact">
          <p className="section-copy doc-panel-copy">{error}</p>
        </section>
      ) : null}

      <div className="summary-grid summary-grid-metrics">
        <article className="metric-card metric-card-accent-primary">
          <p className="metric-card-label">최신 주문/체결</p>
          <p className="metric-card-value">{latestRun?.tradeCount ?? 0}</p>
          <p className="metric-card-copy">가장 최근 성공 동기화 기준 거래 건수</p>
        </article>
        <article className="metric-card metric-card-accent-info">
          <p className="metric-card-label">최신 잔고 종목</p>
          <p className="metric-card-value">{latestRun?.balanceCount ?? 0}</p>
          <p className="metric-card-copy">가장 최근 성공 동기화 기준 잔고 종목 수</p>
        </article>
        <article className="metric-card metric-card-accent-secondary">
          <p className="metric-card-label">최신 손익 항목</p>
          <p className="metric-card-value">{latestRun?.profitCount ?? 0}</p>
          <p className="metric-card-copy">가장 최근 성공 동기화 기준 손익 항목 수</p>
        </article>
      </div>

      <OperationsControlPanel
        id="broker-sync"
        className="operations-control-panel"
        title="수동 동기화"
        description="조회 기간과 시장을 선택해 계좌 원장을 DB에 적재합니다."
      >
        {activeRun ? (
          <div className="page-actions">
            <span className={runStatusChip[activeRun.status]}>
              {runStatusLabel[activeRun.status]}
            </span>
          </div>
        ) : null}

        <div className="form-row broker-sync-dates">
          <label className="form-field">
            <span className="form-label">시작일</span>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(event) =>
                setDateRange((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
            />
          </label>
          <label className="form-field">
            <span className="form-label">종료일</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(event) =>
                setDateRange((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <div className="filter-bar broker-sync-markets">
          <span className="form-label">시장 선택</span>
          {(["domestic", "overseas"] as BrokerLedgerMarket[]).map((market) => (
            <button
              key={market}
              type="button"
              className={
                selectedMarkets.includes(market)
                  ? "status-chip status-chip-info"
                  : "status-chip"
              }
              onClick={() => toggleMarket(market)}
            >
              {marketLabel[market]}
            </button>
          ))}
        </div>

        <div className="page-actions broker-sync-actions">
          <button
            type="button"
            className="button-primary"
            onClick={handleStartSync}
            disabled={!status.liveConfigured || isSubmitting}
          >
            {isSubmitting ? "동기화 시작 중..." : "동기화 시작"}
          </button>
          <Link href="/broker/ledger" className="button-secondary">
            원장 상세 보기
          </Link>
        </div>

        {activeRun ? (
          <div className="detail-row broker-sync-current">
            <span className="detail-label">현재 실행</span>
            <span className="detail-value">
              {activeRun.startDate} ~ {activeRun.endDate} /{" "}
              {activeRun.markets.map((market) => marketLabel[market]).join(", ")}
            </span>
          </div>
        ) : null}
      </OperationsControlPanel>

      <section id="broker-sync-runs">
        <SectionHeaderBlock
          title="동기화 이력"
          count={`${runs.length}건`}
          countStrong
          description="최신 동기화부터 순서대로 표시합니다. 원장 상세는 가장 최근 성공 run을 기본으로 사용합니다."
        />

        {runs.length === 0 ? (
          <div className="empty-state empty-state-compact">
            <p className="empty-state-message">동기화 이력이 없습니다</p>
            <p className="empty-state-hint">실전 계좌 원장 동기화를 한 번 실행해 주세요.</p>
          </div>
        ) : (
          <div className="stack-list">
            {runs.map((run) => (
              <article key={run.id} className="list-card">
                <div className="flex-between">
                  <div className="flex-center">
                    <span className={runStatusChip[run.status]}>
                      {runStatusLabel[run.status]}
                    </span>
                    <span className="text-muted">
                      {run.startDate} ~ {run.endDate}
                    </span>
                    <span className="text-subtle">
                      {run.markets.map((market) => marketLabel[market]).join(", ")}
                    </span>
                  </div>
                  <span className="text-subtle-xs">
                    {formatDateTime(run.completedAt ?? run.startedAt ?? run.requestedAt)}
                  </span>
                </div>
                <div className="detail-row section-stack-top-sm">
                  <span className="detail-label">건수</span>
                  <span className="detail-value">
                    거래 {run.tradeCount} / 잔고 {run.balanceCount} / 손익 {run.profitCount}
                  </span>
                </div>
                {run.errorMessage ? (
                  <p className="section-copy text-error">
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
