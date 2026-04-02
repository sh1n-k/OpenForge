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
            유니버스 상세
          </p>
          <h1 className="page-title">
            {universe.name}
          </h1>
          <p className="page-description">
            {universe.description ?? "설명이 아직 없습니다."}
          </p>
        </div>
        <div className="list-card">
          <div>{universe.symbolCount}개 종목</div>
          <div>{universe.strategyCount}개 연결 전략</div>
        </div>
      </div>

      <div
        id="universe-symbols"
        className="mt-6 stack-list"
      >
        {universe.symbols.length === 0 ? (
          <div className="empty-state empty-state-compact">
            <p className="empty-state-message">등록된 종목이 없습니다</p>
            <p className="empty-state-hint">아래에서 종목을 추가하세요.</p>
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
