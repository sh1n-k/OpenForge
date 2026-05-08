"use client";

import {
  createEmptyCondition,
  type BuilderCondition,
  type BuilderConditionGroup,
  type BuilderIndicator,
} from "@/lib/strategy-editor";
import { ConditionCard } from "./condition-card";

export function ConditionGroupEditor({
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
    <section className="doc-panel">
      <div className="flex items-center justify-between gap-4">
        <h2 className="section-title">{title}</h2>
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
            <option value="AND">모두 충족</option>
            <option value="OR">하나라도 충족</option>
          </select>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...group,
                conditions: [...group.conditions, createEmptyCondition()],
              })
            }
            className="button-primary"
          >
            조건 추가
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-4">
        {group.conditions.length === 0 ? (
          <p className="text-sm text-slate-500">아직 조건이 없습니다.</p>
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
