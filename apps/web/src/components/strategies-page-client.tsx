"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
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

type StrategiesPageClientProps = {
  strategies: StrategySummary[];
};

const defaultPayloads: Record<StrategyType, string> = {
  builder: JSON.stringify(
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
    null,
    2,
  ),
  code: JSON.stringify(
    {
      source: makeCodeTemplate("New Code Strategy", ""),
      sourceKind: "openforge_yaml",
    },
    null,
    2,
  ),
};

export function StrategiesPageClient({
  strategies,
}: StrategiesPageClientProps) {
  const router = useRouter();
  const [strategyType, setStrategyType] = useState<StrategyType>("builder");
  const [payload, setPayload] = useState(defaultPayloads.builder);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPayload(defaultPayloads[strategyType]);
  }, [strategyType]);

  async function handleCreate(formData: FormData) {
    try {
      setError(null);
      const parsedPayload = JSON.parse(payload) as Record<string, unknown>;
      const payloadFormat =
        strategyType === "builder" ? "builder_json" : "code_text";

      await createStrategy({
        name: String(formData.get("name")),
        description: String(formData.get("description") ?? ""),
        strategyType,
        initialPayload: {
          payloadFormat,
          payload: parsedPayload,
          changeSummary: String(formData.get("changeSummary") ?? ""),
        },
      });

      startTransition(() => router.refresh());
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "전략 생성에 실패했습니다.",
      );
    }
  }

  async function handleClone(strategyId: string) {
    await cloneStrategy(strategyId);
    startTransition(() => router.refresh());
  }

  async function handleArchive(strategyId: string) {
    await archiveStrategy(strategyId);
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
            <h1 className="mt-2 text-4xl font-semibold">Strategy Registry</h1>
          </div>
          <Link
            href="/universes"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
          >
            Universes
          </Link>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <h2 className="text-2xl font-semibold text-slate-950">Create Strategy</h2>
        <form
          className="mt-5 grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await handleCreate(new FormData(event.currentTarget));
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="name"
              required
              placeholder="전략 이름"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            <select
              value={strategyType}
              onChange={(event) =>
                setStrategyType(event.target.value as StrategyType)
              }
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="builder">builder</option>
              <option value="code">code</option>
            </select>
          </div>
          <input
            name="description"
            placeholder="설명"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
          <input
            name="changeSummary"
            placeholder="버전 메모"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
          <textarea
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            rows={12}
            className="rounded-3xl border border-slate-200 px-4 py-4 font-mono text-sm text-slate-800"
          />
          {error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : null}
          <div>
            <button
              type="submit"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              전략 생성
            </button>
          </div>
        </form>
      </section>

      <StrategyListView strategies={strategies} />

      {strategies.length > 0 ? (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-2xl font-semibold text-slate-950">Quick Actions</h2>
          <div className="mt-4 grid gap-3">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {strategy.name}
                  </div>
                  <div className="text-sm text-slate-500">
                    v{strategy.latestVersionNumber ?? 0} / {strategy.strategyType}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleClone(strategy.id)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    Clone
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(strategy.id)}
                    className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600"
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
