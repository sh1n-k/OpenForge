"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  archiveStrategy,
  cloneStrategy,
  type StrategyDetail,
  type StrategyExecutionResponse,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const statusLabel: Record<string, string> = {
  running: "실행 중",
  stopped: "중지",
  draft: "초안",
  backtest_completed: "백테스트 완료",
};

const statusChip: Record<string, string> = {
  running: "status-chip status-chip-success",
  stopped: "status-chip status-chip-warning",
  draft: "status-chip",
  backtest_completed: "status-chip status-chip-info",
};

const typeLabel: Record<string, string> = {
  builder: "빌더형",
  code: "코드형",
};

type OverviewHeaderProps = {
  strategy: StrategyDetail;
  execution: StrategyExecutionResponse;
};

export function StrategyOverviewHeader({ strategy, execution }: OverviewHeaderProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleClone() {
    try {
      setError(null);
      await cloneStrategy(strategy.id);
      startTransition(() => router.push("/strategies"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "전략 복제에 실패했습니다.");
    }
  }

  async function handleArchive() {
    try {
      setError(null);
      await archiveStrategy(strategy.id);
      startTransition(() => router.push("/strategies"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "전략 보관에 실패했습니다.");
    }
  }

  return (
    <section
      id="strategy-overview"
      className="doc-panel"
    >
      <div className="page-intro-row">
        <div className="page-intro">
          <p className="page-eyebrow">전략 상세</p>
          <h1 className="page-title">{strategy.name}</h1>
          <p className="page-description">
            {typeLabel[strategy.strategyType] ?? strategy.strategyType} / {statusLabel[strategy.status] ?? strategy.status} / 최신 v
            {strategy.latestVersionNumber ?? 0}
          </p>
        </div>
        <span className={statusChip[strategy.latestValidationStatus ?? ""] ?? "status-chip status-chip-info"}>
          {strategy.latestValidationStatus ?? "미검증"}
        </span>
      </div>

      <div className="summary-grid summary-grid-columns-3" style={{ marginTop: 16 }}>
        <div className="metric-card">
          <p className="metric-card-label">버전 수</p>
          <p className="metric-card-value">{strategy.versionCount}</p>
        </div>
        <div className="metric-card">
          <p className="metric-card-label">유니버스</p>
          <p className="metric-card-value">{strategy.universeCount}</p>
        </div>
        <div className="metric-card">
          <p className="metric-card-label">현재 상태</p>
          <p className="metric-card-value">{statusLabel[strategy.status] ?? strategy.status}</p>
        </div>
      </div>

      <div className="stack-list" style={{ marginTop: 16 }}>
        <div className="detail-row">
          <span className="detail-label">최신 검증</span>
          <span className="detail-value">{strategy.latestValidationStatus ?? "미검증"}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">실행 모드</span>
          <span className="detail-value">{execution.mode}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">다음 실행</span>
          <span className="detail-value">{formatDateTime(execution.nextRunAt) ?? "대기 중"}</span>
        </div>
      </div>

      {error ? (
        <div className="doc-panel doc-panel-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      ) : null}

      <div className="page-actions" style={{ marginTop: 16 }}>
        <Link
          href={`/strategies/${strategy.id}/backtest`}
          className="button-secondary"
        >
          백테스트
        </Link>
        <Link
          href={`/strategies/${strategy.id}/edit`}
          className="button-primary"
        >
          편집기 열기
        </Link>
        <button
          type="button"
          onClick={handleClone}
          className="button-secondary"
        >
          복제
        </button>
        <button
          type="button"
          onClick={handleArchive}
          className="button-danger"
        >
          보관
        </button>
      </div>
    </section>
  );
}

type InfoPanelProps = {
  strategy: StrategyDetail;
};

export function StrategyInfoPanel({ strategy }: InfoPanelProps) {
  return (
    <section className="doc-panel">
      <h2 className="detail-heading">개요</h2>
      <div className="stack-list" style={{ marginTop: 16 }}>
        <div>
          <p className="detail-label">설명</p>
          <p className="detail-value">{strategy.description ?? "설명 없음"}</p>
        </div>
        <div>
          <p className="detail-label">검증 상태</p>
          <p className="detail-value">{strategy.latestValidationStatus ?? "미검증"}</p>
        </div>
        <div>
          <p className="detail-label">버전 수</p>
          <p className="detail-value">{strategy.versionCount}</p>
        </div>
        <div>
          <p className="detail-label">현재 상태</p>
          <p className="detail-value">{statusLabel[strategy.status] ?? strategy.status}</p>
        </div>
      </div>
      {strategy.latestValidationErrors.length > 0 ? (
        <div className="doc-panel doc-panel-error" style={{ marginTop: 16 }}>
          {strategy.latestValidationErrors.map((item, index) => (
            <p key={`${item.category}-${index}`} className="inline-error">
              [{item.category}] {item.message}
            </p>
          ))}
        </div>
      ) : null}
      {strategy.latestValidationWarnings.length > 0 ? (
        <div className="doc-panel doc-panel-warn" style={{ marginTop: 16 }}>
          {strategy.latestValidationWarnings.map((item, index) => (
            <p key={`${item.category}-${index}`} className="inline-warning">
              [{item.category}] {item.message}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
