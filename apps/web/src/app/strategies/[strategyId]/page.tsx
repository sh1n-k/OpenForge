import { StrategyDetailClient } from "@/components/strategy-detail-client";
import {
  loadStrategy,
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
  const [strategy, versions, universes] = await Promise.all([
    loadStrategy(strategyId),
    loadStrategyVersions(strategyId),
    loadUniverses(),
  ]);

  return (
    <StrategyDetailClient
      strategy={strategy}
      versions={versions}
      universes={universes}
    />
  );
}

