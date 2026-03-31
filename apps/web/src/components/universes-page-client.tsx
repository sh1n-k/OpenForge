"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import {
  archiveUniverse,
  createUniverse,
  type UniverseSummary,
} from "@/lib/api";

type UniversesPageClientProps = {
  universes: UniverseSummary[];
};

export function UniversesPageClient({
  universes,
}: UniversesPageClientProps) {
  const router = useRouter();

  async function handleCreate(formData: FormData) {
    await createUniverse({
      name: String(formData.get("name")),
      description: String(formData.get("description") ?? ""),
    });
    startTransition(() => router.refresh());
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10">
      <section className="rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.3)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Stage 2
            </p>
            <h1 className="mt-2 text-4xl font-semibold">Universe Registry</h1>
          </div>
          <Link
            href="/strategies"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
          >
            Strategies
          </Link>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <h2 className="text-2xl font-semibold text-slate-950">Create Universe</h2>
        <form
          action={handleCreate}
          className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <input
            name="name"
            placeholder="유니버스 이름"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
          <input
            name="description"
            placeholder="설명"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
          <button
            type="submit"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            생성
          </button>
        </form>
      </section>

      <section className="grid gap-4">
        {universes.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">
            저장된 유니버스가 없습니다.
          </div>
        ) : (
          universes.map((universe) => (
            <div
              key={universe.id}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/universes/${universe.id}`}
                    className="text-2xl font-semibold text-slate-950"
                  >
                    {universe.name}
                  </Link>
                  <p className="mt-2 text-sm text-slate-500">
                    {universe.description ?? "설명이 아직 없습니다."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
                    {universe.symbolCount} symbols / {universe.strategyCount} links
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await archiveUniverse(universe.id);
                      startTransition(() => router.refresh());
                    }}
                    className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600"
                  >
                    Archive
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

