"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useRef, useState } from "react";
import {
  archiveUniverse,
  createUniverse,
  type UniverseMarketScope,
  type UniverseSummary,
} from "@/lib/api";
import {
  PageIntroSection,
  RegistryCreatePanel,
  SectionHeaderBlock,
} from "@/components/page-layout";

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
  const createSectionRef = useRef<HTMLElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [marketScope, setMarketScope] = useState<UniverseMarketScope>("domestic");

  const marketUniverses = useMemo(
    () => universes.filter((universe) => universe.marketScope === marketScope),
    [marketScope, universes],
  );
  const marketCounts = useMemo(
    () => ({
      domestic: universes.filter((universe) => universe.marketScope === "domestic")
        .length,
      us: universes.filter((universe) => universe.marketScope === "us").length,
    }),
    [universes],
  );

  async function handleCreate(formData: FormData) {
    const name = String(formData.get("name")).trim();
    if (!name) return;
    try {
      setError(null);
      setIsCreating(true);
      const formMarketScope = String(
        formData.get("marketScope") ?? "domestic",
      ) as UniverseMarketScope;
      await createUniverse({
        name,
        description: String(formData.get("description") ?? "").trim(),
        marketScope: formMarketScope,
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

  function focusCreateForm(marketScope: UniverseMarketScope) {
    setMarketScope(marketScope);
    createSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    nameInputRef.current?.focus();
  }

  return (
    <main className="page-shell docs-page-shell page-shell-registry">
      <PageIntroSection
        id="universes-summary"
        eyebrow="Universes"
        title="유니버스 레지스트리"
        description="국내와 미국 시장을 분리해서 전략에 연결할 종목 집합을 관리합니다."
      />

      {error ? (
        <div className="doc-panel doc-panel-error">
          <p className="section-copy">{error}</p>
        </div>
      ) : null}

      <RegistryCreatePanel
        id="universes-create"
        ref={createSectionRef}
        tinted
        title="유니버스 생성"
        description="시장을 선택하고 이름을 등록한 뒤 상세 화면에서 심볼 구성을 이어서 편집합니다."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await handleCreate(new FormData(e.currentTarget));
          }}
          className="registry-create-form"
        >
          <input type="hidden" name="marketScope" value={marketScope} />
          <div className="registry-create-fields universe-create-fields">
            <label className="form-field universe-create-name">
              <span className="form-label">이름</span>
              <input
                ref={nameInputRef}
                name="name"
                required
                placeholder={
                  marketScope === "domestic"
                    ? "예: KOSPI 200 대형주"
                    : "예: US Mega Cap Growth"
                }
              />
            </label>
            <label className="form-field universe-create-description">
              <span className="form-label">설명 (선택)</span>
              <input name="description" placeholder="유니버스의 목적을 짧게 설명" />
            </label>
            <div className="form-field universe-create-market">
              <span className="form-label">시장</span>
              <div className="universe-market-toggle" role="tablist" aria-label="생성 시장 선택">
                {(["domestic", "us"] as UniverseMarketScope[]).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    role="tab"
                    aria-selected={marketScope === scope}
                    className={`universe-market-toggle-item ${marketScope === scope ? "universe-market-toggle-item-active" : ""}`}
                    onClick={() => setMarketScope(scope)}
                  >
                    {scope === "domestic" ? "국내 시장" : "미국 시장"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="registry-create-action">
            <button type="submit" className="button-primary" disabled={isCreating}>
              {isCreating ? "생성 중..." : "유니버스 생성"}
            </button>
          </div>
        </form>
      </RegistryCreatePanel>

      <section id="universes-registry" className="registry-section">
        <SectionHeaderBlock
          title="유니버스 목록"
          count={`총 ${universes.length}개`}
          countStrong
          description={`현재 ${marketScopeLabel[marketScope]} 시장 기준으로 목록을 보고 있습니다.`}
        />

        <div className="registry-controls">
          <div className="settings-tabs universe-market-tabs" role="tablist" aria-label="유니버스 시장 탭">
            {(["domestic", "us"] as UniverseMarketScope[]).map((scope) => (
              <button
                key={scope}
                type="button"
                role="tab"
                aria-selected={marketScope === scope}
                className={`settings-tab ${marketScope === scope ? "settings-tab-active" : ""}`}
                onClick={() => setMarketScope(scope)}
              >
                {scope === "domestic" ? "국내 시장" : "미국 시장"}
                <span className="section-count section-count-pill">
                  {marketCounts[scope]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {marketUniverses.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-message">
              {marketScopeLabel[marketScope]} 유니버스가 없습니다
            </p>
            <p className="empty-state-hint">
              먼저 {marketScopeLabel[marketScope]} 시장 유니버스를 생성하고
              상세 화면에서 종목을 구성하세요.
            </p>
            <div className="page-actions">
              <button
                type="button"
                className="button-primary"
                onClick={() => focusCreateForm(marketScope)}
              >
                {marketScopeLabel[marketScope]} 유니버스 생성
              </button>
            </div>
          </div>
        ) : (
          <div className="stack-list">
            {marketUniverses.map((universe) => (
              <div key={universe.id} className="list-card">
                <div className="flex-between">
                  <div className="universe-list-card-body">
                    <Link href={`/universes/${universe.id}`} className="table-link universe-list-link">
                      {universe.name}
                    </Link>
                    {universe.description ? (
                      <p className="section-copy universe-list-description">
                        {universe.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex-center universe-list-card-meta">
                    <div className="universe-list-metadata">
                      <div className="status-chip status-chip-info universe-list-market-chip">
                        {marketScopeLabel[universe.marketScope]}
                      </div>
                      <div className="text-subtle universe-list-stat">
                        {universe.symbolCount ?? 0}개 종목
                      </div>
                      <div className="text-subtle universe-list-stat">
                        {universe.strategyCount ?? 0}개 전략 연결
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleArchive(universe.id)}
                      className="button-ghost universe-list-archive"
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
