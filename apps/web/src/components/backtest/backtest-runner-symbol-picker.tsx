"use client";

import type { Dispatch, SetStateAction } from "react";
import type { UniverseDetail } from "@/lib/api";

type BacktestRunnerSymbolPickerProps = {
  linkedUniverses: UniverseDetail[];
  useDirectSymbols: boolean;
  onUseDirectSymbolsChange: (value: boolean) => void;
  selectedUniverseIds: string[];
  onSelectedUniverseIdsChange: Dispatch<SetStateAction<string[]>>;
  symbolsText: string;
  onSymbolsTextChange: (value: string) => void;
};

export function BacktestRunnerSymbolPicker({
  linkedUniverses,
  useDirectSymbols,
  onUseDirectSymbolsChange,
  selectedUniverseIds,
  onSelectedUniverseIdsChange,
  symbolsText,
  onSymbolsTextChange,
}: BacktestRunnerSymbolPickerProps) {
  return (
    <section className="doc-panel doc-panel-code">
      <div className="page-intro-row">
        <div className="page-intro">
          <h2 className="section-title">대상 종목</h2>
          <p className="section-copy">
            연결된 유니버스를 그대로 사용하거나 직접 심볼 목록을 입력할 수 있습니다.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useDirectSymbols}
            onChange={(event) => onUseDirectSymbolsChange(event.target.checked)}
          />
          직접 심볼 입력
        </label>
      </div>

      {useDirectSymbols ? (
        <>
          {/* TODO(OVERSEAS_DIRECT_BACKTEST, lib/features.ts): 서버 차단 해제 시 안내 문구 및 placeholder 수정 */}
          <p className="section-copy" style={{ marginTop: 12 }}>
            직접 입력은 현재 국내 심볼만 지원합니다. 미국 심볼은 서버에서 차단됩니다.
          </p>
          <textarea
            value={symbolsText}
            onChange={(event) => onSymbolsTextChange(event.target.value)}
            rows={6}
            placeholder="005930, 000660"
            className="mt-4 font-mono text-sm"
          />
        </>
      ) : (
        <div className="mt-4 stack-list">
          {linkedUniverses.length === 0 ? (
            <div className="empty-state empty-state-compact">
              <p className="empty-state-message">연결된 유니버스가 없습니다</p>
              <p className="empty-state-hint">직접 심볼 입력으로 전환하세요.</p>
            </div>
          ) : (
            linkedUniverses.map((universe) => (
              <label
                key={universe.id}
                className="list-card flex items-center gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedUniverseIds.includes(universe.id)}
                  onChange={(event) => {
                    onSelectedUniverseIdsChange((current) =>
                      event.target.checked
                        ? [...current, universe.id]
                        : current.filter((id) => id !== universe.id),
                    );
                  }}
                />
                <span>
                  {universe.name} ({universe.symbolCount})
                </span>
              </label>
            ))
          )}
        </div>
      )}
    </section>
  );
}
