import { StrategyDetailClient } from "@/components/strategy-detail-client";
import {
  loadStrategyOrderCandidates,
  loadStrategyOrderStatusEvents,
  loadStrategyOrderRequests,
  loadStrategyFills,
  loadStrategy,
  loadStrategyExecution,
  loadStrategyExecutionRuns,
  loadStrategyPositions,
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
  const [
    strategy,
    versions,
    universes,
    execution,
    runs,
    signals,
    orderCandidates,
    orderRequests,
  ] = await Promise.all([
    loadStrategy(strategyId),
    loadStrategyVersions(strategyId),
    loadUniverses(),
    loadStrategyExecution(strategyId),
    loadStrategyExecutionRuns(strategyId),
    loadStrategySignals(strategyId),
    loadStrategyOrderCandidates(strategyId),
    loadStrategyOrderRequests(strategyId),
  ]);
  const [fills, positions] = await Promise.all([
    loadStrategyFills(strategyId),
    loadStrategyPositions(strategyId),
  ]);
  const statusEventsByRequestId = Object.fromEntries(
    await Promise.all(
      orderRequests.map(async (request) => [
        request.id,
        await loadStrategyOrderStatusEvents(strategyId, request.id),
      ] as const),
    ),
  ) as Record<string, Awaited<ReturnType<typeof loadStrategyOrderStatusEvents>>>;

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
      fills={fills}
      positions={positions}
      statusEventsByRequestId={statusEventsByRequestId}
    />
  );
}
