"use client";

import Link from "next/link";
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
      setUploadMessage(
        `${result.importedRows} rows imported for ${result.symbols.join(", ")}`,
      );
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
    <main className="grid content-start gap-8 w-[min(100%,var(--content-width))] mx-auto px-5 pt-8 pb-16">
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,360px)] gap-6 items-start">
        <section
          id="backtest-summary"
          className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-6 mb-2 pb-6 border-b border-border-soft">
            <div className="grid gap-2">
              <p className="m-0 text-primary font-bold tracking-wider uppercase text-xs">백테스트</p>
              <h1 className="m-0 font-sans text-3xl font-bold tracking-tight text-foreground">{strategy.name}</h1>
              <p className="m-0 text-muted font-medium flex items-center gap-2">
                normalized spec 기반 일봉 백테스트 실행 화면
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-info-soft text-info border border-info/20">
                {resolvedSymbols.length}개 종목
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4">
            <Link
              href={`/strategies/${strategy.id}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg bg-surface border border-border text-foreground hover:bg-[#fafafa] hover:border-gray-300 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border disabled:opacity-50"
            >
              상세
            </Link>
            <Link
              href={`/strategies/${strategy.id}/edit`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              편집
            </Link>
          </div>
          {hasOverseasUniverses ? (
            <div className="p-4 rounded-xl bg-warning-soft text-warning flex items-start gap-2 border border-warning/20 text-[0.9375rem] font-medium mt-6">
              미국 유니버스가 연결되어 있어 이 화면에서는 백테스트를 실행할 수 없습니다.
            </div>
          ) : null}
        </section>

        <aside className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm lg:sticky lg:top-8">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">실행 요약</h2>
          <p className="m-0 text-muted text-[0.9375rem] leading-relaxed mt-2 pb-4 border-b border-border-soft">
            실행 설정과 데이터 커버리지를 먼저 확인하고 백테스트를 시작합니다.
          </p>
          {hasOverseasUniverses ? (
            <p className="m-0 text-[0.9375rem] font-medium text-warning flex items-start gap-2 mt-4 mt-3">
              미국 유니버스가 포함된 전략은 현재 백테스트가 차단됩니다.
            </p>
          ) : null}
          <dl className="grid gap-4 mt-6">
            <div className="grid gap-1 pb-3 border-b border-border/40">
              <dt className="text-subtle text-xs font-semibold tracking-wider uppercase">버전</dt>
              <dd className="text-foreground font-medium text-[0.9375rem]">{versions.find((version) => version.id === selectedVersionId)?.versionNumber ?? "?"}</dd>
            </div>
            <div className="grid gap-1 pb-3 border-b border-border/40">
              <dt className="text-subtle text-xs font-semibold tracking-wider uppercase">커버리지</dt>
              <dd className="text-foreground font-medium text-[0.9375rem]">{coverage ? (coverage.covered ? "준비 완료" : "누락 있음") : "확인 중"}</dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-subtle text-xs font-semibold tracking-wider uppercase">종목 수</dt>
              <dd className="text-foreground font-medium text-[0.9375rem]">{resolvedSymbols.length}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,360px)] gap-6 items-start mt-4">
        <section className="grid gap-6">
          <section
            id="backtest-config"
            className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-6 mb-6 pb-6 border-b border-border-soft">
              <div className="grid gap-2">
                <h2 className="m-0 font-sans text-xl font-bold text-foreground">실행 설정</h2>
                <p className="m-0 text-muted text-[0.9375rem] leading-relaxed">
                  전략 버전, 기간, 수수료 모델을 고정한 뒤 실행합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRun}
                disabled={!canRun}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {isRunning ? "실행 요청 중..." : "백테스트 실행"}
              </button>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5 focus-within:text-primary">
                  <span className="text-subtle text-sm font-medium transition-colors">버전</span>
                  <select
                    value={selectedVersionId}
                    onChange={(event) => setSelectedVersionId(event.target.value)}
                    className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all cursor-pointer font-medium"
                  >
                    {versions.map((version) => (
                      <option
                        key={version.id}
                        value={version.id}
                      >
                        v{version.versionNumber} / {version.validationStatus}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 focus-within:text-primary">
                  <span className="text-subtle text-sm font-medium transition-colors">초기 자본</span>
                  <input
                    value={initialCapital}
                    onChange={(event) => setInitialCapital(event.target.value)}
                    className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all font-mono"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5 focus-within:text-primary">
                  <span className="text-subtle text-sm font-medium transition-colors">시작일</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all font-mono bg-transparent"
                  />
                </label>
                <label className="grid gap-1.5 focus-within:text-primary">
                  <span className="text-subtle text-sm font-medium transition-colors">종료일</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all font-mono bg-transparent"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-1.5 focus-within:text-primary">
                  <span className="text-subtle text-sm font-medium transition-colors">수수료율</span>
                  <input
                    value={commissionRate}
                    onChange={(event) => setCommissionRate(event.target.value)}
                    className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all font-mono"
                  />
                </label>
                <label className="grid gap-1.5 focus-within:text-primary">
                  <span className="text-subtle text-sm font-medium transition-colors">세금률</span>
                  <input
                    value={taxRate}
                    onChange={(event) => setTaxRate(event.target.value)}
                    className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all font-mono"
                  />
                </label>
                <label className="grid gap-1.5 focus-within:text-primary">
                  <span className="text-subtle text-sm font-medium transition-colors">슬리피지율</span>
                  <input
                    value={slippageRate}
                    onChange={(event) => setSlippageRate(event.target.value)}
                    className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all font-mono"
                  />
                </label>
              </div>
            </div>

            {runError ? <p className="mt-6 text-sm font-medium text-error flex items-start gap-2">{runError}</p> : null}
          </section>

          <section
            id="backtest-datasets"
            className="grid gap-6"
          >
            <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-6 mb-2 pb-6 border-b border-border-soft">
                <div className="grid gap-2">
                  <h2 className="m-0 font-sans text-xl font-bold text-foreground">시세 데이터 CSV</h2>
                  <p className="m-0 text-muted text-[0.9375rem] leading-relaxed">
                    <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[0.875rem] font-mono border border-slate-200">
                      symbol,date,open,high,low,close,volume
                    </code>{" "}
                    형식의 수정주가 일봉 CSV만 지원합니다.
                  </p>
                </div>
                <label className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg bg-surface border border-border text-foreground hover:bg-[#fafafa] hover:border-gray-300 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border disabled:opacity-50 cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleUpload}
                  />
                  {isUploading ? "업로드 중..." : "CSV 업로드"}
                </label>
              </div>
              {uploadMessage ? (
                <div className="p-4 rounded-xl bg-success-soft text-success border border-success/20 mt-4 text-[0.9375rem] font-medium flex items-start gap-2">{uploadMessage}</div>
              ) : null}
              {uploadError ? (
                <div className="p-4 rounded-xl bg-error-soft text-error border border-error/20 mt-4 text-[0.9375rem] font-medium flex items-start gap-2">{uploadError}</div>
              ) : null}
            </section>

            <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-6 mb-6 pb-6 border-b border-border-soft">
                <div className="grid gap-2">
                  <h2 className="m-0 font-sans text-xl font-bold text-foreground">종목 소스</h2>
                  <p className="m-0 text-muted text-[0.9375rem] leading-relaxed">
                    연결된 유니버스를 그대로 사용하거나 직접 심볼 목록을 입력할 수 있습니다.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground font-medium p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                    checked={useDirectSymbols}
                    onChange={(event) => setUseDirectSymbols(event.target.checked)}
                  />
                  직접 종목 입력
                </label>
              </div>

              {useDirectSymbols ? (
                <>
                  <p className="m-0 text-muted text-[0.9375rem] leading-relaxed mb-4">
                    직접 입력은 현재 국내 심볼만 지원합니다. 미국 심볼은 서버에서 차단됩니다.
                  </p>
                  <textarea
                    value={symbolsText}
                    onChange={(event) => setSymbolsText(event.target.value)}
                    rows={6}
                    placeholder="005930, 000660"
                    className="w-full px-4 py-3 bg-[#fafafa] text-foreground border border-border hover:border-gray-300 rounded-xl shadow-inner focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all font-mono leading-relaxed resize-y"
                  />
                </>
              ) : (
                <div className="grid gap-3">
                  {linkedUniverses.length === 0 ? (
                    <div className="grid justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center shadow-sm bg-surface">
                      <p className="m-0 text-foreground font-semibold text-[1.0625rem]">연결된 유니버스가 없습니다</p>
                      <p className="m-0 text-muted max-w-sm text-[0.9375rem] mt-2">직접 종목 입력으로 전환하세요.</p>
                    </div>
                  ) : (
                    linkedUniverses.map((universe) => (
                      <label
                        key={universe.id}
                        className="flex items-center gap-4 p-4 border border-border-soft rounded-xl bg-[#fafafa] hover:shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-primary cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                          checked={selectedUniverseIds.includes(universe.id)}
                          onChange={(event) => {
                            setSelectedUniverseIds((current) =>
                              event.target.checked
                                ? [...current, universe.id]
                                : current.filter((id) => id !== universe.id),
                            );
                          }}
                        />
                        <span className="text-foreground font-medium text-[0.9375rem]">
                          {universe.name} <span className="text-muted ml-1">({universe.symbolCount})</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </section>
          </section>
        </section>

        <aside className="grid gap-6">
          <section
            id="backtest-coverage"
            className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
          >
            <h2 className="m-0 font-sans text-xl font-bold text-foreground">데이터 커버리지</h2>
            <p className="m-0 text-muted text-[0.9375rem] leading-relaxed pb-4 mb-4 border-b border-border-soft mt-2">
              현재 실행 대상 종목 <span className="font-semibold text-foreground tracking-tight">{resolvedSymbols.length}</span>개
            </p>
            {coverageError ? (
              <p className="mt-3 text-sm font-medium text-error flex items-start gap-2">{coverageError}</p>
            ) : null}
            {coverage ? (
              <div className="grid gap-3">
                <p
                  className={`text-sm font-semibold tracking-wider uppercase bg-surface px-2 py-1 rounded inline-flex self-start border ${
                    coverage.covered ? "text-success bg-success-soft border-success/20" : "text-warning bg-warning-soft border-warning/20"
                  }`}
                >
                  {coverage.covered
                    ? "데이터 커버리지가 충분합니다."
                    : "누락된 symbol이 있습니다."}
                </p>
                <div className="max-h-[320px] overflow-y-auto pr-2 grid gap-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent mt-2">
                  {coverage.symbols.map((item) => (
                    <div
                      key={item.symbol}
                      className="p-4 bg-[#fafafa] border border-border-soft rounded-xl shadow-sm text-sm"
                    >
                      <div className="font-semibold text-foreground text-[0.9375rem] font-mono">{item.symbol}</div>
                      <div className="text-muted text-[0.8125rem] mt-1 font-mono">
                        {item.firstDate ?? "n/a"} - {item.lastDate ?? "n/a"} <span className="text-border-active mx-1">/</span>
                        <span className={item.covered ? "text-success font-medium" : "text-warning font-medium"}>{item.covered ? "충분" : "누락"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid justify-items-center p-6 border border-dashed border-border rounded-xl text-center shadow-sm bg-surface">
                <p className="m-0 text-foreground font-semibold text-[0.9375rem]">종목과 기간을 지정하면 커버리지를 확인합니다</p>
              </div>
            )}
          </section>

          <section
            id="backtest-runs"
            className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
          >
            <h2 className="m-0 font-sans text-xl font-bold text-foreground">최근 실행</h2>
            <div className="grid gap-3 mt-4 pt-4 border-t border-border-soft">
              {runs.length === 0 ? (
                <div className="grid justify-items-center p-6 border border-dashed border-border rounded-xl text-center shadow-sm bg-surface">
                  <p className="m-0 text-foreground font-semibold text-[0.9375rem]">아직 실행 이력이 없습니다</p>
                  <p className="m-0 text-muted max-w-sm text-[0.875rem] mt-2">위 설정을 완료한 뒤 백테스트를 실행하세요.</p>
                </div>
              ) : (
                runs.map((run) => (
                  <Link
                    key={run.runId}
                    href={`/backtests/${run.runId}`}
                    className="p-5 bg-surface border border-border-soft rounded-xl shadow-sm hover:shadow hover:border-gray-300 transition-all font-medium text-foreground hover:text-primary group block"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-semibold text-foreground text-[0.9375rem] group-hover:text-primary transition-colors">{statusLabel(run.status)}</span>
                      <span className="text-subtle text-xs font-semibold tracking-wider uppercase">
                        v{versionNumberFor(run.strategyVersionId, versions)}
                      </span>
                    </div>
                    <p className="text-muted text-[0.8125rem] font-mono">{formatDate(run.requestedAt)}</p>
                    {run.headlineMetrics ? (
                      <p className="m-0 text-muted text-[0.9375rem] leading-relaxed mt-3 pt-3 border-t border-border-soft/60">
                        수익률 <span className="font-mono text-foreground font-medium">{(run.headlineMetrics.totalReturnRate * 100).toFixed(2)}%</span> /
                        거래 <span className="font-mono text-foreground font-medium">{run.headlineMetrics.tradeCount}</span>건
                      </p>
                    ) : null}
                  </Link>
                ))
              )}
            </div>
          </section>
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

function versionNumberFor(strategyVersionId: string, versions: StrategyVersion[]) {
  return versions.find((version) => version.id === strategyVersionId)?.versionNumber ?? "?";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR");
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    queued: "대기",
    running: "실행 중",
    completed: "완료",
    failed: "실패",
  };
  return map[status] ?? status;
}
