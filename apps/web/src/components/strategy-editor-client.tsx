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
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 md:px-10">
      <section className="rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.3)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Stage 3
            </p>
            <h1 className="mt-2 text-4xl font-semibold">
              {strategy.name} Editor
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {strategy.strategyType} / latest validation{" "}
              {strategy.latestValidationStatus ?? "unknown"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/strategies/${strategy.id}`}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
            >
              Detail
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "새 버전 저장"}
            </button>
          </div>
        </div>
        {strategy.latestValidationStatus === "invalid_legacy_draft" ? (
          <p className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            이전 단계의 legacy payload가 감지되었습니다. 편집 후 새 버전으로 저장하면 최신 규약으로 승격됩니다.
          </p>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
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

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold text-slate-950">
              Version Note
            </h2>
            <input
              value={changeSummary}
              onChange={(event) => setChangeSummary(event.target.value)}
              placeholder="변경 메모"
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
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <h2 className="text-2xl font-semibold text-slate-950">Metadata</h2>
        <div className="mt-4 grid gap-3">
          <input
            value={state.metadata.name}
            onChange={(event) => updateMetadata("name", event.target.value)}
            placeholder="전략 이름"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
          <input
            value={state.metadata.description}
            onChange={(event) => updateMetadata("description", event.target.value)}
            placeholder="설명"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={state.metadata.category}
              onChange={(event) => updateMetadata("category", event.target.value)}
              placeholder="category"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            <input
              value={state.metadata.author}
              onChange={(event) => updateMetadata("author", event.target.value)}
              placeholder="author"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
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
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-slate-950">Indicators</h2>
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                addIndicator(event.target.value as BuilderIndicatorType);
                event.target.value = "";
              }
            }}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
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
        <div className="mt-4 grid gap-4">
          {state.indicators.length === 0 ? (
            <p className="text-sm text-slate-500">지표를 하나 이상 추가하세요.</p>
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

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <h2 className="text-2xl font-semibold text-slate-950">Risk</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
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
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <h2 className="text-2xl font-semibold text-slate-950">OpenForge YAML DSL</h2>
      <textarea
        value={source}
        onChange={(event) => onChange(event.target.value)}
        rows={28}
        className="mt-4 w-full rounded-3xl border border-slate-200 px-4 py-4 font-mono text-sm text-slate-800"
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
    <aside className="flex flex-col gap-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <h2 className="text-2xl font-semibold text-slate-950">Validation</h2>
        <p className="mt-3 text-sm text-slate-500">
          {isValidating
            ? "검증 중..."
            : validation
              ? validation.summary
              : "검증 결과가 아직 없습니다."}
        </p>
        {validationError ? (
          <p className="mt-3 text-sm text-rose-600">{validationError}</p>
        ) : null}
        {validation?.errors.length ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-700">Errors</p>
            <ul className="mt-2 grid gap-2 text-sm text-rose-700">
              {validation.errors.map((error, index) => (
                <li key={`${error.category}-${index}`}>
                  [{error.category}] {error.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {validation?.warnings.length ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-700">Warnings</p>
            <ul className="mt-2 grid gap-2 text-sm text-amber-700">
              {validation.warnings.map((warning, index) => (
                <li key={`${warning.category}-${index}`}>
                  [{warning.category}] {warning.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
        <h2 className="text-2xl font-semibold">YAML Preview</h2>
        <pre className="mt-4 overflow-x-auto rounded-3xl bg-black/20 p-4 text-xs leading-6 text-slate-100">
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
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_0.8fr_auto]">
        <select
          value={indicator.indicatorId}
          onChange={(event) =>
            onChange(createDefaultIndicator(event.target.value as BuilderIndicatorType))
          }
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
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
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
        <select
          value={indicator.output}
          onChange={(event) =>
            onChange({
              ...indicator,
              output: event.target.value,
            })
          }
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
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
          className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600"
        >
          Remove
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {Object.entries(definition.defaults).map(([key]) => (
          <label
            key={key}
            className="grid gap-2 text-sm text-slate-600"
          >
            <span>{key}</span>
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
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
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
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
        <div className="flex items-center gap-3">
          <select
            value={group.logic}
            onChange={(event) =>
              onChange({
                ...group,
                logic: event.target.value as BuilderConditionGroup["logic"],
              })
            }
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
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
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Condition 추가
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-4">
        {group.conditions.length === 0 ? (
          <p className="text-sm text-slate-500">조건이 없습니다.</p>
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
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3">
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
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <select
            value={condition.operator}
            onChange={(event) =>
              onChange({
                ...condition,
                operator: event.target.value as BuilderCondition["operator"],
              })
            }
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
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
            className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600"
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
      <span className="text-sm font-medium text-slate-700">{label}</span>
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
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
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
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
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
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
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
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
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
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
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
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(event) =>
              onChange({
                ...value,
                enabled: event.target.checked,
              })
            }
          />
          enabled
        </label>
      </div>
      <input
        type="number"
        value={value.percent}
        onChange={(event) =>
          onChange({
            ...value,
            percent: Number(event.target.value),
          })
        }
        className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
      />
    </article>
  );
}
