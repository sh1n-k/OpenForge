import type { UniverseDetail } from "@/lib/api";

type UniverseDetailViewProps = {
  universe: UniverseDetail;
};

export function UniverseDetailView({ universe }: UniverseDetailViewProps) {
  return (
    <section
      id="universe-overview"
      className="doc-panel"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="page-intro">
          <p className="page-eyebrow">
            Universe Detail
          </p>
          <h1 className="page-title">
            {universe.name}
          </h1>
          <p className="page-description">
            {universe.description ?? "설명이 아직 없습니다."}
          </p>
        </div>
        <div className="list-card">
          <div>{universe.symbolCount} symbols</div>
          <div>{universe.strategyCount} linked strategies</div>
        </div>
      </div>

      <div
        id="universe-symbols"
        className="mt-6 stack-list"
      >
        {universe.symbols.length === 0 ? (
          <div className="doc-panel doc-panel-soft text-center">
            등록된 종목이 없습니다.
          </div>
        ) : (
          universe.symbols.map((symbol) => (
            <div
              key={symbol.symbol}
              className="list-card flex items-center justify-between text-sm"
            >
              <div>
                <div className="doc-nav-title">
                  {symbol.displayName}
                </div>
                <div className="doc-nav-description">{symbol.symbol}</div>
              </div>
              <div className="metric-card-label">
                {symbol.market}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
