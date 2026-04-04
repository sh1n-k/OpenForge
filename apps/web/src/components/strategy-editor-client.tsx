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
import {
  conditionOperators,
  createDefaultIndicator,
  createEmptyCondition,
  deriveBuilderState,
  deriveCodeSource,
  getIndicatorDefinition,
  indicatorCatalog,
  makeBuilderPayload,
  makeCodePayload,
  priceFields,
  type BuilderCondition,
  type BuilderConditionGroup,
  type BuilderIndicator,
  type BuilderIndicatorType,
  type BuilderOperand,
  type BuilderPriceField,
  type BuilderState,
} from "@/lib/strategy-editor";

type StrategyEditorClientProps = {
  strategy: StrategyDetail;
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

  return (
    <main className="grid content-start gap-8 w-[min(100%,var(--content-width))] mx-auto px-5 pt-8 pb-16">
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,360px)] gap-6 items-start">
        <section
          id="editor-summary"
          className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-6 mb-2 pb-6 border-b border-border-soft">
            <div className="grid gap-2">
              <p className="m-0 text-primary font-bold tracking-wider uppercase text-xs">Strategy Editor</p>
              <h1 className="m-0 font-sans text-3xl font-bold tracking-tight text-foreground">
                {strategy.name} Editor
              </h1>
              <p className="m-0 text-muted font-medium flex items-center gap-2">
                {strategy.strategyType} / latest validation{" "}
                {strategy.latestValidationStatus ?? "unknown"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border-soft lg:border-t-0 lg:pt-0 lg:mt-0">
              <Link
                href={`/strategies/${strategy.id}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg bg-surface border border-border text-foreground hover:bg-[#fafafa] hover:border-gray-300 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border disabled:opacity-50"
              >
                Detail
              </Link>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {isSaving ? "저장 중..." : "새 버전 저장"}
              </button>
            </div>
          </div>
          {strategy.latestValidationStatus === "invalid_legacy_draft" ? (
            <p className="p-4 rounded-xl bg-warning-soft text-warning flex items-start gap-2 border border-warning/20 mb-6 text-[0.9375rem] font-medium mt-6">
              이전 단계의 legacy payload가 감지되었습니다. 편집 후 새 버전으로 저장하면 최신 규약으로 승격됩니다.
            </p>
          ) : null}
        </section>

        <aside className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm lg:sticky lg:top-8">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">Workbench Status</h2>
          <dl className="grid gap-4 mt-6">
            <div className="grid gap-1 border-b border-border-soft pb-3">
              <dt className="text-subtle text-xs font-semibold tracking-wider uppercase">Validation</dt>
              <dd className="text-foreground font-medium text-[0.9375rem]">{validation?.summary ?? validationError ?? "검증 대기 중"}</dd>
            </div>
            <div className="grid gap-1 border-b border-border-soft pb-3">
              <dt className="text-subtle text-xs font-semibold tracking-wider uppercase">Version</dt>
              <dd className="text-foreground font-medium text-[0.9375rem]">v{strategy.latestVersionNumber ?? 0}</dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-subtle text-xs font-semibold tracking-wider uppercase">Type</dt>
              <dd className="text-foreground font-medium text-[0.9375rem]">{strategy.strategyType}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,360px)] gap-6 items-start mt-4">
        <section className="grid gap-6">
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
            className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
          >
            <div className="mb-6 pb-4 border-b border-border/60">
              <h2 className="m-0 font-sans text-xl font-bold text-foreground">
                Version Note
              </h2>
            </div>
            <input
              value={changeSummary}
              onChange={(event) => setChangeSummary(event.target.value)}
              placeholder="변경 메모"
              className="w-full px-4 py-3 bg-surface text-foreground border border-border hover:border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
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

function BuilderEditor({
  state,
  onChange,
}: {
  state: BuilderState;
  onChange: (state: BuilderState) => void;
}) {
  function updateMetadata<K extends keyof BuilderState["metadata"]>(
    key: K,
    value: BuilderState["metadata"][K],
  ) {
    onChange({
      ...state,
      metadata: {
        ...state.metadata,
        [key]: value,
      },
    });
  }

  function updateGroup(groupKey: "entry" | "exit", nextGroup: BuilderConditionGroup) {
    onChange({
      ...state,
      [groupKey]: nextGroup,
    });
  }

  function updateRisk(
    key: keyof BuilderState["risk"],
    nextValue: BuilderState["risk"][typeof key],
  ) {
    onChange({
      ...state,
      risk: {
        ...state.risk,
        [key]: nextValue,
      },
    });
  }

  function addIndicator(indicatorId: BuilderIndicatorType) {
    onChange({
      ...state,
      indicators: [...state.indicators, createDefaultIndicator(indicatorId)],
    });
  }

  function updateIndicator(indicatorId: string, nextIndicator: BuilderIndicator) {
    onChange({
      ...state,
      indicators: state.indicators.map((indicator) =>
        indicator.id === indicatorId ? nextIndicator : indicator,
      ),
    });
  }

  function removeIndicator(indicatorId: string) {
    onChange({
      ...state,
      indicators: state.indicators.filter((indicator) => indicator.id !== indicatorId),
    });
  }

  return (
    <>
      <section
        id="editor-builder"
        className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
      >
        <div className="mb-6 pb-4 border-b border-border/60">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">Metadata</h2>
        </div>
        <div className="grid gap-4">
          <input
            value={state.metadata.name}
            onChange={(event) => updateMetadata("name", event.target.value)}
            placeholder="전략 이름"
            className="w-full px-4 py-3 bg-surface text-foreground border border-border hover:border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
          />
          <input
            value={state.metadata.description}
            onChange={(event) => updateMetadata("description", event.target.value)}
            placeholder="설명"
            className="w-full px-4 py-3 bg-surface text-foreground border border-border hover:border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={state.metadata.category}
              onChange={(event) => updateMetadata("category", event.target.value)}
              placeholder="category"
              className="w-full px-4 py-3 bg-surface text-foreground border border-border hover:border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
            />
            <input
              value={state.metadata.author}
              onChange={(event) => updateMetadata("author", event.target.value)}
              placeholder="author"
              className="w-full px-4 py-3 bg-surface text-foreground border border-border hover:border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
            />
          </div>
          <input
            value={state.metadata.tags.join(", ")}
            onChange={(event) =>
              updateMetadata(
                "tags",
                event.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              )
            }
            placeholder="tag1, tag2"
            className="w-full px-4 py-3 bg-surface text-foreground border border-border hover:border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
          />
        </div>
      </section>

      <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-border/60">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">Indicators</h2>
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                addIndicator(event.target.value as BuilderIndicatorType);
                event.target.value = "";
              }
            }}
            className="px-4 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all cursor-pointer font-medium"
          >
            <option value="" disabled>
              지표 추가
            </option>
            {indicatorCatalog.map((indicator) => (
              <option
                key={indicator.id}
                value={indicator.id}
              >
                {indicator.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4">
          {state.indicators.length === 0 ? (
            <p className="m-0 text-muted text-[0.9375rem]">지표를 하나 이상 추가하세요.</p>
          ) : (
            state.indicators.map((indicator) => (
              <IndicatorCard
                key={indicator.id}
                indicator={indicator}
                onChange={(nextIndicator) =>
                  updateIndicator(indicator.id, nextIndicator)
                }
                onRemove={() => removeIndicator(indicator.id)}
              />
            ))
          )}
        </div>
      </section>

      <ConditionGroupEditor
        title="Entry"
        group={state.entry}
        aliases={state.indicators}
        onChange={(nextGroup) => updateGroup("entry", nextGroup)}
      />
      <ConditionGroupEditor
        title="Exit"
        group={state.exit}
        aliases={state.indicators}
        onChange={(nextGroup) => updateGroup("exit", nextGroup)}
      />

      <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm">
        <div className="mb-6 pb-4 border-b border-border/60">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">Risk</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <RiskCard
            title="Stop Loss"
            value={state.risk.stopLoss}
            onChange={(next) => updateRisk("stopLoss", next)}
          />
          <RiskCard
            title="Take Profit"
            value={state.risk.takeProfit}
            onChange={(next) => updateRisk("takeProfit", next)}
          />
          <RiskCard
            title="Trailing Stop"
            value={state.risk.trailingStop}
            onChange={(next) => updateRisk("trailingStop", next)}
          />
        </div>
      </section>
    </>
  );
}

function CodeEditor({
  source,
  onChange,
}: {
  source: string;
  onChange: (source: string) => void;
}) {
  return (
    <section
      id="editor-builder"
      className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
    >
      <div className="mb-6 pb-4 border-b border-border/60">
        <h2 className="m-0 font-sans text-xl font-bold text-foreground">OpenForge YAML DSL</h2>
      </div>
      <textarea
        value={source}
        onChange={(event) => onChange(event.target.value)}
        rows={28}
        className="w-full px-4 py-4 bg-[#fafafa] text-foreground border border-border hover:border-gray-300 rounded-xl shadow-inner focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all font-mono leading-relaxed resize-y"
      />
    </section>
  );
}

function ValidationPanel({
  validation,
  validationError,
  isValidating,
}: {
  validation: StrategyValidateResponse | null;
  validationError: string | null;
  isValidating: boolean;
}) {
  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
      <section
        id="editor-validation"
        className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
      >
        <div className="mb-6 pb-4 border-b border-border/60">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">Validation</h2>
        </div>
        <p className="m-0 text-muted font-medium text-[0.9375rem] leading-relaxed">
          {isValidating
            ? "검증 중..."
            : validation
              ? validation.summary
              : "검증 결과가 아직 없습니다."}
        </p>
        {validationError ? (
          <p className="mt-3 text-sm font-medium text-error flex items-start gap-2">{validationError}</p>
        ) : null}
        {validation?.errors.length ? (
          <div className="p-4 rounded-xl bg-error-soft text-error border border-error/20 flex flex-col items-start gap-2 text-[0.9375rem] font-medium mt-4">
            <p className="font-bold tracking-wider uppercase text-xs">Errors</p>
            <ul className="grid gap-2 text-sm pl-4 list-disc marker:text-error/50">
              {validation.errors.map((error, index) => (
                <li key={`${error.category}-${index}`}>
                  [{error.category}] {error.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {validation?.warnings.length ? (
          <div className="p-4 rounded-xl bg-warning-soft text-warning border border-warning/20 flex flex-col items-start gap-2 text-[0.9375rem] font-medium mt-4">
            <p className="font-bold tracking-wider uppercase text-xs">Warnings</p>
            <ul className="grid gap-2 text-sm pl-4 list-disc marker:text-warning/50">
              {validation.warnings.map((warning, index) => (
                <li key={`${warning.category}-${index}`}>
                  [{warning.category}] {warning.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm">
        <div className="mb-6 pb-4 border-b border-border/60">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">YAML Preview</h2>
        </div>
        <pre className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono overflow-auto whitespace-pre mt-4 shadow-inner">
          {validation?.yamlPreview || "# validation preview"}
        </pre>
      </section>
    </aside>
  );
}

function IndicatorCard({
  indicator,
  onChange,
  onRemove,
}: {
  indicator: BuilderIndicator;
  onChange: (indicator: BuilderIndicator) => void;
  onRemove: () => void;
}) {
  const definition = getIndicatorDefinition(indicator.indicatorId);

  return (
    <article className="p-5 bg-[#fafafa] border border-border-soft rounded-xl shadow-sm hover:shadow hover:border-gray-300 transition-all group">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_0.8fr_auto]">
        <select
          value={indicator.indicatorId}
          onChange={(event) =>
            onChange(createDefaultIndicator(event.target.value as BuilderIndicatorType))
          }
          className="px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all cursor-pointer font-medium"
        >
          {indicatorCatalog.map((item) => (
            <option
              key={item.id}
              value={item.id}
            >
              {item.label}
            </option>
          ))}
        </select>
        <input
          value={indicator.alias}
          onChange={(event) =>
            onChange({
              ...indicator,
              alias: event.target.value,
            })
          }
          placeholder="alias"
          className="px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all font-mono"
        />
        <select
          value={indicator.output}
          onChange={(event) =>
            onChange({
              ...indicator,
              output: event.target.value,
            })
          }
          className="px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all cursor-pointer font-medium"
        >
          {definition.outputs.map((output) => (
            <option
              key={output}
              value={output}
            >
              {output}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 font-medium rounded-lg bg-error hover:bg-red-700 text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error disabled:opacity-50 text-sm"
        >
          Remove
        </button>
      </div>
      <div className="mt-4 pt-4 border-t border-border-soft grid gap-3 md:grid-cols-3">
        {Object.entries(definition.defaults).map(([key]) => (
          <label
            key={key}
            className="grid gap-1 focus-within:text-primary"
          >
            <span className="text-subtle text-xs font-semibold tracking-wider uppercase">{key}</span>
            <input
              type="number"
              value={indicator.params[key] ?? definition.defaults[key]}
              onChange={(event) =>
                onChange({
                  ...indicator,
                  params: {
                    ...indicator.params,
                    [key]: Number(event.target.value),
                  },
                })
              }
              className="w-full px-3 py-1.5 bg-surface text-foreground border border-border hover:border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all font-mono"
            />
          </label>
        ))}
      </div>
    </article>
  );
}

function ConditionGroupEditor({
  title,
  group,
  aliases,
  onChange,
}: {
  title: string;
  group: BuilderConditionGroup;
  aliases: BuilderIndicator[];
  onChange: (group: BuilderConditionGroup) => void;
}) {
  function updateCondition(conditionId: string, nextCondition: BuilderCondition) {
    onChange({
      ...group,
      conditions: group.conditions.map((condition) =>
        condition.id === conditionId ? nextCondition : condition,
      ),
    });
  }

  function removeCondition(conditionId: string) {
    onChange({
      ...group,
      conditions: group.conditions.filter((condition) => condition.id !== conditionId),
    });
  }

  return (
    <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-border/60">
        <h2 className="m-0 font-sans text-xl font-bold text-foreground">{title}</h2>
        <div className="flex items-center gap-3">
          <select
            value={group.logic}
            onChange={(event) =>
              onChange({
                ...group,
                logic: event.target.value as BuilderConditionGroup["logic"],
              })
            }
            className="px-4 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all cursor-pointer font-bold"
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...group,
                conditions: [...group.conditions, createEmptyCondition()],
              })
            }
            className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 text-sm"
          >
            Condition 추가
          </button>
        </div>
      </div>
      <div className="grid gap-4">
        {group.conditions.length === 0 ? (
          <p className="m-0 text-muted text-[0.9375rem]">조건이 없습니다.</p>
        ) : (
          group.conditions.map((condition) => (
            <ConditionCard
              key={condition.id}
              condition={condition}
              aliases={aliases}
              onChange={(nextCondition) =>
                updateCondition(condition.id, nextCondition)
              }
              onRemove={() => removeCondition(condition.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function ConditionCard({
  condition,
  aliases,
  onChange,
  onRemove,
}: {
  condition: BuilderCondition;
  aliases: BuilderIndicator[];
  onChange: (condition: BuilderCondition) => void;
  onRemove: () => void;
}) {
  return (
    <article className="p-5 bg-surface border border-border-soft rounded-xl shadow-sm hover:shadow hover:border-gray-300 transition-all group">
      <div className="grid gap-4">
        <OperandEditor
          label="Left"
          operand={condition.left}
          aliases={aliases}
          onChange={(left) =>
            onChange({
              ...condition,
              left,
            })
          }
        />
        <div className="grid gap-3 md:grid-cols-[1fr_auto] items-center border-y border-border-soft py-4 my-2 relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-2 text-muted text-[0.6875rem] font-bold tracking-wider uppercase invisible md:visible">Op</div>
          <select
            value={condition.operator}
            onChange={(event) =>
              onChange({
                ...condition,
                operator: event.target.value as BuilderCondition["operator"],
              })
            }
            className="px-4 py-2.5 bg-[#fafafa] text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary font-bold text-center transition-all cursor-pointer"
          >
            {conditionOperators.map((operator) => (
              <option
                key={operator}
                value={operator}
              >
                {operator}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 font-medium rounded-lg bg-surface border border-error/50 text-error hover:bg-error-soft hover:border-error shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error disabled:opacity-50 text-sm"
          >
            Remove
          </button>
        </div>
        <OperandEditor
          label="Right"
          operand={condition.right}
          aliases={aliases}
          onChange={(right) =>
            onChange({
              ...condition,
              right,
            })
          }
        />
      </div>
    </article>
  );
}

function OperandEditor({
  label,
  operand,
  aliases,
  onChange,
}: {
  label: string;
  operand: BuilderOperand;
  aliases: BuilderIndicator[];
  onChange: (operand: BuilderOperand) => void;
}) {
  const selectedAlias =
    operand.type === "indicator" ? aliases.find((item) => item.alias === operand.alias) : null;
  const outputOptions = selectedAlias
    ? getIndicatorDefinition(selectedAlias.indicatorId).outputs
    : ["value"];

  return (
    <div className="grid gap-2">
      <span className="text-subtle text-xs font-bold tracking-wider uppercase text-primary">{label}</span>
      <div className="grid gap-3 md:grid-cols-3">
        <select
          value={operand.type}
          onChange={(event) => {
            const type = event.target.value as BuilderOperand["type"];
            if (type === "price") {
              onChange({ type, field: "close" });
            } else if (type === "indicator") {
              onChange({
                type,
                alias: aliases[0]?.alias ?? "",
                output: aliases[0]
                  ? getIndicatorDefinition(aliases[0].indicatorId).defaultOutput
                  : "value",
              });
            } else {
              onChange({ type, value: 0 });
            }
          }}
          className="px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all cursor-pointer font-medium"
        >
          <option value="price">price</option>
          <option value="indicator">indicator</option>
          <option value="value">value</option>
        </select>

        {operand.type === "price" ? (
          <select
            value={operand.field}
            onChange={(event) =>
              onChange({
                type: "price",
                field: event.target.value as BuilderPriceField,
              })
            }
            className="col-span-2 px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all cursor-pointer font-medium"
          >
            {priceFields.map((field) => (
              <option
                key={field}
                value={field}
              >
                {field}
              </option>
            ))}
          </select>
        ) : null}

        {operand.type === "indicator" ? (
          <>
            <select
              value={operand.alias}
              onChange={(event) => {
                const alias = event.target.value;
                const indicator = aliases.find((item) => item.alias === alias);
                onChange({
                  type: "indicator",
                  alias,
                  output: indicator
                    ? getIndicatorDefinition(indicator.indicatorId).defaultOutput
                    : "value",
                });
              }}
              className="px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all cursor-pointer font-medium"
            >
              {aliases.length === 0 ? (
                <option value="">indicator 없음</option>
              ) : (
                aliases.map((item) => (
                  <option
                    key={item.id}
                    value={item.alias}
                  >
                    {item.alias}
                  </option>
                ))
              )}
            </select>
            <select
              value={operand.output}
              onChange={(event) =>
                onChange({
                  type: "indicator",
                  alias: operand.alias,
                  output: event.target.value,
                })
              }
              className="px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all cursor-pointer font-medium"
            >
              {outputOptions.map((output) => (
                <option
                  key={output}
                  value={output}
                >
                  {output}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {operand.type === "value" ? (
          <input
            type="number"
            value={operand.value}
            onChange={(event) =>
              onChange({
                type: "value",
                value: Number(event.target.value),
              })
            }
            className="col-span-2 px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all font-mono"
          />
        ) : null}
      </div>
    </div>
  );
}

function RiskCard({
  title,
  value,
  onChange,
}: {
  title: string;
  value: { enabled: boolean; percent: number };
  onChange: (value: { enabled: boolean; percent: number }) => void;
}) {
  return (
    <article className="p-5 bg-surface border border-border-soft rounded-xl shadow-sm hover:shadow hover:border-gray-300 transition-all group flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-border/60">
        <h3 className="m-0 font-sans text-[0.9375rem] font-bold text-foreground">{title}</h3>
        <label className="flex items-center gap-2 p-1 border border-transparent rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
            checked={value.enabled}
            onChange={(event) =>
              onChange({
                ...value,
                enabled: event.target.checked,
              })
            }
          />
          <span className="text-subtle text-xs font-semibold tracking-wider uppercase">enabled</span>
        </label>
      </div>
      <div className="relative">
        <input
          type="number"
          value={value.percent}
          onChange={(event) =>
            onChange({
              ...value,
              percent: Number(event.target.value),
            })
          }
          className="w-full pl-3 pr-8 py-2 bg-[#fafafa] text-foreground border border-border hover:border-gray-300 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-lg transition-all font-mono text-right font-bold"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-muted font-bold">%</div>
      </div>
    </article>
  );
}
