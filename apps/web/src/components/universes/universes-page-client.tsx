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
} from "@/components/common/page-layout";
import { confirmAction } from "@/components/common";

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
    if (!confirmAction("이 유니버스를 보관합니까? 목록에서 사라집니다.")) return;
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
    <main className="group is-registry grid content-start gap-4 w-[min(100%,var(--content-width))] mx-auto px-5 pt-8 pb-16">
      <PageIntroSection
        id="universes-summary"
        eyebrow="Universes"
        title="유니버스 레지스트리"
        description="국내와 미국 시장을 분리해서 전략에 연결할 종목 집합을 관리합니다."
      />

      {error ? (
        <div className="p-6 border rounded-xl shadow-sm border-red-200 bg-red-50 text-error">
          <p className="m-0 text-[0.9375rem]">{error}</p>
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
          className="grid gap-5 mt-4"
        >
          <input type="hidden" name="marketScope" value={marketScope} />
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto] gap-4">
            <label className="grid gap-1.5 focus-within:text-primary">
              <span className="text-subtle text-sm font-medium transition-colors">이름</span>
              <input
                ref={nameInputRef}
                name="name"
                required
                className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] placeholder-subtle transition-all"
                placeholder={
                  marketScope === "domestic"
                    ? "예: KOSPI 200 대형주"
                    : "예: US Mega Cap Growth"
                }
              />
            </label>
            <label className="grid gap-1.5 focus-within:text-primary">
              <span className="text-subtle text-sm font-medium transition-colors">설명 (선택)</span>
              <input 
                name="description" 
                className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] placeholder-subtle transition-all"
                placeholder="유니버스의 목적을 짧게 설명" 
              />
            </label>
            <div className="grid gap-1.5">
              <span className="text-subtle text-sm font-medium">시장</span>
              <div className="flex items-center p-1 bg-border-soft rounded-lg" role="tablist" aria-label="생성 시장 선택">
                {(["domestic", "us"] as UniverseMarketScope[]).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    role="tab"
                    aria-selected={marketScope === scope}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${marketScope === scope ? "bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.1)] text-foreground" : "text-muted hover:text-foreground"}`}
                    onClick={() => setMarketScope(scope)}
                  >
                    {scope === "domestic" ? "국내 시장" : "미국 시장"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-start mt-2">
            <button type="submit" className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50" disabled={isCreating}>
              {isCreating ? "생성 중..." : "유니버스 생성"}
            </button>
          </div>
        </form>
      </RegistryCreatePanel>

      <section id="universes-registry" className="grid gap-5">
        <SectionHeaderBlock
          title="유니버스 목록"
          count={`총 ${universes.length}개`}
          countStrong
          description={`현재 ${marketScopeLabel[marketScope]} 시장 기준으로 목록을 보고 있습니다.`}
        />

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-soft pb-1 -mt-2">
          <div className="flex gap-4 px-2" role="tablist" aria-label="유니버스 시장 탭">
            {(["domestic", "us"] as UniverseMarketScope[]).map((scope) => (
              <button
                key={scope}
                type="button"
                role="tab"
                aria-selected={marketScope === scope}
                className={`inline-flex items-center gap-2 pb-2 text-[0.9375rem] font-medium border-b-2 transition-colors ${marketScope === scope ? "text-primary border-primary" : "text-muted hover:text-foreground border-transparent"}`}
                onClick={() => setMarketScope(scope)}
              >
                {scope === "domestic" ? "국내 시장" : "미국 시장"}
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[0.6875rem] font-bold ${marketScope === scope ? "bg-primary-soft text-primary" : "bg-border-soft text-muted"}`}>
                  {marketCounts[scope]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {marketUniverses.length === 0 ? (
          <div className="grid gap-3 justify-items-center p-12 px-6 border border-dashed border-border rounded-xl text-center bg-surface shadow-sm">
            <p className="m-0 text-foreground font-semibold text-[1.0625rem]">
              {marketScopeLabel[marketScope]} 유니버스가 없습니다
            </p>
            <p className="m-0 text-muted max-w-sm text-sm">
              먼저 {marketScopeLabel[marketScope]} 시장 유니버스를 생성하고
              상세 화면에서 종목을 구성하세요.
            </p>
            <div className="mt-4">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all"
                onClick={() => focusCreateForm(marketScope)}
              >
                {marketScopeLabel[marketScope]} 유니버스 생성
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {marketUniverses.map((universe) => (
              <div key={universe.id} className="p-5 bg-surface border border-border-soft rounded-xl shadow-sm hover:shadow hover:border-gray-300 transition-all group">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="grid gap-1.5">
                    <Link href={`/universes/${universe.id}`} className="font-semibold text-[1.0625rem] text-foreground hover:text-primary transition-colors">
                      {universe.name}
                    </Link>
                    {universe.description ? (
                      <p className="m-0 text-muted text-[0.9375rem] line-clamp-1">
                        {universe.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-primary-soft text-primary">
                        {marketScopeLabel[universe.marketScope]}
                      </div>
                      <div className="text-subtle text-sm">
                        <span className="font-mono text-muted">{universe.symbolCount ?? 0}</span>개 종목
                      </div>
                      <div className="text-subtle text-sm">
                        <span className="font-mono text-muted">{universe.strategyCount ?? 0}</span>개 전략 연결
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleArchive(universe.id)}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-sm font-medium text-muted hover:text-error hover:bg-error-soft rounded-lg transition-all"
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
