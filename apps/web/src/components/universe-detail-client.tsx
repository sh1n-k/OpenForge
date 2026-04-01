"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  archiveUniverse,
  replaceUniverseSymbols,
  type UniverseDetail,
  updateUniverse,
} from "@/lib/api";
import { UniverseDetailView } from "@/components/universe-detail-view";

type UniverseDetailClientProps = {
  universe: UniverseDetail;
};

export function UniverseDetailClient({
  universe,
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

  return (
    <main className="page-shell docs-page-shell">
      <UniverseDetailView universe={universe} />

      <section className="summary-grid summary-grid-columns-2">
        <form
          action={handleUpdate}
          id="universe-basic-info"
          className="doc-panel"
        >
          <h2 className="section-title">Basic Info</h2>
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
          <h2 className="section-title">Actions</h2>
          <p className="section-copy">보존이 필요한 정보는 먼저 다른 유니버스로 옮긴 뒤 보관 처리합니다.</p>
          <button
            type="button"
            onClick={async () => {
              await archiveUniverse(universe.id);
              startTransition(() => router.push("/universes"));
            }}
            className="button-danger mt-4"
          >
            Archive
          </button>
        </section>
      </section>

      <section className="doc-panel doc-panel-code">
        <h2 className="section-title">Replace Symbols</h2>
        <p className="section-copy">
          한 줄에 `symbol,displayName` 형식으로 입력합니다.
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
