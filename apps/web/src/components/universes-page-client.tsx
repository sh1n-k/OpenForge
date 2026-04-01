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
    <main className="page-shell docs-page-shell">
      <section
        id="universes-summary"
        className="doc-panel"
      >
        <div className="page-intro-row">
          <div className="page-intro">
            <p className="page-eyebrow">Universes</p>
            <h1 className="page-title">Universe Registry</h1>
            <p className="page-description">
              전략에 연결할 종목 집합을 관리합니다. 설명, 심볼 수, 연결된 전략 수를 한 화면에서 읽을 수 있게 정리합니다.
            </p>
          </div>
          <div className="page-actions">
            <span className="status-chip status-chip-info">{universes.length} universes</span>
          </div>
        </div>
        <div className="page-actions">
          <Link
            href="/strategies"
            className="button-secondary"
          >
            Strategies
          </Link>
        </div>
      </section>

      <section
        id="universes-create"
        className="doc-panel"
      >
        <h2 className="section-title">Create Universe</h2>
        <p className="section-copy">이름과 설명만 먼저 등록하고, 상세 화면에서 심볼 구성을 이어서 편집합니다.</p>
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
            className="button-primary"
          >
            생성
          </button>
        </form>
      </section>

      <section
        id="universes-registry"
        className="stack-list"
      >
        {universes.length === 0 ? (
          <div className="doc-panel doc-panel-soft text-center">
            저장된 유니버스가 없습니다.
          </div>
        ) : (
          universes.map((universe) => (
            <div
              key={universe.id}
              className="doc-panel"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/universes/${universe.id}`}
                    className="section-title"
                  >
                    {universe.name}
                  </Link>
                  <p className="section-copy">
                    {universe.description ?? "설명이 아직 없습니다."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="list-card">
                    {universe.symbolCount} symbols / {universe.strategyCount} links
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await archiveUniverse(universe.id);
                      startTransition(() => router.refresh());
                    }}
                    className="button-danger"
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
