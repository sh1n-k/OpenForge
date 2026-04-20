import type { UniverseDetail } from "@/lib/api";

type UniverseDetailViewProps = {
  universe: UniverseDetail;
};

const marketScopeLabel = {
  domestic: "국내",
  us: "미국",
} as const;

export function UniverseDetailView({ universe }: UniverseDetailViewProps) {
  return (
    <section
      id="universe-overview"
      className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm mb-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-6 mb-2 pb-6 border-b border-border-soft">
        <div className="grid gap-2">
          <p className="m-0 text-primary font-bold tracking-wider uppercase text-xs">
            유니버스 상세
          </p>
          <h1 className="m-0 font-sans text-3xl font-bold tracking-tight text-foreground">
            {universe.name}
          </h1>
          <p className="m-0 text-muted font-medium flex items-center gap-2">
            {universe.description ?? "설명이 아직 없습니다."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-[0.9375rem] bg-[#fafafa] p-4 rounded-xl border border-border-soft">
          <div className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-info-soft text-info border border-info/20 mb-1 self-end">
            {marketScopeLabel[universe.marketScope]}
          </div>
          <div className="text-muted font-medium"><span className="text-foreground tracking-tight">{universe.symbolCount}</span>개 종목</div>
          <div className="text-muted font-medium"><span className="text-foreground tracking-tight">{universe.strategyCount}</span>개 연결 전략</div>
        </div>
      </div>

      <div
        id="universe-symbols"
        className="grid gap-3 mt-6"
      >
        {universe.symbols.length === 0 ? (
          <div className="grid justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center shadow-sm bg-surface">
            <p className="m-0 text-foreground font-semibold text-[1.0625rem]">등록된 종목이 없습니다</p>
            <p className="m-0 text-muted max-w-sm text-[0.9375rem] mt-2">아래에서 종목을 추가하세요.</p>
          </div>
        ) : (
          <div className="max-h-[320px] overflow-y-auto pr-2 grid gap-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {universe.symbols.map((symbol) => (
              <div
                key={`${symbol.symbol}-${symbol.exchange}`}
                className="p-4 bg-[#fafafa] border border-border-soft rounded-xl flex items-center justify-between text-sm"
              >
                <div className="grid gap-1">
                  <div className="font-semibold text-foreground text-[0.9375rem]">
                    {symbol.displayName}
                  </div>
                  <div className="text-muted text-[0.8125rem] font-mono">{symbol.symbol} · {symbol.exchange}</div>
                </div>
                <div className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase bg-surface px-2 py-0.5 rounded border border-border">{marketScopeLabel[symbol.market]}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
