"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import type {
  StrategyDetail,
  StrategyExecutionResponse,
  OrderCandidate,
  OrderFill,
  OrderRequest,
  OrderStatusEvent,
  StrategyRiskConfig,
  StrategyRiskEvent,
  StrategyExecutionRun,
  StrategySignalEvent,
  StrategyPosition,
  StrategyVersion,
  UniverseSummary,
} from "@/lib/api";
import { archiveStrategy, cloneStrategy } from "@/lib/api";
import { StrategyExecutionSection } from "@/components/strategy-execution-section";
import { StrategyInfoPanel } from "@/components/strategy-overview-section";
import { StrategyRiskSection } from "@/components/strategy-risk-section";
import { StrategyVersionsSection } from "@/components/strategy-versions-section";
import { StrategyOrdersSection } from "@/components/strategy-orders-section";
import { StrategyActivitySection } from "@/components/strategy-activity-section";
import { formatDateTime } from "@/lib/format";

const strategyStatusLabel: Record<string, string> = {
  running: "실행 중",
  stopped: "중지",
  draft: "초안",
  backtest_completed: "백테스트 완료",
};

const strategyTypeLabel: Record<string, string> = {
  builder: "빌더형",
  code: "코드형",
};

const executionModeLabel: Record<string, string> = {
  paper: "모의투자",
  live: "실전투자",
};

const validationStatusLabel: Record<string, string> = {
  valid: "검증 통과",
  invalid: "검증 실패",
  invalid_legacy_draft: "레거시 초안",
};

type StrategyDetailClientProps = {
  strategy: StrategyDetail;
  versions: StrategyVersion[];
  universes: UniverseSummary[];
  execution: StrategyExecutionResponse;
  runs: StrategyExecutionRun[];
  signals: StrategySignalEvent[];
  orderCandidates: OrderCandidate[];
  orderRequests: OrderRequest[];
  riskConfig: StrategyRiskConfig;
  riskEvents: StrategyRiskEvent[];
  fills: OrderFill[];
  positions: StrategyPosition[];
  statusEventsByRequestId: Record<string, OrderStatusEvent[]>;
};

export function StrategyDetailClient({
  strategy,
  versions,
  universes,
  execution,
  runs,
  signals,
  orderCandidates,
  orderRequests,
  riskConfig,
  riskEvents,
  fills,
  positions,
  statusEventsByRequestId,
}: StrategyDetailClientProps) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const hasOverseasUniverses = strategy.universes.some((universe) => universe.marketScope === "us");

  async function handleClone() {
    try {
      setActionError(null);
      await cloneStrategy(strategy.id);
      startTransition(() => router.push("/strategies"));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "전략 복제에 실패했습니다.");
    }
  }

  async function handleArchive() {
    try {
      setActionError(null);
      await archiveStrategy(strategy.id);
      startTransition(() => router.push("/strategies"));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "전략 보관에 실패했습니다.");
    }
  }

  return (
    <main className="page-shell docs-page-shell">
      <section className="doc-panel">
        <div className="page-intro-row">
          <div className="page-intro">
            <p className="page-eyebrow">전략 작업대</p>
            <h1 className="page-title">{strategy.name}</h1>
            <p className="page-description">
              실행 상태를 먼저 보고, 아래에서 리스크, 버전, 주문, 실행 로그를 이어서 확인합니다.
            </p>
          </div>
          <div className="page-actions">
            <span
              className={
                strategy.status === "running"
                  ? "status-chip status-chip-success"
                  : strategy.status === "stopped"
                    ? "status-chip status-chip-warning"
                    : strategy.status === "backtest_completed"
                    ? "status-chip status-chip-info"
                      : "status-chip"
              }
            >
              {strategyStatusLabel[strategy.status] ?? strategy.status}
            </span>
            <span className="status-chip status-chip-info">
              {strategyTypeLabel[strategy.strategyType] ?? strategy.strategyType}
            </span>
            <span
              className={
                strategy.latestValidationStatus === "valid"
                  ? "status-chip status-chip-success"
                  : strategy.latestValidationStatus === "invalid"
                    ? "status-chip status-chip-error"
                  : "status-chip status-chip-info"
              }
            >
              {validationStatusLabel[strategy.latestValidationStatus ?? ""] ?? strategy.latestValidationStatus ?? "미검증"}
            </span>
          </div>
        </div>

        <div className="summary-grid summary-grid-columns-3" style={{ marginTop: 16 }}>
          <article className="metric-card metric-card-accent-primary">
            <p className="metric-card-label">버전</p>
            <p className="metric-card-value">v{strategy.latestVersionNumber ?? 0}</p>
            <p className="metric-card-copy">총 {strategy.versionCount}개 버전</p>
          </article>
          <article className="metric-card metric-card-accent-info">
            <p className="metric-card-label">실행 모드</p>
            <p className="metric-card-value">
              {executionModeLabel[execution.mode] ?? execution.mode}
            </p>
            <p className="metric-card-copy">
              {execution.nextRunAt ? formatDateTime(execution.nextRunAt) : "다음 실행 대기 중"}
            </p>
          </article>
          <article className="metric-card metric-card-accent-secondary">
            <p className="metric-card-label">유니버스</p>
            <p className="metric-card-value">{strategy.universeCount}</p>
            <p className="metric-card-copy">
              {hasOverseasUniverses ? "해외 유니버스 포함" : "국내 유니버스만 연결"}
            </p>
          </article>
        </div>

        <div className="summary-grid summary-grid-columns-2" style={{ marginTop: 16 }}>
          <div className="stack-list">
            <div className="detail-row">
              <span className="detail-label">현재 상태</span>
              <span className="detail-value">
                {strategyStatusLabel[strategy.status] ?? strategy.status}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">최신 검증</span>
              <span className="detail-value">
                {validationStatusLabel[strategy.latestValidationStatus ?? ""] ?? strategy.latestValidationStatus ?? "미검증"}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">다음 실행</span>
              <span className="detail-value">
                {execution.nextRunAt ? formatDateTime(execution.nextRunAt) : "대기 중"}
              </span>
            </div>
          </div>

          <div className="stack-list">
            <div className="detail-row">
              <span className="detail-label">최근 실행 모드</span>
              <span className="detail-value">
                {executionModeLabel[execution.mode] ?? execution.mode}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">버전 수</span>
              <span className="detail-value">{strategy.versionCount}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">검증 상태</span>
              <span className="detail-value">
                {validationStatusLabel[strategy.latestValidationStatus ?? ""] ?? strategy.latestValidationStatus ?? "미검증"}
              </span>
            </div>
          </div>
        </div>

        {actionError ? (
          <div className="doc-panel doc-panel-error" style={{ marginTop: 16 }}>
            <p className="section-copy">{actionError}</p>
          </div>
        ) : null}

        <div className="page-actions" style={{ marginTop: 16 }}>
          <Link
            href={`/strategies/${strategy.id}/backtest`}
            className="button-secondary"
          >
            백테스트 열기
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

      <section className="summary-grid summary-grid-columns-2">
        <StrategyExecutionSection
          strategyId={strategy.id}
          execution={execution}
          hasOverseasUniverses={hasOverseasUniverses}
        />
        <StrategyInfoPanel strategy={strategy} />
      </section>

      <StrategyRiskSection
        strategyId={strategy.id}
        riskConfig={riskConfig}
        riskEvents={riskEvents}
      />

      <StrategyVersionsSection
        key={strategy.universes.map((u) => u.id).join(",")}
        strategy={strategy}
        versions={versions}
        universes={universes}
      />

      <StrategyOrdersSection
        strategyId={strategy.id}
        orderCandidates={orderCandidates}
        orderRequests={orderRequests}
        fills={fills}
        positions={positions}
        statusEventsByRequestId={statusEventsByRequestId}
      />

      <StrategyActivitySection runs={runs} signals={signals} />
    </main>
  );
}
