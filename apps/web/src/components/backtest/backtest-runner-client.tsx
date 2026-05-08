"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import {
  createBacktest,
  importDailyBars,
  loadMarketCoverage,
  type BacktestRunSummary,
  type StrategyDetail,
  type StrategyVersion,
  type UniverseDetail,
} from "@/lib/api";
import { BacktestRunnerConfigForm } from "./backtest-runner-config-form";
import { BacktestRunnerCoverageAside } from "./backtest-runner-coverage-aside";
import { BacktestRunnerDatasetUpload } from "./backtest-runner-dataset-upload";
import { BacktestRunnerRecentRuns } from "./backtest-runner-recent-runs";
import { BacktestRunnerSummaryHeader } from "./backtest-runner-summary-header";
import { BacktestRunnerSymbolPicker } from "./backtest-runner-symbol-picker";

type BacktestRunnerClientProps = {
  strategy: StrategyDetail;
  versions: StrategyVersion[];
  linkedUniverses: UniverseDetail[];
  runs: BacktestRunSummary[];
};

export function BacktestRunnerClient({
  strategy,
  versions,
  linkedUniverses,
  runs,
}: BacktestRunnerClientProps) {
  const router = useRouter();
  const [selectedVersionId, setSelectedVersionId] = useState(
    strategy.latestVersionId ?? versions[0]?.id ?? "",
  );
  const [useDirectSymbols, setUseDirectSymbols] = useState(false);
  const [selectedUniverseIds, setSelectedUniverseIds] = useState(
    linkedUniverses.map((universe) => universe.id),
  );
  const [symbolsText, setSymbolsText] = useState("");
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [initialCapital, setInitialCapital] = useState("100000000");
  const [commissionRate, setCommissionRate] = useState("0.00015");
  const [taxRate, setTaxRate] = useState("0.002");
  const [slippageRate, setSlippageRate] = useState("0");
  const [coverageError, setCoverageError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<Awaited<
    ReturnType<typeof loadMarketCoverage>
  > | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const hasOverseasUniverses = linkedUniverses.some((universe) => universe.marketScope === "us");

  const resolvedSymbols = useMemo(() => {
    if (useDirectSymbols) {
      return symbolsText
        .split(/[,\n]/)
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean);
    }

    return linkedUniverses
      .filter((universe) => selectedUniverseIds.includes(universe.id))
      .flatMap((universe) =>
        universe.symbols.map((symbol) => symbol.symbol.toUpperCase()),
      )
      .filter((symbol, index, all) => all.indexOf(symbol) === index);
  }, [linkedUniverses, selectedUniverseIds, symbolsText, useDirectSymbols]);

  useEffect(() => {
    let cancelled = false;

    async function checkCoverage() {
      if (hasOverseasUniverses || resolvedSymbols.length === 0 || !startDate || !endDate) {
        setCoverage(null);
        setCoverageError(null);
        return;
      }

      try {
        setCoverageError(null);
        const nextCoverage = await loadMarketCoverage({
          symbols: resolvedSymbols,
          startDate,
          endDate,
        });
        if (!cancelled) {
          setCoverage(nextCoverage);
        }
      } catch (error) {
        if (!cancelled) {
          setCoverage(null);
          setCoverageError(
            error instanceof Error ? error.message : "커버리지 조회에 실패했습니다.",
          );
        }
      }
    }

    void checkCoverage();
    return () => {
      cancelled = true;
    };
  }, [endDate, hasOverseasUniverses, resolvedSymbols, startDate]);

  const canRun =
    !!selectedVersionId &&
    !!startDate &&
    !!endDate &&
    resolvedSymbols.length > 0 &&
    coverage?.covered === true &&
    !hasOverseasUniverses &&
    !isRunning;

  async function handleRun() {
    try {
      setRunError(null);
      setIsRunning(true);
      const result = await createBacktest({
        strategyId: strategy.id,
        strategyVersionId: selectedVersionId,
        startDate,
        endDate,
        initialCapital: Number(initialCapital),
        commissionRate: Number(commissionRate),
        taxRate: Number(taxRate),
        slippageRate: Number(slippageRate),
        ...(useDirectSymbols
          ? { symbols: resolvedSymbols }
          : { universeIds: selectedUniverseIds }),
      });
      startTransition(() => router.push(`/backtests/${result.runId}`));
    } catch (error) {
      setRunError(
        error instanceof Error ? error.message : "백테스트 실행에 실패했습니다.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const result = await importDailyBars(file);
      setUploadMessage(`${result.importedRows}행을 ${result.symbols.join(", ")}에 반영했습니다.`);
      startTransition(() => router.refresh());
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "CSV 업로드에 실패했습니다.",
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <main className="page-shell docs-page-shell">
      <BacktestRunnerSummaryHeader
        strategy={strategy}
        versions={versions}
        selectedVersionId={selectedVersionId}
        resolvedSymbolsCount={resolvedSymbols.length}
        useDirectSymbols={useDirectSymbols}
        startDate={startDate}
        endDate={endDate}
        coverage={coverage}
        canRun={canRun}
        hasOverseasUniverses={hasOverseasUniverses}
      />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="grid gap-6">
          <BacktestRunnerConfigForm
            versions={versions}
            selectedVersionId={selectedVersionId}
            onSelectedVersionIdChange={setSelectedVersionId}
            initialCapital={initialCapital}
            onInitialCapitalChange={setInitialCapital}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            commissionRate={commissionRate}
            onCommissionRateChange={setCommissionRate}
            taxRate={taxRate}
            onTaxRateChange={setTaxRate}
            slippageRate={slippageRate}
            onSlippageRateChange={setSlippageRate}
            canRun={canRun}
            isRunning={isRunning}
            runError={runError}
            onRun={handleRun}
          />

          <section
            id="backtest-datasets"
            className="grid gap-6"
          >
            <BacktestRunnerDatasetUpload
              isUploading={isUploading}
              uploadMessage={uploadMessage}
              uploadError={uploadError}
              onUpload={handleUpload}
            />

            <BacktestRunnerSymbolPicker
              linkedUniverses={linkedUniverses}
              useDirectSymbols={useDirectSymbols}
              onUseDirectSymbolsChange={setUseDirectSymbols}
              selectedUniverseIds={selectedUniverseIds}
              onSelectedUniverseIdsChange={setSelectedUniverseIds}
              symbolsText={symbolsText}
              onSymbolsTextChange={setSymbolsText}
            />
          </section>
        </section>

        <aside className="grid gap-6">
          <BacktestRunnerCoverageAside
            resolvedSymbolsCount={resolvedSymbols.length}
            coverage={coverage}
            coverageError={coverageError}
          />

          <BacktestRunnerRecentRuns
            runs={runs}
            versions={versions}
          />
        </aside>
      </section>
    </main>
  );
}

function defaultEndDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 180);
  return date.toISOString().slice(0, 10);
}
