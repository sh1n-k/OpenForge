"use client";

import type { StrategyVersion } from "@/lib/api";

const validationStatusLabel: Record<string, string> = {
  valid: "검증 통과",
  invalid: "검증 실패",
  invalid_legacy_draft: "레거시 초안",
};

type BacktestRunnerConfigFormProps = {
  versions: StrategyVersion[];
  selectedVersionId: string;
  onSelectedVersionIdChange: (value: string) => void;
  initialCapital: string;
  onInitialCapitalChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  commissionRate: string;
  onCommissionRateChange: (value: string) => void;
  taxRate: string;
  onTaxRateChange: (value: string) => void;
  slippageRate: string;
  onSlippageRateChange: (value: string) => void;
  canRun: boolean;
  isRunning: boolean;
  runError: string | null;
  onRun: () => void;
};

export function BacktestRunnerConfigForm({
  versions,
  selectedVersionId,
  onSelectedVersionIdChange,
  initialCapital,
  onInitialCapitalChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  commissionRate,
  onCommissionRateChange,
  taxRate,
  onTaxRateChange,
  slippageRate,
  onSlippageRateChange,
  canRun,
  isRunning,
  runError,
  onRun,
}: BacktestRunnerConfigFormProps) {
  return (
    <section
      id="backtest-config"
      className="doc-panel"
    >
      <div className="page-intro-row">
        <div className="page-intro">
          <h2 className="section-title">실행 설정</h2>
          <p className="section-copy">
            전략 버전, 기간, 비용 조건을 고정한 뒤 실행합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun}
          className="button-primary"
        >
          {isRunning ? "실행 요청 중..." : "백테스트 실행"}
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2">
            <span>버전</span>
            <select
              value={selectedVersionId}
              onChange={(event) => onSelectedVersionIdChange(event.target.value)}
            >
              {versions.map((version) => (
                <option
                  key={version.id}
                  value={version.id}
                >
                  v{version.versionNumber} / {validationStatusLabel[version.validationStatus] ?? version.validationStatus}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span>초기 자본</span>
            <input
              value={initialCapital}
              onChange={(event) => onInitialCapitalChange(event.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2">
            <span>시작일</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <span>종료일</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => onEndDateChange(event.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-2">
            <span>수수료율</span>
            <input
              value={commissionRate}
              onChange={(event) => onCommissionRateChange(event.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <span>세금률</span>
            <input
              value={taxRate}
              onChange={(event) => onTaxRateChange(event.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <span>슬리피지율</span>
            <input
              value={slippageRate}
              onChange={(event) => onSlippageRateChange(event.target.value)}
            />
          </label>
        </div>
      </div>

      {runError ? <p className="mt-3 text-sm text-rose-600">{runError}</p> : null}
    </section>
  );
}
