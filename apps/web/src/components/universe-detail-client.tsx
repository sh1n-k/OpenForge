"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import {
  archiveUniverse,
  collectSymbols,
  replaceUniverseSymbols,
  searchSymbols,
  type SymbolMasterStatusResponse,
  type SymbolSearchItem,
  type UniverseDetail,
  updateUniverse,
} from "@/lib/api";
import { UniverseDetailView } from "@/components/universe-detail-view";

type UniverseDetailClientProps = {
  universe: UniverseDetail;
  symbolMasterStatus: SymbolMasterStatusResponse;
};

export function UniverseDetailClient({
  universe,
  symbolMasterStatus,
}: UniverseDetailClientProps) {
  const router = useRouter();
  const [symbolsText, setSymbolsText] = useState(
    universe.symbols
      .map((symbol) => `${symbol.symbol},${symbol.displayName}`)
      .join("\n"),
  );

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
        const [symbol, displayName] = line.split(",").map((value) => value.trim());
        return {
          symbol,
          displayName: displayName || symbol,
          market: "domestic" as const,
          sortOrder: index,
        };
      });

    await replaceUniverseSymbols(universe.id, symbols);
    startTransition(() => router.refresh());
  }

  function handleAddSymbol(item: SymbolSearchItem) {
    setSymbolsText((current) => {
      const lines = current.split("\n").filter((line) => line.trim());
      const exists = lines.some((line) => line.startsWith(`${item.code},`));
      if (exists) return current;
      const newLine = `${item.code},${item.name}`;
      return lines.length > 0 ? `${current.trimEnd()}\n${newLine}` : newLine;
    });
  }

  return (
    <main className="page-shell docs-page-shell">
      <UniverseDetailView universe={universe} />

      <section className="summary-grid summary-grid-columns-2">
        <form
          action={handleUpdate}
          id="universe-basic-info"
          className="doc-panel"
        >
          <h2 className="section-title">기본 정보</h2>
          <div className="mt-4 grid gap-3">
            <input
              name="name"
              defaultValue={universe.name}
            />
            <input
              name="description"
              defaultValue={universe.description ?? ""}
            />
            <button
              type="submit"
              className="button-primary"
            >
              저장
            </button>
          </div>
        </form>

        <section className="doc-panel">
          <h2 className="section-title">관리</h2>
          <p className="section-copy">보존이 필요한 정보는 먼저 다른 유니버스로 옮긴 뒤 보관 처리합니다.</p>
          <button
            type="button"
            onClick={async () => {
              await archiveUniverse(universe.id);
              startTransition(() => router.push("/universes"));
            }}
            className="button-danger mt-4"
          >
            보관 처리
          </button>
        </section>
      </section>

      <SymbolSearchSection
        symbolMasterStatus={symbolMasterStatus}
        onAdd={handleAddSymbol}
      />

      <section className="doc-panel doc-panel-code">
        <h2 className="section-title">심볼 구성</h2>
        <p className="section-copy">
          한 줄에 <code className="inline-code">종목코드,표시명</code> 형식으로 입력합니다.
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
          className="button-primary mt-4"
        >
          종목 리스트 저장
        </button>
      </section>
    </main>
  );
}

function SymbolSearchSection({
  symbolMasterStatus,
  onAdd,
}: {
  symbolMasterStatus: SymbolMasterStatusResponse;
  onAdd: (item: SymbolSearchItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolSearchItem[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [masterStatus, setMasterStatus] = useState(symbolMasterStatus);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await searchSymbols(query.trim());
        setResults(response.items);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function handleCollect() {
    try {
      setIsCollecting(true);
      setCollectError(null);
      const result = await collectSymbols();
      if (!result.success) {
        setCollectError(`수집 실패: ${result.errors.join(", ")}`);
      }
      setMasterStatus({
        kospiCount: result.kospiCount,
        kosdaqCount: result.kosdaqCount,
        totalCount: result.totalCount,
        collectedAt: new Date().toISOString(),
        needsUpdate: !result.success,
      });
    } catch (e) {
      setCollectError(e instanceof Error ? e.message : "마스터파일 수집에 실패했습니다.");
    } finally {
      setIsCollecting(false);
    }
  }

  return (
    <section className="doc-panel">
      <div className="flex items-center justify-between gap-4">
        <h2 className="section-title">종목 검색</h2>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>
            {masterStatus.totalCount > 0
              ? `${masterStatus.totalCount.toLocaleString()}종목 수집됨`
              : "미수집"}
          </span>
          <button
            type="button"
            onClick={handleCollect}
            disabled={isCollecting}
            className="button-secondary"
          >
            {isCollecting ? "수집 중..." : masterStatus.needsUpdate ? "마스터 최신화" : "마스터 재수집"}
          </button>
        </div>
      </div>
      {collectError ? <p className="inline-error" style={{ marginTop: 8 }}>{collectError}</p> : null}
      <p className="section-copy">종목코드 또는 이름으로 검색하여 유니버스에 추가합니다.</p>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="종목코드 또는 이름 (예: 삼성전자, 005930)"
        className="mt-4 w-full"
      />
      {results.length > 0 ? (
        <div className="stack-list" style={{ marginTop: 12, maxHeight: 320, overflowY: "auto" }}>
          {results.map((item) => (
            <button
              key={`${item.code}-${item.exchange}`}
              type="button"
              onClick={() => onAdd(item)}
              className="list-card flex-between w-full text-left"
            >
              <div>
                <span className="font-semibold">{item.code}</span>
                <span className="ml-3 text-slate-600">{item.name}</span>
              </div>
              <span className="text-xs text-slate-400">{item.exchange}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
