"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  archiveStrategy,
  cloneStrategy,
  createStrategy,
  type StrategySummary,
  type StrategyType,
} from "@/lib/api";
import { StrategyListView } from "@/components/strategies/strategy-list-view";
import {
  makeBuilderPayload,
  makeCodeTemplate,
} from "@/lib/strategy-editor";
import {
  PageIntroSection,
  RegistryCreatePanel,
  SectionHeaderBlock,
} from "@/components/common/page-layout";
import { confirmAction } from "@/components/common";

type StrategiesPageClientProps = {
  strategies: StrategySummary[];
};

const defaultPayloads: Record<StrategyType, () => Record<string, unknown>> = {
  builder: () =>
    makeBuilderPayload({
      metadata: {
        id: "new_builder_strategy",
        name: "New Builder Strategy",
        description: "",
        category: "custom",
        author: "OpenForge",
        tags: [],
      },
      indicators: [],
      entry: { logic: "AND", conditions: [] },
      exit: { logic: "AND", conditions: [] },
      risk: {
        stopLoss: { enabled: false, percent: 0 },
        takeProfit: { enabled: false, percent: 0 },
        trailingStop: { enabled: false, percent: 0 },
      },
    }),
  code: () => ({
    source: makeCodeTemplate("New Code Strategy", ""),
    sourceKind: "openforge_yaml",
  }),
};

const typeLabels: Record<StrategyType, string> = {
  builder: "빌더형",
  code: "코드형",
};

export function StrategiesPageClient({
  strategies,
}: StrategiesPageClientProps) {
  const router = useRouter();
  const [strategyType, setStrategyType] = useState<StrategyType>("builder");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate(formData: FormData) {
    try {
      setError(null);
      setIsCreating(true);
      const payload = defaultPayloads[strategyType]();
      const payloadFormat =
        strategyType === "builder" ? "builder_json" : "code_text";

      const name = String(formData.get("name")).trim();
      const description = String(formData.get("description") ?? "").trim();

      // Update payload metadata with user-provided name/description
      if (strategyType === "builder" && payload.builderState) {
        const state = payload.builderState as Record<string, unknown>;
        const meta = (state.metadata ?? {}) as Record<string, unknown>;
        meta.id = name.toLowerCase().replace(/\s+/g, "_");
        meta.name = name;
        meta.description = description;
        state.metadata = meta;
      }

      await createStrategy({
        name,
        description,
        strategyType,
        initialPayload: {
          payloadFormat,
          payload,
          changeSummary: "초기 생성",
        },
      });

      startTransition(() => router.refresh());
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "전략 생성에 실패했습니다.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleClone(strategyId: string) {
    await cloneStrategy(strategyId);
    startTransition(() => router.refresh());
  }

  async function handleArchive(strategyId: string) {
    if (!confirmAction("이 전략을 보관합니까? 목록에서 사라집니다.")) return;
    await archiveStrategy(strategyId);
    startTransition(() => router.refresh());
  }

  return (
    <main className="group is-registry grid content-start gap-4 w-[min(100%,var(--content-width))] mx-auto px-5 pt-8 pb-16">
      <PageIntroSection
        id="strategies-summary"
        eyebrow="Strategies"
        title="전략 레지스트리"
        description="전략 등록과 실행 관리를 한 화면에서 관리합니다."
      />

      <RegistryCreatePanel
        id="strategies-create"
        title="전략 생성"
        description="이름과 유형을 선택하면 기본 템플릿으로 전략이 생성됩니다. 상세 편집은 생성 후 편집 화면에서 할 수 있습니다."
      >
        <form
          className="grid gap-5 mt-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await handleCreate(new FormData(event.currentTarget));
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-1.5 focus-within:text-primary">
              <label className="text-subtle text-sm font-medium transition-colors">전략 이름</label>
              <input 
                name="name" 
                required 
                placeholder="예: SMA 골든크로스" 
                className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] placeholder-subtle transition-all"
              />
            </div>
            <div className="grid gap-1.5 focus-within:text-primary">
              <label className="text-subtle text-sm font-medium transition-colors">유형</label>
              <select
                value={strategyType}
                onChange={(event) =>
                  setStrategyType(event.target.value as StrategyType)
                }
                className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%221.5%22%20stroke%3D%22%2371717a%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M8.25%2015L12%2018.75%2015.75%2015m-7.5-6L12%205.25%2015.75%209%22%20%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[size:1.5em_1.5em] pr-10"
              >
                <option value="builder">{typeLabels.builder}</option>
                <option value="code">{typeLabels.code}</option>
              </select>
            </div>
          </div>
          <div className="grid gap-1.5 focus-within:text-primary col-span-1 md:col-span-2">
            <label className="text-subtle text-sm font-medium transition-colors">설명 (선택)</label>
            <input 
              name="description" 
              placeholder="전략에 대한 간단한 설명" 
              className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] placeholder-subtle transition-all"
            />
          </div>
          {error ? <p className="text-error text-sm font-medium m-0">{error}</p> : null}
          <div className="flex items-center justify-start mt-2">
            <button type="submit" className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50" disabled={isCreating}>
              {isCreating ? "생성 중..." : "전략 생성"}
            </button>
          </div>
        </form>
      </RegistryCreatePanel>

      <section id="strategies-registry" className="grid gap-5">
        <SectionHeaderBlock
          title="전략 목록"
          count={`총 ${strategies.length}개`}
          countStrong
          description="저장된 전략을 확인하고 상세 화면에서 실행, 편집, 백테스트로 이어집니다."
        />
        <StrategyListView
          strategies={strategies}
          onClone={handleClone}
          onArchive={handleArchive}
        />
      </section>
    </main>
  );
}
