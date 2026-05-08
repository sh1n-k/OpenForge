import { StrategyDetailClient } from "@/components/strategies/strategy-detail-client";
import {
  loadStrategyOrderCandidates,
  loadStrategyOrderRequestsWithEvents,
  loadStrategyFills,
  loadStrategy,
  loadStrategyExecution,
  loadStrategyExecutionRuns,
  loadStrategyPositions,
  loadStrategyRisk,
  loadStrategyRiskEvents,
  loadStrategySignals,
  loadStrategyVersions,
  loadUniverses,
} from "@/lib/api";

type StrategyDetailPageProps = {
  params: Promise<{
    strategyId: string;
  }>;
};

export default async function StrategyDetailPage({
  params,
}: StrategyDetailPageProps) {
  const { strategyId } = await params;
  const orderRequestsWithEventsPromise = loadStrategyOrderRequestsWithEvents(strategyId).catch(
    () => [],
  );
  const [
    strategy,
    versions,
    universes,
    execution,
    runs,
    signals,
    orderCandidates,
    orderRequestsWithEvents,
    riskConfig,
    riskEvents,
  ] = await Promise.all([
    loadStrategy(strategyId),
    loadStrategyVersions(strategyId),
    loadUniverses(),
    loadStrategyExecution(strategyId),
    loadStrategyExecutionRuns(strategyId),
    loadStrategySignals(strategyId),
    loadStrategyOrderCandidates(strategyId),
    orderRequestsWithEventsPromise,
    loadStrategyRisk(strategyId),
    loadStrategyRiskEvents(strategyId),
  ]);
  const [fills, positions] = await Promise.all([
    loadStrategyFills(strategyId),
    loadStrategyPositions(strategyId),
  ]);
  const orderRequests = orderRequestsWithEvents.map((entry) => entry.orderRequest);
  const statusEventsByRequestId = Object.fromEntries(
    orderRequestsWithEvents.map((entry) => [entry.orderRequest.id, entry.statusEvents] as const),
  );

  return (
    <StrategyDetailClient
      strategy={strategy}
      versions={versions}
      universes={universes}
      execution={execution}
      runs={runs}
      signals={signals}
      orderCandidates={orderCandidates}
      orderRequests={orderRequests}
      riskConfig={riskConfig}
      riskEvents={riskEvents}
      fills={fills}
      positions={positions}
      statusEventsByRequestId={statusEventsByRequestId}
    />
  );
}
