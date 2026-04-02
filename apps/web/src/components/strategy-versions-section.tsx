"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  replaceStrategyUniverses,
  type StrategyDetail,
  type StrategyVersion,
  type UniverseMarketScope,
  type UniverseSummary,
} from "@/lib/api";

const marketScopeLabel: Record<UniverseMarketScope, string> = {
  domestic: "국내",
  us: "미국",
};

type Props = {
  strategy: StrategyDetail;
  versions: StrategyVersion[];
  universes: UniverseSummary[];
};

export function StrategyVersionsSection({ strategy, versions, universes }: Props) {
  const router = useRouter();
  const [selectedUniverseIds, setSelectedUniverseIds] = useState<string[]>(
    strategy.universes.map((universe) => universe.id),
  );
  const [error, setError] = useState<string | null>(null);

  async function handleReplaceUniverses() {
    try {
      setError(null);
      await replaceStrategyUniverses(strategy.id, selectedUniverseIds);
      startTransition(() => router.refresh());
    } catch (universeError) {
      setError(
        universeError instanceof Error
          ? universeError.message
          : "유니버스 연결 저장에 실패했습니다.",
      );
    }
  }

  return (
    <section className="summary-grid summary-grid-columns-2">
      <section
        id="strategy-versions"
        className="doc-panel"
      >
        <div className="detail-card-header">
          <h2 className="detail-heading">버전</h2>
          <Link
            href={`/strategies/${strategy.id}/edit`}
            className="button-secondary"
          >
            새 버전 만들기
          </Link>
        </div>
        <div className="stack-list" style={{ marginTop: 16 }}>
          {versions.map((version) => (
            <article
              key={version.id}
              className="detail-card"
            >
              <div className="detail-card-header">
                <h3 className="detail-label">
                  Version {version.versionNumber}
                </h3>
                <span className="detail-timestamp">
                  {version.validationStatus}
                </span>
              </div>
              <p className="section-copy">
                {version.changeSummary ?? "변경 메모 없음"}
              </p>
              {version.validationErrors.length > 0 ? (
                <p className="inline-error" style={{ marginTop: 8 }}>
                  {version.validationErrors[0].message}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="doc-panel">
        <div className="flex-between">
          <h2 className="detail-heading">연결된 유니버스</h2>
          {strategy.universes.some((universe) => universe.marketScope === "us") ? (
            <span className="status-chip status-chip-warning">미국 포함</span>
          ) : null}
        </div>

        {error ? (
          <div className="doc-panel doc-panel-error" style={{ marginTop: 12 }}>
            {error}
          </div>
        ) : null}

        <div className="stack-list" style={{ marginTop: 16 }}>
          {universes.length === 0 ? (
            <p className="section-copy">
              생성된 유니버스가 아직 없습니다.
            </p>
          ) : (
            universes.map((universe) => (
              <label
                key={universe.id}
                className="list-card flex-center"
              >
                <input
                  type="checkbox"
                  checked={selectedUniverseIds.includes(universe.id)}
                  onChange={(event) => {
                    setSelectedUniverseIds((current) =>
                      event.target.checked
                        ? [...current, universe.id]
                        : current.filter((id) => id !== universe.id),
                    );
                  }}
                />
                <span>{universe.name}</span>
                <span className="status-chip status-chip-info" style={{ marginLeft: "auto" }}>
                  {marketScopeLabel[universe.marketScope]}
                </span>
              </label>
            ))
          )}
        </div>
        <button
          type="button"
          onClick={handleReplaceUniverses}
          className="button-primary"
          style={{ marginTop: 16 }}
        >
          유니버스 연결 저장
        </button>
      </section>
    </section>
  );
}
