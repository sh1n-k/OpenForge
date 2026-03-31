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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10">
      <UniverseDetailView universe={universe} />

      <section className="grid gap-6 md:grid-cols-2">
        <form
          action={handleUpdate}
          className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
        >
          <h2 className="text-2xl font-semibold text-slate-950">Basic Info</h2>
          <div className="mt-4 grid gap-3">
            <input
              name="name"
              defaultValue={universe.name}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            <input
              name="description"
              defaultValue={universe.description ?? ""}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              저장
            </button>
          </div>
        </form>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-2xl font-semibold text-slate-950">Actions</h2>
          <button
            type="button"
            onClick={async () => {
              await archiveUniverse(universe.id);
              startTransition(() => router.push("/universes"));
            }}
            className="mt-4 rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600"
          >
            Archive
          </button>
        </section>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <h2 className="text-2xl font-semibold text-slate-950">Replace Symbols</h2>
        <p className="mt-2 text-sm text-slate-500">
          한 줄에 `symbol,displayName` 형식으로 입력합니다.
        </p>
        <textarea
          value={symbolsText}
          onChange={(event) => setSymbolsText(event.target.value)}
          rows={12}
          className="mt-4 w-full rounded-3xl border border-slate-200 px-4 py-4 font-mono text-sm"
        />
        <button
          type="button"
          onClick={handleReplaceSymbols}
          className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
        >
          종목 리스트 저장
        </button>
      </section>
    </main>
  );
}

