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
import { StrategyListView } from "@/components/strategy-list-view";
import {
  makeBuilderPayload,
  makeCodeTemplate,
} from "@/lib/strategy-editor";
import {
  PageIntroSection,
  RegistryCreatePanel,
  SectionHeaderBlock,
} from "@/components/page-layout";

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
    if (!window.confirm("이 전략을 보관합니까? 목록에서 사라집니다.")) return;
    await archiveStrategy(strategyId);
    startTransition(() => router.refresh());
  }

  return (
    <main className="page-shell docs-page-shell page-shell-registry">
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
          className="registry-create-form"
          onSubmit={async (event) => {
            event.preventDefault();
            await handleCreate(new FormData(event.currentTarget));
          }}
        >
          <div className="registry-create-fields">
            <div className="form-field">
              <label className="form-label">전략 이름</label>
              <input name="name" required placeholder="예: SMA 골든크로스" />
            </div>
            <div className="form-field">
              <label className="form-label">유형</label>
              <select
                value={strategyType}
                onChange={(event) =>
                  setStrategyType(event.target.value as StrategyType)
                }
              >
                <option value="builder">{typeLabels.builder}</option>
                <option value="code">{typeLabels.code}</option>
              </select>
            </div>
          </div>
          <div className="form-field registry-field-span-2">
            <label className="form-label">설명 (선택)</label>
            <input name="description" placeholder="전략에 대한 간단한 설명" />
          </div>
          {error ? <p className="inline-error">{error}</p> : null}
          <div className="registry-create-action">
            <button type="submit" className="button-primary" disabled={isCreating}>
              {isCreating ? "생성 중..." : "전략 생성"}
            </button>
          </div>
        </form>
      </RegistryCreatePanel>

      <section id="strategies-registry" className="registry-section">
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
