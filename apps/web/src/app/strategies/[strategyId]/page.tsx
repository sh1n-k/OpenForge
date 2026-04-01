import { StrategyDetailClient } from "@/components/strategy-detail-client";
import {
  loadStrategyOrderCandidates,
  loadStrategyOrderRequests,
  loadStrategy,
  loadStrategyExecution,
  loadStrategyExecutionRuns,
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
    />
  );
}
