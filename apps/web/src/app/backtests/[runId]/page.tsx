import { BacktestResultClient } from "@/components/backtest/backtest-result-client";
import { loadBacktest } from "@/lib/api";

type BacktestResultPageProps = {
  params: Promise<{
    runId: string;
  }>;
};

export default async function BacktestResultPage({
  params,
}: BacktestResultPageProps) {
  const { runId } = await params;
  const run = await loadBacktest(runId);

  return <BacktestResultClient initialRun={run} />;
}
