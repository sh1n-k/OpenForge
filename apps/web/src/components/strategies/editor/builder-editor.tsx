"use client";

import {
  createDefaultIndicator,
  indicatorCatalog,
  type BuilderConditionGroup,
  type BuilderIndicator,
  type BuilderIndicatorType,
  type BuilderState,
} from "@/lib/strategy-editor";
import { ConditionGroupEditor } from "./condition-group-editor";
import { IndicatorCard } from "./indicator-card";
import { RiskCard } from "./risk-card";

export function BuilderEditor({
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
        className="doc-panel"
      >
        <h2 className="section-title">전략 정보</h2>
        <p className="section-copy">이름, 설명, 작성자, 태그를 먼저 정리합니다.</p>
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
              placeholder="카테고리"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            <input
              value={state.metadata.author}
              onChange={(event) => updateMetadata("author", event.target.value)}
              placeholder="작성자"
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

      <section className="doc-panel">
        <div className="flex items-center justify-between gap-4">
          <h2 className="section-title">지표</h2>
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
            <p className="text-sm text-slate-500">시그널 계산에 필요한 지표를 하나 이상 추가하세요.</p>
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
        title="진입 조건"
        group={state.entry}
        aliases={state.indicators}
        onChange={(nextGroup) => updateGroup("entry", nextGroup)}
      />
      <ConditionGroupEditor
        title="청산 조건"
        group={state.exit}
        aliases={state.indicators}
        onChange={(nextGroup) => updateGroup("exit", nextGroup)}
      />

      <section className="doc-panel">
        <h2 className="section-title">리스크 한도</h2>
        <p className="section-copy">비활성화하면 해당 제한을 적용하지 않습니다.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <RiskCard
            title="손절"
            value={state.risk.stopLoss}
            onChange={(next) => updateRisk("stopLoss", next)}
          />
          <RiskCard
            title="익절"
            value={state.risk.takeProfit}
            onChange={(next) => updateRisk("takeProfit", next)}
          />
          <RiskCard
            title="트레일링 스톱"
            value={state.risk.trailingStop}
            onChange={(next) => updateRisk("trailingStop", next)}
          />
        </div>
      </section>
    </>
  );
}
