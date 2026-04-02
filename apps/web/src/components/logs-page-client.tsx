"use client";

import Link from "next/link";
import { useState } from "react";
import type { ActivityEvent } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

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
  execution: "category-badge-execution",
  signal: "category-badge-signal",
  order: "category-badge-order",
  risk: "category-badge-risk",
  broker: "category-badge-broker",
  system: "category-badge-system",
};

const severityChip: Record<string, string> = {
  error: "status-chip status-chip-error",
  warn: "status-chip status-chip-warning",
  info: "status-chip",
};

const severityLabel: Record<string, string> = {
  error: "오류",
  warn: "경고",
  info: "정보",
};

function severityRowClassName(severity: string): string {
  if (severity === "error") return "severity-row-error";
  if (severity === "warn") return "severity-row-warn";
  return "";
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
    <main className="page-shell docs-page-shell">
      <section id="logs-summary" className="page-intro">
        <p className="page-eyebrow">Logs</p>
        <h1 className="page-title">실행 로그</h1>
        <p className="page-description">
          전략 실행, 주문, 리스크, 브로커 이벤트를 시간순으로 조회합니다.
        </p>
      </section>

      <div className="summary-grid summary-grid-columns-2">
        <article className="metric-card metric-card-accent-primary">
          <p className="metric-card-label">전체 이벤트</p>
          <p className="metric-card-value">{events.length}</p>
        </article>
        <article className={`metric-card ${errorCount > 0 ? "metric-card-accent-pnl" : "metric-card-accent-info"}`}>
          <p className="metric-card-label">오류</p>
          <p className={`metric-card-value ${errorCount > 0 ? "text-error" : ""}`}>{errorCount}</p>
        </article>
      </div>

      <section id="logs-filters">
        <div className="filter-bar">
          <span className="form-label">카테고리</span>
          {categoryItems.map((cat) => (
            <button
              key={cat.value}
              type="button"
              className={selectedCategory === cat.value ? "status-chip status-chip-info" : "status-chip"}
              onClick={() => setSelectedCategory(cat.value === selectedCategory ? null : cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="filter-bar" style={{ marginTop: 8 }}>
          <span className="form-label">심각도</span>
          {severityItems.map((sev) => (
            <button
              key={sev.value}
              type="button"
              className={selectedSeverity === sev.value ? "status-chip status-chip-info" : "status-chip"}
              onClick={() => setSelectedSeverity(sev.value === selectedSeverity ? null : sev.value)}
            >
              {sev.label}
            </button>
          ))}
        </div>
      </section>

      <section id="logs-timeline">
        <h2 className="section-title">
          이벤트 타임라인
          {filteredEvents.length !== events.length ? (
            <span className="section-count">{filteredEvents.length}건 / {events.length}건</span>
          ) : null}
        </h2>
        {filteredEvents.length === 0 ? (
          <div className="empty-state empty-state-compact">
            <p className="empty-state-message">
              {events.length === 0 ? "기록된 이벤트가 없습니다" : "필터 조건에 맞는 이벤트가 없습니다"}
            </p>
          </div>
        ) : (
          <div className="stack-list">
            {filteredEvents.map((event) => (
              <article
                key={event.id}
                className={`list-card ${severityRowClassName(event.severity)}`}
              >
                <div className="flex-between">
                  <div className="flex-center">
                    <span className={`status-chip ${categoryBadgeClassName[event.category] ?? ""}`}>
                      {categoryLabel[event.category] ?? event.category}
                    </span>
                    <span className={severityChip[event.severity] ?? "status-chip"}>
                      {severityLabel[event.severity] ?? event.severity}
                    </span>
                    {event.strategyId && event.strategyName ? (
                      <Link href={`/strategies/${event.strategyId}`} className="table-link">
                        {event.strategyName}
                      </Link>
                    ) : null}
                  </div>
                  <span className="text-subtle" style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                    {formatDateTime(event.occurredAt)}
                  </span>
                </div>
                <p className="section-copy" style={{ marginTop: 4 }}>
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
