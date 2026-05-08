"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import {
  addStrategyVersion,
  type StrategyDetail,
  type StrategyValidateResponse,
  validateStrategy,
} from "@/lib/api";
import { LEGACY_DRAFT_SUPPORT } from "@/lib/features";
import {
  deriveBuilderState,
  deriveCodeSource,
  makeBuilderPayload,
  makeCodePayload,
  type BuilderState,
} from "@/lib/strategy-editor";
import { BuilderEditor } from "./editor/builder-editor";
import { CodeEditor } from "./editor/code-editor";
import { ValidationPanel } from "./editor/validation-panel";
import {
  resolveValidationUiState,
  validationUiClassName,
  validationUiLabel,
  validationUiTextClassName,
} from "./editor/validation-ui";

type StrategyEditorClientProps = {
  strategy: StrategyDetail;
};

const strategyTypeLabel: Record<string, string> = {
  builder: "빌더형",
  code: "코드형",
};

export function StrategyEditorClient({
  strategy,
}: StrategyEditorClientProps) {
  const router = useRouter();
  const [builderState, setBuilderState] = useState<BuilderState>(() =>
    deriveBuilderState(strategy),
  );
  const [codeSource, setCodeSource] = useState(() => deriveCodeSource(strategy));
  const [changeSummary, setChangeSummary] = useState("");
  const [validation, setValidation] = useState<StrategyValidateResponse | null>(
    null,
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const validationInput = useMemo(() => {
    if (strategy.strategyType === "builder") {
      return {
        strategyType: strategy.strategyType,
        payloadFormat: "builder_json" as const,
        payload: makeBuilderPayload(builderState),
      };
    }

    return {
      strategyType: strategy.strategyType,
      payloadFormat: "code_text" as const,
      payload: makeCodePayload(codeSource),
    };
  }, [builderState, codeSource, strategy.strategyType]);

  const validationKey = useMemo(
    () => JSON.stringify(validationInput),
    [validationInput],
  );

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsValidating(true);
        setValidationError(null);
        const result = await validateStrategy(validationInput);
        if (!cancelled) {
          setValidation(result);
        }
      } catch (error) {
        if (!cancelled) {
          setValidation(null);
          setValidationError(
            error instanceof Error ? error.message : "검증에 실패했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsValidating(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [validationInput, validationKey]);

  async function handleSave() {
    try {
      setSaveError(null);
      setIsSaving(true);
      await addStrategyVersion(strategy.id, {
        payloadFormat: validationInput.payloadFormat,
        payload: validationInput.payload,
        changeSummary,
      });
      startTransition(() => router.push(`/strategies/${strategy.id}`));
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "새 버전 저장에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const canSave = validation?.valid === true && !isValidating && !isSaving;
  const validationSummary =
    validationError ?? validation?.summary ?? (isValidating ? "검증 중..." : "검증 대기 중");
  const validationUiState = resolveValidationUiState({
    validation,
    validationError,
    isValidating,
  });

  return (
    <main className="page-shell docs-page-shell">
      <section
        id="editor-summary"
        className="doc-panel"
      >
        <div className="page-intro-row">
          <div className="page-intro">
            <p className="page-eyebrow">전략 작업대</p>
            <h1 className="page-title">{strategy.name}</h1>
            <p className="page-description">
              변경 내용을 먼저 검증하고, 통과한 상태에서만 새 버전으로 저장합니다.
            </p>
          </div>
          <div className="page-actions">
            <span className="status-chip status-chip-info">
              {strategyTypeLabel[strategy.strategyType] ?? strategy.strategyType}
            </span>
            <span className={validationUiClassName(validationUiState)}>
              {validationUiLabel(validationUiState)}
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="button-primary"
            >
              {isSaving ? "저장 중..." : "새 버전 저장"}
            </button>
            <Link
              href={`/strategies/${strategy.id}`}
              className="button-secondary"
            >
              상세 보기
            </Link>
          </div>
        </div>

        <div className="summary-grid summary-grid-columns-3" style={{ marginTop: 16 }}>
          <article className="metric-card metric-card-accent-primary">
            <p className="metric-card-label">버전</p>
            <p className="metric-card-value">v{strategy.latestVersionNumber ?? 0}</p>
            <p className="metric-card-copy">현재 편집 대상</p>
          </article>
          <article className="metric-card metric-card-accent-info">
            <p className="metric-card-label">검증</p>
            <p
              className={`metric-card-value ${validationUiTextClassName(
                validationUiState,
              )}`}
            >
              {validationUiLabel(validationUiState)}
            </p>
            <p className="metric-card-copy">{validationSummary}</p>
          </article>
          <article className="metric-card metric-card-accent-secondary">
            <p className="metric-card-label">유형</p>
            <p className="metric-card-value">
              {strategyTypeLabel[strategy.strategyType] ?? strategy.strategyType}
            </p>
            <p className="metric-card-copy">빌더형 또는 코드형</p>
          </article>
        </div>

        {LEGACY_DRAFT_SUPPORT &&
        strategy.latestValidationStatus === "invalid_legacy_draft" ? (
          <p className="doc-panel doc-panel-warn mt-4 p-4 text-sm text-amber-700">
            이전 규약의 초안이 감지되었습니다. 편집 후 새 버전으로 저장하면 현재 규약으로 승격됩니다.
          </p>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <section className="flex flex-col gap-6">
          {strategy.strategyType === "builder" ? (
            <BuilderEditor
              state={builderState}
              onChange={setBuilderState}
            />
          ) : (
            <CodeEditor
              source={codeSource}
              onChange={setCodeSource}
            />
          )}

          <section
            id="editor-note"
            className="doc-panel"
          >
            <h2 className="section-title">버전 메모</h2>
            <input
              value={changeSummary}
              onChange={(event) => setChangeSummary(event.target.value)}
              placeholder="변경 이유를 짧게 기록하세요"
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            {saveError ? (
              <p className="mt-3 text-sm text-rose-600">{saveError}</p>
            ) : null}
          </section>
        </section>

        <ValidationPanel
          validation={validation}
          validationError={validationError}
          isValidating={isValidating}
        />
      </section>
    </main>
  );
}
