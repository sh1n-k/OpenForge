"use client";

import {
  createDefaultIndicator,
  getIndicatorDefinition,
  indicatorCatalog,
  type BuilderIndicator,
  type BuilderIndicatorType,
} from "@/lib/strategy-editor";

export function IndicatorCard({
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
    <article className="list-card">
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
          placeholder="별칭"
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
          className="button-danger"
        >
          삭제
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
