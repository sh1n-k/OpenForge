"use client";

export function RiskCard({
  title,
  value,
  onChange,
}: {
  title: string;
  value: { enabled: boolean; percent: number };
  onChange: (value: { enabled: boolean; percent: number }) => void;
}) {
  return (
    <article className="list-card">
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
          활성화
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
