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
        el.classList.add("symbol-section-pulse");
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
    <main className="page-shell docs-page-shell page-shell-detail">
      <UniverseDetailView universe={universe} />

      <section className="summary-grid summary-grid-columns-2">
        <form action={handleUpdate} id="universe-basic-info" className="doc-panel detail-section-card">
          <h2 className="section-title">기본 정보</h2>
          <div className="page-stack-12">
            <input name="name" defaultValue={universe.name} />
            <input name="description" defaultValue={universe.description ?? ""} />
            <button type="submit" className="button-primary">
              저장
            </button>
          </div>
        </form>

        <section className="doc-panel detail-section-card">
          <h2 className="section-title">관리</h2>
          <p className="section-copy">
            보존이 필요한 정보는 먼저 다른 유니버스로 옮긴 뒤 보관 처리합니다.
          </p>
          <button
            type="button"
            onClick={async () => {
              await archiveUniverse(universe.id);
              startTransition(() => router.push("/universes"));
            }}
            className="button-danger"
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

      <section ref={symbolSectionRef} className="doc-panel doc-panel-code detail-section-card">
        <h2 className="section-title">심볼 구성</h2>
        <p className="section-copy">
          한 줄에 <code className="inline-code">종목코드,거래소,표시명</code> 형식으로 입력합니다.
          위 검색에서 종목을 추가하면 자동으로 반영됩니다.
        </p>
        <textarea
          value={symbolsText}
          onChange={(event) => setSymbolsText(event.target.value)}
          rows={12}
        />
        <button
          type="button"
          onClick={handleReplaceSymbols}
          className="button-primary"
        >
          종목 리스트 저장
        </button>
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
    <section className="doc-panel detail-section-card">
      <div className="flex items-center justify-between gap-4">
        <h2 className="section-title">종목 검색</h2>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>
            {marketStatus.totalCount > 0
              ? `${marketStatus.totalCount.toLocaleString()}종목 수집됨`
              : "미수집"}
          </span>
          <button
            type="button"
            onClick={handleCollect}
            disabled={isCollecting}
            className="button-secondary"
          >
            {isCollecting ? "수집 중..." : marketStatus.needsUpdate ? "마스터 최신화" : "마스터 재수집"}
          </button>
        </div>
      </div>

      {collectError ? (
        <p className="inline-error">
          {collectError}
        </p>
      ) : null}

      <p className="section-copy">
        {marketScopeLabel[marketScope]} 시장의 종목코드 또는 이름으로 검색하여 유니버스에 추가합니다.
      </p>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={
          marketScope === "us"
            ? "티커 또는 이름 (예: AAPL, Apple)"
            : "종목코드 또는 이름 (예: 삼성전자, 005930)"
        }
        className="w-full"
      />

      {results.length > 0 ? (
        <div className="stack-list section-stack-top-sm scroll-stack-320">
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
                  "list-card flex-between w-full text-left",
                  isRecent ? "symbol-added-flash" : "",
                  isAdded && !isRecent ? "opacity-50" : "",
                ].join(" ")}
                style={isAdded && !isRecent ? { cursor: "default" } : undefined}
              >
                <div>
                  <span className="font-semibold">{item.code}</span>
                  <span className="ml-3 text-slate-600">{item.name}</span>
                </div>
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="status-chip status-chip-info">
                    {marketScopeLabel[item.marketScope]}
                  </span>
                  <span>{item.exchange}</span>
                  {isRecent ? (
                    <span className="text-success">
                      추가됨
                    </span>
                  ) : isAdded ? (
                    <span className="text-xs text-slate-400">추가됨</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
