"use client";

import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  archiveUniverse,
  collectSymbols,
  replaceUniverseSymbols,
  searchSymbols,
  type SymbolCollectResponse,
  type SymbolMasterMarketStatus,
  type SymbolMasterStatusResponse,
  type SymbolSearchItem,
  type UniverseDetail,
  type UniverseMarketScope,
  updateUniverse,
} from "@/lib/api";
import { UniverseDetailView } from "@/components/universe-detail-view";

type UniverseDetailClientProps = {
  universe: UniverseDetail;
  symbolMasterStatus: SymbolMasterStatusResponse;
};

const marketScopeLabel: Record<UniverseMarketScope, string> = {
  domestic: "국내",
  us: "미국",
};

function toMarketStatus(
  response: SymbolMasterStatusResponse,
  marketScope: UniverseMarketScope,
): SymbolMasterMarketStatus {
  const current = response.markets?.find((market) => market.marketScope === marketScope);
  if (current) return current;

  return {
    marketScope,
    totalCount:
      response.totalCount ??
      (marketScope === "domestic"
        ? (response.kospiCount ?? 0) + (response.kosdaqCount ?? 0)
        : 0),
    collectedAt: response.collectedAt ?? null,
    needsUpdate: response.needsUpdate ?? true,
    exchangeCounts: [],
  };
}

function mergeMarketStatus(
  current: SymbolMasterStatusResponse,
  next: SymbolCollectResponse,
): SymbolMasterStatusResponse {
  const markets = current.markets ?? [];
  const collectedAt = new Date().toISOString();
  const updatedMarket: SymbolMasterMarketStatus = {
    marketScope: next.marketScope,
    totalCount: next.totalCount,
    collectedAt,
    needsUpdate: !next.success,
    exchangeCounts: next.exchangeCounts,
  };
  const existingIndex = markets.findIndex((market) => market.marketScope === next.marketScope);

  if (existingIndex < 0) {
    return {
      ...current,
      markets: [...markets, updatedMarket],
    };
  }

  return {
    ...current,
    markets: markets.map((market, index) => (index === existingIndex ? updatedMarket : market)),
  };
}

export function UniverseDetailClient({
  universe,
  symbolMasterStatus,
}: UniverseDetailClientProps) {
  const router = useRouter();
  const [symbolsText, setSymbolsText] = useState(
    universe.symbols
      .map((symbol) => `${symbol.symbol},${symbol.exchange},${symbol.displayName}`)
      .join("\n"),
  );
  const [masterStatus, setMasterStatus] = useState(symbolMasterStatus);
  const symbolSectionRef = useRef<HTMLElement>(null);

  const addedCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const line of symbolsText.split("\n")) {
      const [symbol, exchange] = line.split(",").map((value) => value.trim());
      const code = symbol && exchange ? `${symbol}:${exchange}` : null;
      if (code) codes.add(code);
    }
    return codes;
  }, [symbolsText]);

  const marketStatus = useMemo(
    () => toMarketStatus(masterStatus, universe.marketScope),
    [masterStatus, universe.marketScope],
  );

  const handleAddSymbol = useCallback((item: SymbolSearchItem) => {
    setSymbolsText((current) => {
      const lines = current.split("\n").filter((line) => line.trim());
      const exists = lines.some((line) => {
        const [symbol, exchange] = line.split(",").map((value) => value.trim());
        return symbol === item.code && exchange === item.exchange;
      });
      if (exists) return current;
      const newLine = `${item.code},${item.exchange},${item.name}`;

      const el = symbolSectionRef.current;
      if (el) {
        el.classList.remove("symbol-section-pulse");
        void el.offsetWidth;
        el.classList.add("symbol-section-pulse", "ring-2", "ring-primary", "transition-all", "duration-500");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 500);
      }

      return lines.length > 0 ? `${current.trimEnd()}\n${newLine}` : newLine;
    });
  }, []);

  async function handleUpdate(formData: FormData) {
    await updateUniverse(universe.id, {
      name: String(formData.get("name")),
      description: String(formData.get("description") ?? ""),
    });
    startTransition(() => router.refresh());
  }

  async function handleReplaceSymbols() {
    const symbols = symbolsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [symbol, exchange, displayName] = line.split(",").map((value) => value.trim());
        return {
          symbol,
          exchange,
          displayName: displayName || symbol,
          market: universe.marketScope,
          sortOrder: index,
        };
      });

    await replaceUniverseSymbols(universe.id, symbols);
    startTransition(() => router.refresh());
  }

  return (
    <main className="grid content-start gap-8 w-[min(100%,var(--content-width))] mx-auto px-5 pt-8 pb-16">
      <UniverseDetailView universe={universe} />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <form action={handleUpdate} id="universe-basic-info" className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm mb-6 w-full">
          <div className="mb-6 pb-4 border-b border-border/60">
            <h2 className="m-0 font-sans text-xl font-bold text-foreground">기본 정보</h2>
          </div>
          <div className="grid gap-5">
            <label className="grid gap-1.5 focus-within:text-primary">
              <span className="text-subtle text-sm font-medium transition-colors">유니버스 이름</span>
              <input 
                name="name" 
                defaultValue={universe.name} 
                className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
              />
            </label>
            <label className="grid gap-1.5 focus-within:text-primary">
              <span className="text-subtle text-sm font-medium transition-colors">설명</span>
              <input 
                name="description" 
                defaultValue={universe.description ?? ""} 
                className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 mt-2 pt-4 border-t border-border-soft">
              <button type="submit" className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                저장
              </button>
            </div>
          </div>
        </form>

        <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm mb-6 w-full">
          <div className="mb-6 pb-4 border-b border-border/60">
            <h2 className="m-0 font-sans text-xl font-bold text-foreground">관리</h2>
          </div>
          <p className="m-0 text-muted text-[0.9375rem] leading-relaxed mb-6">
            보존이 필요한 정보는 먼저 다른 유니버스로 옮긴 뒤 보관 처리합니다.
          </p>
          <button
            type="button"
            onClick={async () => {
              await archiveUniverse(universe.id);
              startTransition(() => router.push("/universes"));
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg bg-error hover:bg-red-700 text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error"
          >
            보관 처리
          </button>
        </section>
      </section>

      <SymbolSearchSection
        marketScope={universe.marketScope}
        marketStatus={marketStatus}
        onAdd={handleAddSymbol}
        onCollectStatusChange={(next) => setMasterStatus((current) => mergeMarketStatus(current, next))}
        addedCodes={addedCodes}
      />

      <section ref={symbolSectionRef} className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm">
        <div className="mb-6 pb-4 border-b border-border/60">
          <h2 className="m-0 font-sans text-xl font-bold text-foreground">심볼 구성</h2>
        </div>
        <p className="m-0 text-muted text-[0.9375rem] leading-relaxed mb-4">
          한 줄에 <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-sm font-mono border border-slate-200">종목코드,거래소,표시명</code> 형식으로 입력합니다.
          위 검색에서 종목을 추가하면 자동으로 반영됩니다.
        </p>
        <textarea
          value={symbolsText}
          onChange={(event) => setSymbolsText(event.target.value)}
          rows={12}
          className="w-full px-4 py-3 bg-[#fafafa] text-foreground border border-border hover:border-gray-300 rounded-xl shadow-inner focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all font-mono leading-relaxed mb-6 resize-y"
        />
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border-soft">
          <button
            type="button"
            onClick={handleReplaceSymbols}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            종목 리스트 저장
          </button>
        </div>
      </section>
    </main>
  );
}

function SymbolSearchSection({
  marketScope,
  marketStatus,
  onAdd,
  onCollectStatusChange,
  addedCodes,
}: {
  marketScope: UniverseMarketScope;
  marketStatus: SymbolMasterMarketStatus;
  onAdd: (item: SymbolSearchItem) => void;
  onCollectStatusChange: (next: SymbolCollectResponse) => void;
  addedCodes: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolSearchItem[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await searchSymbols(query.trim(), marketScope);
        setResults(response.items);
      } catch {
        setResults([]);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [marketScope, query]);

  function handleAdd(item: SymbolSearchItem) {
    const codeKey = `${item.code}:${item.exchange}`;
    if (addedCodes.has(codeKey)) return;
    onAdd(item);
    setRecentlyAdded((prev) => new Set(prev).add(codeKey));
    setTimeout(() => {
      setRecentlyAdded((prev) => {
        const next = new Set(prev);
        next.delete(codeKey);
        return next;
      });
    }, 1200);
  }

  async function handleCollect() {
    try {
      setIsCollecting(true);
      setCollectError(null);
      const result = await collectSymbols(marketScope);
      if (!result.success) {
        setCollectError(`수집 실패: ${result.errors.join(", ")}`);
      }
      onCollectStatusChange(result);
    } catch (e) {
      setCollectError(e instanceof Error ? e.message : "마스터파일 수집에 실패했습니다.");
    } finally {
      setIsCollecting(false);
    }
  }

  return (
    <section className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-border/60">
        <h2 className="m-0 font-sans text-xl font-bold text-foreground">종목 검색</h2>
        <div className="flex items-center gap-3 text-[0.9375rem] text-slate-500 font-medium">
          <span>
            {marketStatus.totalCount > 0
              ? `${marketStatus.totalCount.toLocaleString()}종목 수집됨`
              : "미수집"}
          </span>
          <button
            type="button"
            onClick={handleCollect}
            disabled={isCollecting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg bg-surface border border-border text-foreground hover:bg-[#fafafa] hover:border-gray-300 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border disabled:opacity-50 text-sm"
          >
            {isCollecting ? "수집 중..." : marketStatus.needsUpdate ? "마스터 최신화" : "마스터 재수집"}
          </button>
        </div>
      </div>

      {collectError ? (
        <p className="m-0 p-4 rounded-xl bg-error-soft border border-error/20 text-[0.9375rem] font-medium text-error flex items-start gap-2 mb-6">
          {collectError}
        </p>
      ) : null}

      <p className="m-0 text-muted text-[0.9375rem] leading-relaxed mb-4">
        {marketScopeLabel[marketScope]} 시장의 종목코드 또는 이름으로 검색하여 유니버스에 추가합니다.
      </p>
      
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            marketScope === "us"
              ? "티커 또는 이름 (예: AAPL, Apple)"
              : "종목코드 또는 이름 (예: 삼성전자, 005930)"
          }
          className="w-full pl-10 pr-4 py-3 bg-surface text-foreground border border-border hover:border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
        />
      </div>

      {results.length > 0 ? (
        <div className="grid gap-3 mt-4 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {results.map((item) => {
            const codeKey = `${item.code}:${item.exchange}`;
            const isRecent = recentlyAdded.has(codeKey);
            const isAdded = addedCodes.has(codeKey);
            return (
              <button
                key={`${item.code}-${item.exchange}`}
                type="button"
                onClick={() => handleAdd(item)}
                className={[
                  "p-4 bg-surface border border-border-soft rounded-xl shadow-sm hover:shadow hover:border-primary/50 transition-all group flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer w-full",
                  isRecent ? "bg-success-soft/30 border-success/50 ring-2 ring-success/30" : "",
                  isAdded && !isRecent ? "opacity-60 bg-slate-50 border-transparent hover:border-transparent hover:shadow-none pointer-events-none" : "",
                ].join(" ")}
              >
                <div className="grid gap-1">
                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-bold text-[0.9375rem] ${isAdded ? "text-slate-500" : "text-foreground"}`}>{item.code}</span>
                    <span className="text-muted text-[0.9375rem] truncate max-w-[200px] sm:max-w-[300px]">{item.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm font-bold uppercase bg-info-soft text-info border border-info/20">
                    {marketScopeLabel[item.marketScope]}
                  </span>
                  <span className="bg-surface px-1.5 py-0.5 rounded border border-border">{item.exchange}</span>
                  {isRecent ? (
                    <span className="text-success font-semibold px-2 py-0.5 bg-success-soft rounded-full ml-2">
                      추가됨
                    </span>
                  ) : isAdded ? (
                    <span className="text-muted font-medium ml-2">추가됨</span>
                  ) : (
                    <span className="text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity ml-2">추가하기</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
