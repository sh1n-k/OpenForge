"use client";

import {
  getIndicatorDefinition,
  priceFields,
  type BuilderIndicator,
  type BuilderOperand,
  type BuilderPriceField,
} from "@/lib/strategy-editor";

export function OperandEditor({
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
          <option value="price">가격</option>
          <option value="indicator">지표</option>
          <option value="value">값</option>
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
                <option value="">지표 없음</option>
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
