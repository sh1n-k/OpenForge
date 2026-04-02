"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import {
  archiveUniverse,
  createUniverse,
  type UniverseMarketScope,
  type UniverseSummary,
} from "@/lib/api";

type UniversesPageClientProps = {
  universes: UniverseSummary[];
};

const marketScopeLabel: Record<UniverseMarketScope, string> = {
  domestic: "국내",
  us: "미국",
};

export function UniversesPageClient({
  universes,
}: UniversesPageClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeMarketScope, setActiveMarketScope] =
    useState<UniverseMarketScope>("domestic");

  const marketUniverses = useMemo(
    () => universes.filter((universe) => universe.marketScope === activeMarketScope),
    [activeMarketScope, universes],
  );

  async function handleCreate(formData: FormData) {
    const name = String(formData.get("name")).trim();
    if (!name) return;
    try {
      setError(null);
      setIsCreating(true);
      const marketScope = String(formData.get("marketScope") ?? "domestic") as UniverseMarketScope;
      await createUniverse({
        name,
        description: String(formData.get("description") ?? "").trim(),
        marketScope,
      });
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "유니버스 생성에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleArchive(universeId: string) {
    if (!window.confirm("이 유니버스를 보관합니까? 목록에서 사라집니다.")) return;
    await archiveUniverse(universeId);
    startTransition(() => router.refresh());
  }

  return (
    <main className="page-shell docs-page-shell">
      <section id="universes-summary" className="page-intro">
        <p className="page-eyebrow">Universes</p>
        <h1 className="page-title">유니버스 레지스트리</h1>
        <p className="page-description">
          국내와 미국 시장을 분리해서 전략에 연결할 종목 집합을 관리합니다.
        </p>
      </section>

      {error ? (
        <div className="doc-panel doc-panel-error">
          <p className="section-copy">{error}</p>
        </div>
      ) : null}

      <section id="universes-create" className="doc-panel">
        <h2 className="section-title">유니버스 생성</h2>
        <p className="section-copy">
          이름, 설명, 시장을 먼저 등록하고 상세 화면에서 심볼 구성을 편집합니다.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await handleCreate(new FormData(e.currentTarget));
          }}
          className="grid-section"
        >
          <div className="form-row">
            <label className="form-field">
              <span className="form-label">이름</span>
              <input name="name" required placeholder="예: KOSPI 200 대형주" />
            </label>
            <label className="form-field">
              <span className="form-label">설명 (선택)</span>
              <input name="description" placeholder="유니버스에 대한 간단한 설명" />
            </label>
            <label className="form-field">
              <span className="form-label">시장</span>
              <select name="marketScope" defaultValue="domestic">
                <option value="domestic">{marketScopeLabel.domestic}</option>
                <option value="us">{marketScopeLabel.us}</option>
              </select>
            </label>
          </div>
          <div>
            <button type="submit" className="button-primary" disabled={isCreating}>
              {isCreating ? "생성 중..." : "유니버스 생성"}
            </button>
          </div>
        </form>
      </section>

      <section id="universes-registry">
        <div className="flex-between" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            유니버스 목록
            <span className="section-count">{universes.length}개</span>
          </h2>
          <span className="status-chip status-chip-info">
            {marketScopeLabel[activeMarketScope]}
          </span>
        </div>

        <div className="settings-tabs" role="tablist" aria-label="유니버스 시장 탭">
          {(["domestic", "us"] as UniverseMarketScope[]).map((marketScope) => (
            <button
              key={marketScope}
              type="button"
              role="tab"
              aria-selected={activeMarketScope === marketScope}
              className={`settings-tab ${activeMarketScope === marketScope ? "settings-tab-active" : ""}`}
              onClick={() => setActiveMarketScope(marketScope)}
            >
              {marketScopeLabel[marketScope]}
              <span className="section-count" style={{ marginLeft: 8 }}>
                {universes.filter((universe) => universe.marketScope === marketScope).length}
              </span>
            </button>
          ))}
        </div>

        {marketUniverses.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-message">
              {marketScopeLabel[activeMarketScope]} 유니버스가 없습니다
            </p>
            <p className="empty-state-hint">
              상단 폼에서 {marketScopeLabel[activeMarketScope]} 시장 유니버스를 생성한 뒤 종목을 추가하세요.
            </p>
          </div>
        ) : (
          <div className="stack-list">
            {marketUniverses.map((universe) => (
              <div key={universe.id} className="list-card">
                <div className="flex-between">
                  <div>
                    <Link href={`/universes/${universe.id}`} className="table-link" style={{ fontSize: "1.0625rem", fontWeight: 600 }}>
                      {universe.name}
                    </Link>
                    {universe.description ? (
                      <p className="section-copy" style={{ marginTop: 2 }}>{universe.description}</p>
                    ) : null}
                  </div>
                  <div className="flex-center" style={{ gap: 12 }}>
                    <div style={{ textAlign: "right" }}>
                      <div className="status-chip status-chip-info" style={{ marginLeft: "auto" }}>
                        {marketScopeLabel[universe.marketScope]}
                      </div>
                      <div className="text-subtle" style={{ fontSize: "0.75rem" }}>{universe.symbolCount ?? 0}개 종목</div>
                      <div className="text-subtle" style={{ fontSize: "0.75rem" }}>{universe.strategyCount ?? 0}개 전략 연결</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleArchive(universe.id)}
                      className="button-ghost"
                      style={{ color: "var(--error)" }}
                    >
                      보관
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
