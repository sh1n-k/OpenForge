"use client";

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
import { StrategyOverviewHeader, StrategyInfoPanel } from "@/components/strategy-overview-section";
import { StrategyExecutionSection } from "@/components/strategy-execution-section";
import { StrategyRiskSection } from "@/components/strategy-risk-section";
import { StrategyVersionsSection } from "@/components/strategy-versions-section";
import { StrategyOrdersSection } from "@/components/strategy-orders-section";
import { StrategyActivitySection } from "@/components/strategy-activity-section";

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
  const hasOverseasUniverses = strategy.universes.some((universe) => universe.marketScope === "us");

  return (
    <main className="page-shell docs-page-shell page-shell-detail">
      <StrategyOverviewHeader strategy={strategy} execution={execution} />

      <section className="summary-grid summary-grid-columns-2">
        <StrategyInfoPanel strategy={strategy} />
        <StrategyExecutionSection
          strategyId={strategy.id}
          execution={execution}
          hasOverseasUniverses={hasOverseasUniverses}
        />
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
