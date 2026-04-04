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
      className="doc-panel detail-section-card"
    >
      <div className="detail-hero-grid">
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
        <div className="detail-hero-meta-card">
          <div className="status-chip status-chip-info">
            {marketScopeLabel[universe.marketScope]}
          </div>
          <div className="text-muted">{universe.symbolCount}개 종목</div>
          <div className="text-muted">{universe.strategyCount}개 연결 전략</div>
        </div>
      </div>

      <div
        id="universe-symbols"
        className="stack-list section-stack-top"
      >
        {universe.symbols.length === 0 ? (
          <div className="empty-state empty-state-compact">
            <p className="empty-state-message">등록된 종목이 없습니다</p>
            <p className="empty-state-hint">아래에서 종목을 추가하세요.</p>
          </div>
        ) : (
          universe.symbols.map((symbol) => (
            <div
              key={`${symbol.symbol}-${symbol.exchange}`}
              className="list-card flex items-center justify-between text-sm"
            >
              <div>
                <div className="doc-nav-title">
                  {symbol.displayName}
                </div>
                <div className="doc-nav-description">{symbol.symbol} · {symbol.exchange}</div>
              </div>
              <div className="metric-card-label">{marketScopeLabel[symbol.market]}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
