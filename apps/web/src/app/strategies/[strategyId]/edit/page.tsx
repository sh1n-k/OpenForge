import { StrategyEditorClient } from "@/components/strategy-editor-client";
import { loadStrategy } from "@/lib/api";

type StrategyEditorPageProps = {
  params: Promise<{
    strategyId: string;
  }>;
};

export default async function StrategyEditorPage({
  params,
}: StrategyEditorPageProps) {
  const { strategyId } = await params;
  const strategy = await loadStrategy(strategyId);

  return <StrategyEditorClient strategy={strategy} />;
}
