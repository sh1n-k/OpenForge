"use client";

import {
  conditionOperators,
  type BuilderCondition,
  type BuilderIndicator,
} from "@/lib/strategy-editor";
import { OperandEditor } from "./operand-editor";

export function ConditionCard({
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
    <article className="list-card">
      <div className="grid gap-3">
        <OperandEditor
          label="왼쪽"
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
            className="button-danger"
          >
            삭제
          </button>
        </div>
        <OperandEditor
          label="오른쪽"
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
