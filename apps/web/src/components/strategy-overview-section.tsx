"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  archiveStrategy,
  cloneStrategy,
  type StrategyDetail,
  type StrategyExecutionResponse,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const statusLabel: Record<string, string> = {
  running: "실행 중",
  stopped: "중지",
  draft: "초안",
  backtest_completed: "백테스트 완료",
};

const statusChip: Record<string, string> = {
  running: "inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-success-soft text-success border border-success/20",
  stopped: "inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-warning-soft text-warning border border-warning/20",
  draft: "inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-surface text-foreground border border-border",
  backtest_completed: "inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-primary-soft text-primary border border-primary/20",
};

const typeLabel: Record<string, string> = {
  builder: "빌더형",
  code: "코드형",
};

type OverviewHeaderProps = {
  strategy: StrategyDetail;
  execution: StrategyExecutionResponse;
};

export function StrategyOverviewHeader({ strategy, execution }: OverviewHeaderProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleClone() {
    try {
      setError(null);
      await cloneStrategy(strategy.id);
      startTransition(() => router.push("/strategies"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "전략 복제에 실패했습니다.");
    }
  }

  async function handleArchive() {
    if (!window.confirm("이 전략을 보관하시겠습니까?")) return;
    try {
      setError(null);
      await archiveStrategy(strategy.id);
      startTransition(() => router.push("/strategies"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "전략 보관에 실패했습니다.");
    }
  }

  return (
    <section
      id="strategy-overview"
      className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-6 mb-8 pb-6 border-b border-border-soft">
        <div className="grid gap-2">
          <p className="m-0 text-primary font-bold tracking-wider uppercase text-xs">전략 상세</p>
          <h1 className="m-0 font-sans text-3xl font-bold tracking-tight text-foreground">{strategy.name}</h1>
          <p className="m-0 text-muted font-medium flex items-center gap-2">
            <span className="bg-border-soft px-1.5 py-0.5 rounded text-xs">{typeLabel[strategy.strategyType] ?? strategy.strategyType}</span>
            <span className="text-subtle">•</span>
            {statusLabel[strategy.status] ?? strategy.status}
            <span className="text-subtle">•</span>
            최신 <span className="font-mono">v{strategy.latestVersionNumber ?? 0}</span>
          </p>
        </div>
        <span className={statusChip[strategy.latestValidationStatus ?? ""] ?? "inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-info-soft text-info border border-info/20"}>
          {strategy.latestValidationStatus ?? "미검증"}
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4 mb-8">
        <div className="grid gap-2 p-5 min-h-[100px] border border-border-soft rounded-xl bg-[#fafafa]">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">버전 수</p>
          <p className="m-0 font-sans text-2xl font-bold text-foreground">{strategy.versionCount}</p>
        </div>
        <div className="grid gap-2 p-5 min-h-[100px] border border-border-soft rounded-xl bg-[#fafafa]">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">유니버스</p>
          <p className="m-0 font-sans text-2xl font-bold text-foreground">{strategy.universeCount}</p>
        </div>
        <div className="grid gap-2 p-5 min-h-[100px] border border-border-soft rounded-xl bg-[#fafafa]">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">현재 상태</p>
          <p className="m-0 font-sans text-2xl font-bold text-foreground">{statusLabel[strategy.status] ?? strategy.status}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="grid gap-1.5 border-l-2 border-border-soft pl-4">
          <span className="text-subtle text-xs font-semibold tracking-wider uppercase">최신 검증</span>
          <span className="text-foreground font-medium text-[0.9375rem]">{strategy.latestValidationStatus ?? "미검증"}</span>
        </div>
        <div className="grid gap-1.5 border-l-2 border-border-soft pl-4">
          <span className="text-subtle text-xs font-semibold tracking-wider uppercase">실행 모드</span>
          <span className="text-foreground font-medium text-[0.9375rem] uppercase">{execution.mode}</span>
        </div>
        <div className="grid gap-1.5 border-l-2 border-border-soft pl-4">
          <span className="text-subtle text-xs font-semibold tracking-wider uppercase">다음 실행</span>
          <span className="text-foreground font-medium text-[0.9375rem] font-mono">{formatDateTime(execution.nextRunAt) ?? "대기 중"}</span>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-error-soft text-error border border-error/20 mb-6 text-[0.9375rem] font-medium">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-border-soft">
        <Link
          href={`/strategies/${strategy.id}/backtest`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg bg-surface border border-border text-foreground hover:bg-[#fafafa] hover:border-gray-300 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border"
        >
          백테스트
        </Link>
        <Link
          href={`/strategies/${strategy.id}/edit`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          편집기 열기
        </Link>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleClone}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg bg-surface border border-border text-foreground hover:bg-[#fafafa] hover:border-gray-300 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border"
        >
          복제
        </button>
        <button
          type="button"
          onClick={handleArchive}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg text-error hover:bg-error-soft transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error"
        >
          보관
        </button>
      </div>
    </section>
  );
}

type InfoPanelProps = {
  strategy: StrategyDetail;
};

export function StrategyInfoPanel({ strategy }: InfoPanelProps) {
  return (
    <section className="flex flex-col p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm h-full">
      <h2 className="m-0 mb-6 font-sans text-xl font-bold text-foreground">개요</h2>
      <div className="grid gap-6 flex-1">
        <div className="grid gap-1.5">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">설명</p>
          <p className="m-0 text-foreground font-medium text-[0.9375rem] leading-relaxed">{strategy.description ?? "설명 없음"}</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="grid gap-1.5">
            <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">검증 상태</p>
            <p className="m-0 text-foreground font-medium text-[0.9375rem]">{strategy.latestValidationStatus ?? "미검증"}</p>
          </div>
          <div className="grid gap-1.5">
            <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">버전 수</p>
            <p className="m-0 text-foreground font-medium text-[0.9375rem]">{strategy.versionCount}</p>
          </div>
          <div className="grid gap-1.5">
            <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">현재 상태</p>
            <p className="m-0 text-foreground font-medium text-[0.9375rem]">{statusLabel[strategy.status] ?? strategy.status}</p>
          </div>
        </div>
      </div>
      {strategy.latestValidationErrors.length > 0 ? (
        <div className="mt-8 p-4 rounded-xl bg-error-soft border border-error/20 flex flex-col gap-2">
          {strategy.latestValidationErrors.map((item, index) => (
            <p key={`${item.category}-${index}`} className="m-0 text-[0.9375rem] font-medium text-error flex items-start gap-2">
              <span className="font-mono text-xs mt-0.5 px-1 bg-error/10 rounded">[{item.category}]</span> 
              <span>{item.message}</span>
            </p>
          ))}
        </div>
      ) : null}
      {strategy.latestValidationWarnings.length > 0 ? (
        <div className="mt-4 p-4 rounded-xl bg-warning-soft border border-warning/20 flex flex-col gap-2">
          {strategy.latestValidationWarnings.map((item, index) => (
            <p key={`${item.category}-${index}`} className="m-0 text-[0.9375rem] font-medium text-warning flex items-start gap-2">
              <span className="font-mono text-xs mt-0.5 px-1 bg-warning/10 rounded">[{item.category}]</span> 
              <span>{item.message}</span>
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
