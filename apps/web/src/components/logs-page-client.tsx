"use client";

import Link from "next/link";
import { useState } from "react";
import type { ActivityEvent } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  OperationsControlPanel,
  PageIntroSection,
  SectionHeaderBlock,
} from "@/components/page-layout";

type LogsPageClientProps = {
  events: ActivityEvent[];
};

const categoryItems = [
  { value: "execution", label: "실행" },
  { value: "signal", label: "시그널" },
  { value: "order", label: "주문" },
  { value: "risk", label: "리스크" },
  { value: "broker", label: "브로커" },
  { value: "system", label: "시스템" },
] as const;

const severityItems = [
  { value: "error", label: "오류" },
  { value: "warn", label: "경고" },
  { value: "info", label: "정보" },
] as const;

const categoryLabel: Record<string, string> = {
  execution: "실행",
  signal: "시그널",
  order: "주문",
  risk: "리스크",
  broker: "브로커",
  system: "시스템",
};

const categoryBadgeClassName: Record<string, string> = {
  execution: "bg-primary-soft text-primary border-primary/20",
  signal: "bg-amber-100 text-amber-800 border-amber-200",
  order: "bg-success-soft text-success border-success/20",
  risk: "bg-error-soft text-error border-error/20",
  broker: "bg-purple-100 text-purple-800 border-purple-200",
  system: "bg-surface text-foreground border-border",
};

const severityChip: Record<string, string> = {
  error: "bg-error text-white border-error",
  warn: "bg-warning text-white border-warning",
  info: "bg-info-soft text-info border-info/20",
};

const severityLabel: Record<string, string> = {
  error: "오류",
  warn: "경고",
  info: "정보",
};

function severityRowClassName(severity: string): string {
  if (severity === "error") return "border-red-200 bg-red-50/50 hover:border-red-300";
  if (severity === "warn") return "border-amber-200 bg-amber-50/50 hover:border-amber-300";
  return "bg-surface border-border-soft hover:shadow hover:border-gray-300";
}

export function LogsPageClient({ events }: LogsPageClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);

  const filteredEvents = events.filter((e) => {
    if (selectedCategory && e.category !== selectedCategory) return false;
    if (selectedSeverity && e.severity !== selectedSeverity) return false;
    return true;
  });

  const errorCount = events.filter((e) => e.severity === "error").length;

  return (
    <main className="grid content-start gap-8 w-[min(100%,var(--content-width))] mx-auto px-5 pt-8 pb-16">
      <PageIntroSection
        id="logs-summary"
        eyebrow="Logs"
        title="실행 로그"
        description="전략 실행, 주문, 리스크, 브로커 이벤트를 시간순으로 조회합니다."
      />

      <section className="p-5 bg-primary-soft/30 border border-primary/20 rounded-xl">
        <p className="m-0 text-muted text-[0.9375rem] leading-relaxed">
          이 화면은 OpenForge 운영 이벤트 기록을 표시합니다. 실제 주문 및 계좌 원장은{" "}
          <Link href="/broker" className="font-semibold text-primary hover:text-primary-hover underline underline-offset-2 transition-colors">
            Broker
          </Link>
          와 함께 확인하세요.
        </p>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 justify-start">
        <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-primary">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">전체 이벤트</p>
          <p className="m-0 font-sans text-3xl leading-snug font-bold text-foreground">{events.length}</p>
          <p className="m-0 text-muted text-[0.875rem]">누적 저장 이벤트 수</p>
        </article>
        <article className={`grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] ${errorCount > 0 ? "border-error" : "border-info"}`}>
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">오류</p>
          <p className={`m-0 font-sans text-3xl leading-snug font-bold ${errorCount > 0 ? "text-error" : "text-foreground"}`}>{errorCount}</p>
          <p className="m-0 text-muted text-[0.875rem]">오류 심각도 이벤트 수</p>
        </article>
      </div>

      <OperationsControlPanel
        id="logs-filters"
        title="조회 기준"
        description="카테고리와 심각도로 이벤트 타임라인을 좁혀 볼 수 있습니다."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <label className="grid gap-1.5 focus-within:text-primary max-w-sm">
            <span className="text-subtle text-sm font-medium transition-colors">카테고리</span>
            <select
              className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%221.5%22%20stroke%3D%22%2371717a%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M8.25%2015L12%2018.75%2015.75%2015m-7.5-6L12%205.25%2015.75%209%22%20%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[size:1.5em_1.5em] pr-10"
              value={selectedCategory ?? ""}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
            >
              <option value="">전체</option>
              {categoryItems.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 focus-within:text-primary max-w-sm">
            <span className="text-subtle text-sm font-medium transition-colors">심각도</span>
            <select
              className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%221.5%22%20stroke%3D%22%2371717a%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M8.25%2015L12%2018.75%2015.75%2015m-7.5-6L12%205.25%2015.75%209%22%20%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[size:1.5em_1.5em] pr-10"
              value={selectedSeverity ?? ""}
              onChange={(e) => setSelectedSeverity(e.target.value || null)}
            >
              <option value="">전체</option>
              {severityItems.map((sev) => (
                <option key={sev.value} value={sev.value}>
                  {sev.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </OperationsControlPanel>

      <section id="logs-timeline" className="grid gap-5">
        <SectionHeaderBlock
          title="이벤트 타임라인"
          count={
            filteredEvents.length !== events.length
              ? `${filteredEvents.length}건 / ${events.length}건`
              : undefined
          }
          countStrong
          description="최신 이벤트부터 시간순으로 표시합니다."
        />
        {filteredEvents.length === 0 ? (
          <div className="grid justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center shadow-sm bg-surface">
            <p className="m-0 font-medium text-muted">
              {events.length === 0 ? "기록된 이벤트가 없습니다" : "필터 조건에 맞는 이벤트가 없습니다"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredEvents.map((event) => (
              <article
                key={event.id}
                className={`p-4 border rounded-xl shadow-sm transition-colors group ${severityRowClassName(event.severity)}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase border ${categoryBadgeClassName[event.category] ?? "bg-surface text-foreground border-border"}`}>
                      {categoryLabel[event.category] ?? event.category}
                    </span>
                    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase border ${severityChip[event.severity] ?? "bg-surface text-foreground border-border"}`}>
                      {severityLabel[event.severity] ?? event.severity}
                    </span>
                    {event.strategyId && event.strategyName ? (
                      <Link href={`/strategies/${event.strategyId}`} className="font-medium text-sm text-foreground hover:text-primary transition-colors">
                        {event.strategyName}
                      </Link>
                    ) : null}
                  </div>
                  <span className="text-muted text-[0.8125rem] whitespace-nowrap">
                    {formatDateTime(event.occurredAt)}
                  </span>
                </div>
                <p className={`m-0 mt-2 text-[0.9375rem] ${event.severity === "error" ? "text-error font-medium" : "text-foreground"}`}>
                  {event.summary}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
