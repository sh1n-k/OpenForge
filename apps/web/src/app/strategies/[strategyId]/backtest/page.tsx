import { BacktestRunnerClient } from "@/components/backtest/backtest-runner-client";
import {
  loadStrategy,
  loadStrategyBacktests,
  loadStrategyVersions,
  loadUniverse,
} from "@/lib/api";

type StrategyBacktestPageProps = {
  params: Promise<{
    strategyId: string;
  }>;
};

export default async function StrategyBacktestPage({
  params,
}: StrategyBacktestPageProps) {
  const { strategyId } = await params;
  const [strategy, versions, runs] = await Promise.all([
    loadStrategy(strategyId),
    loadStrategyVersions(strategyId),
    loadStrategyBacktests(strategyId),
  ]);
  const linkedUniverses = await Promise.all(
    strategy.universes.map((universe) => loadUniverse(universe.id)),
  );

  return (
    <BacktestRunnerClient
      strategy={strategy}
      versions={versions}
      linkedUniverses={linkedUniverses}
      runs={runs}
    />
  );
}
