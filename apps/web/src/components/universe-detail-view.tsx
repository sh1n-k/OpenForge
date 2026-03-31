import type { UniverseDetail } from "@/lib/api";

type UniverseDetailViewProps = {
  universe: UniverseDetail;
};

export function UniverseDetailView({ universe }: UniverseDetailViewProps) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Universe Detail
          </p>
          <h1 className="text-3xl font-semibold text-slate-950">
            {universe.name}
          </h1>
          <p className="text-sm text-slate-500">
            {universe.description ?? "설명이 아직 없습니다."}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          <div>{universe.symbolCount} symbols</div>
          <div>{universe.strategyCount} linked strategies</div>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {universe.symbols.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            등록된 종목이 없습니다.
          </div>
        ) : (
          universe.symbols.map((symbol) => (
            <div
              key={symbol.symbol}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            >
              <div>
                <div className="font-semibold text-slate-900">
                  {symbol.displayName}
                </div>
                <div className="text-slate-500">{symbol.symbol}</div>
              </div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                {symbol.market}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

