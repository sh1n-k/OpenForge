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
    <main className="page-shell docs-page-shell page-shell-workbench">
      <section className="workbench-hero-grid">
        <section
          id="backtest-summary"
          className="doc-panel"
        >
          <div className="page-intro-row">
            <div className="page-intro">
              <p className="page-eyebrow">백테스트</p>
              <h1 className="page-title">{strategy.name}</h1>
              <p className="page-description">
                normalized spec 기반 일봉 백테스트 실행 화면
              </p>
            </div>
            <div className="page-actions">
              <span className="status-chip status-chip-info">
                {resolvedSymbols.length}개 종목
              </span>
            </div>
          </div>
          <div className="panel-actions-row">
            <Link
              href={`/strategies/${strategy.id}`}
              className="button-secondary"
            >
              상세
            </Link>
            <Link
              href={`/strategies/${strategy.id}/edit`}
              className="button-primary"
            >
              편집
            </Link>
          </div>
          {hasOverseasUniverses ? (
            <div className="doc-panel doc-panel-warn section-stack-top">
              미국 유니버스가 연결되어 있어 이 화면에서는 백테스트를 실행할 수 없습니다.
            </div>
          ) : null}
        </section>

        <aside className="doc-panel doc-panel-soft workbench-sticky-panel">
          <h2 className="section-title">실행 요약</h2>
          <p className="section-copy">
            실행 설정과 데이터 커버리지를 먼저 확인하고 백테스트를 시작합니다.
          </p>
          {hasOverseasUniverses ? (
            <p className="inline-warning section-stack-top-sm">
              미국 유니버스가 포함된 전략은 현재 백테스트가 차단됩니다.
            </p>
          ) : null}
          <dl className="workbench-summary-list">
            <div>
              <dt className="font-semibold text-slate-900">버전</dt>
              <dd>{versions.find((version) => version.id === selectedVersionId)?.versionNumber ?? "?"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">커버리지</dt>
              <dd>{coverage ? (coverage.covered ? "준비 완료" : "누락 있음") : "확인 중"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">종목 수</dt>
              <dd>{resolvedSymbols.length}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="workbench-main-grid">
        <section className="workbench-main-column">
          <section
            id="backtest-config"
            className="doc-panel"
          >
            <div className="page-intro-row">
              <div className="page-intro">
                <h2 className="section-title">실행 설정</h2>
                <p className="section-copy">
                  전략 버전, 기간, 수수료 모델을 고정한 뒤 실행합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRun}
                disabled={!canRun}
                className="button-primary"
              >
                {isRunning ? "실행 요청 중..." : "백테스트 실행"}
              </button>
            </div>

            <div className="page-stack-16">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <span>버전</span>
                  <select
                    value={selectedVersionId}
                    onChange={(event) => setSelectedVersionId(event.target.value)}
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
                <label className="grid gap-2">
                  <span>초기 자본</span>
                  <input
                    value={initialCapital}
                    onChange={(event) => setInitialCapital(event.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <span>시작일</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </label>
                <label className="grid gap-2">
                  <span>종료일</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-2">
                  <span>수수료율</span>
                  <input
                    value={commissionRate}
                    onChange={(event) => setCommissionRate(event.target.value)}
                  />
                </label>
                <label className="grid gap-2">
                  <span>세금률</span>
                  <input
                    value={taxRate}
                    onChange={(event) => setTaxRate(event.target.value)}
                  />
                </label>
                <label className="grid gap-2">
                  <span>슬리피지율</span>
                  <input
                    value={slippageRate}
                    onChange={(event) => setSlippageRate(event.target.value)}
                  />
                </label>
              </div>
            </div>

            {runError ? <p className="mt-3 text-sm text-rose-600">{runError}</p> : null}
          </section>

          <section
            id="backtest-datasets"
            className="grid gap-6"
          >
            <section className="doc-panel">
              <div className="page-intro-row">
                <div className="page-intro">
                  <h2 className="section-title">시세 데이터 CSV</h2>
                  <p className="section-copy">
                    <code className="inline-code">
                      symbol,date,open,high,low,close,volume
                    </code>{" "}
                    형식의 수정주가 일봉 CSV만 지원합니다.
                  </p>
                </div>
                <label className="button-secondary cursor-pointer">
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
                <p className="mt-3 text-sm text-emerald-700">{uploadMessage}</p>
              ) : null}
              {uploadError ? (
                <p className="mt-3 text-sm text-rose-600">{uploadError}</p>
              ) : null}
            </section>

            <section className="doc-panel doc-panel-code">
              <div className="page-intro-row">
                <div className="page-intro">
                  <h2 className="section-title">종목 소스</h2>
                  <p className="section-copy">
                    연결된 유니버스를 그대로 사용하거나 직접 심볼 목록을 입력할 수 있습니다.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useDirectSymbols}
                    onChange={(event) => setUseDirectSymbols(event.target.checked)}
                  />
                  직접 종목 입력
                </label>
              </div>

              {useDirectSymbols ? (
                <>
                  <p className="section-copy" style={{ marginTop: 12 }}>
                    직접 입력은 현재 국내 심볼만 지원합니다. 미국 심볼은 서버에서 차단됩니다.
                  </p>
                  <textarea
                    value={symbolsText}
                    onChange={(event) => setSymbolsText(event.target.value)}
                    rows={6}
                    placeholder="005930, 000660"
                    className="mt-4 font-mono text-sm"
                  />
                </>
              ) : (
                <div className="mt-4 stack-list">
                  {linkedUniverses.length === 0 ? (
                    <div className="empty-state empty-state-compact">
                      <p className="empty-state-message">연결된 유니버스가 없습니다</p>
                      <p className="empty-state-hint">직접 종목 입력으로 전환하세요.</p>
                    </div>
                  ) : (
                    linkedUniverses.map((universe) => (
                      <label
                        key={universe.id}
                        className="list-card flex items-center gap-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUniverseIds.includes(universe.id)}
                          onChange={(event) => {
                            setSelectedUniverseIds((current) =>
                              event.target.checked
                                ? [...current, universe.id]
                                : current.filter((id) => id !== universe.id),
                            );
                          }}
                        />
                        <span>
                          {universe.name} ({universe.symbolCount})
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </section>
          </section>
        </section>

        <aside className="workbench-side-column">
          <section
            id="backtest-coverage"
            className="doc-panel"
          >
            <h2 className="section-title">데이터 커버리지</h2>
            <p className="section-copy">
              현재 실행 대상 종목 {resolvedSymbols.length}개
            </p>
            {coverageError ? (
              <p className="mt-3 text-sm text-rose-600">{coverageError}</p>
            ) : null}
            {coverage ? (
              <div className="mt-4 stack-list">
                <p
                  className={`text-sm font-medium ${
                    coverage.covered ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {coverage.covered
                    ? "데이터 커버리지가 충분합니다."
                    : "누락된 symbol이 있습니다."}
                </p>
                {coverage.symbols.map((item) => (
                  <div
                    key={item.symbol}
                    className="list-card"
                  >
                    <div className="doc-nav-title">{item.symbol}</div>
                    <div className="doc-nav-description">
                      {item.firstDate ?? "n/a"} - {item.lastDate ?? "n/a"} /{" "}
                      {item.covered ? "충분" : "누락"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <p className="empty-state-message">종목과 기간을 지정하면 커버리지를 확인합니다</p>
              </div>
            )}
          </section>

          <section
            id="backtest-runs"
            className="doc-panel"
          >
            <h2 className="section-title">최근 실행</h2>
            <div className="mt-4 stack-list">
              {runs.length === 0 ? (
                <div className="empty-state empty-state-compact">
                  <p className="empty-state-message">아직 실행 이력이 없습니다</p>
                  <p className="empty-state-hint">위 설정을 완료한 뒤 백테스트를 실행하세요.</p>
                </div>
              ) : (
                runs.map((run) => (
                  <Link
                    key={run.runId}
                    href={`/backtests/${run.runId}`}
                    className="doc-nav-link list-card"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="doc-nav-title">{statusLabel(run.status)}</span>
                      <span className="metric-card-label">
                        v{versionNumberFor(run.strategyVersionId, versions)}
                      </span>
                    </div>
                    <p className="doc-nav-description">{formatDate(run.requestedAt)}</p>
                    {run.headlineMetrics ? (
                      <p className="section-copy">
                        수익률 {(run.headlineMetrics.totalReturnRate * 100).toFixed(2)}% /
                        거래 {run.headlineMetrics.tradeCount}건
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
