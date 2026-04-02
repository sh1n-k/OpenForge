"use client";

import Link from "next/link";
import { useState } from "react";
import type { ActivityEvent } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type LogsPageClientProps = {
  events: ActivityEvent[];
};

const categories = [
  { value: "execution", label: "실행" },
  { value: "signal", label: "시그널" },
  { value: "order", label: "주문" },
  { value: "risk", label: "리스크" },
  { value: "broker", label: "브로커" },
  { value: "system", label: "시스템" },
] as const;

const severities = [
  { value: "error", label: "오류" },
  { value: "warn", label: "경고" },
  { value: "info", label: "정보" },
] as const;

const categoryBadgeStyle: Record<string, { background: string; color: string }> = {
  execution: { background: "var(--primary-soft)", color: "var(--primary)" },
  signal: { background: "#f3e8ff", color: "var(--secondary)" },
  order: { background: "#e0e7ff", color: "#3730a3" },
  risk: { background: "var(--error-soft)", color: "var(--error)" },
  broker: { background: "var(--warning-soft)", color: "var(--warning)" },
  system: { background: "var(--border-soft)", color: "var(--muted-foreground)" },
};

function severityRowStyle(severity: string): React.CSSProperties {
  if (severity === "error") return { background: "var(--error-soft)" };
  if (severity === "warn") return { background: "var(--warning-soft)" };
  return {};
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
      <section id="logs-summary" className="doc-panel">
        <div className="page-intro-row">
          <div className="page-intro">
            <p className="page-eyebrow">Logs</p>
            <h1 className="page-title">실행 로그</h1>
          </div>
          <div className="page-actions">
            <span className="status-chip status-chip-info">
              {events.length} events
            </span>
            {errorCount > 0 && (
              <span className="status-chip status-chip-error">
                {errorCount} errors
              </span>
            )}
          </div>
        </div>
      </section>

      <section id="logs-filters" className="doc-panel">
        <h2 className="section-title">필터</h2>
        <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
          <div>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--subtle-foreground)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              카테고리
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  className={selectedCategory === cat.value ? "status-chip status-chip-info" : "status-chip"}
                  onClick={() => setSelectedCategory(cat.value === selectedCategory ? null : cat.value)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--subtle-foreground)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              심각도
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {severities.map((sev) => (
                <button
                  key={sev.value}
                  className={selectedSeverity === sev.value ? "status-chip status-chip-info" : "status-chip"}
                  onClick={() => setSelectedSeverity(sev.value === selectedSeverity ? null : sev.value)}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="logs-timeline" className="doc-panel">
        <h2 className="section-title">이벤트 타임라인</h2>
        {filteredEvents.length === 0 ? (
          <p className="section-copy">이벤트가 없습니다</p>
        ) : (
          <div className="stack-list" style={{ marginTop: 16 }}>
            {filteredEvents.map((event) => {
              const badge = categoryBadgeStyle[event.category] ?? categoryBadgeStyle.system;
              return (
                <article
                  key={event.id}
                  className="list-card"
                  style={severityRowStyle(event.severity)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        className="status-chip"
                        style={{ background: badge.background, color: badge.color }}
                      >
                        {event.category}
                      </span>
                      <span
                        className={
                          event.severity === "error"
                            ? "status-chip status-chip-error"
                            : event.severity === "warn"
                              ? "status-chip status-chip-warning"
                              : "status-chip"
                        }
                      >
                        {event.severity}
                      </span>
                      {event.strategyId && event.strategyName && (
                        <Link
                          href={`/strategies/${event.strategyId}`}
                          style={{ color: "var(--primary)", fontSize: "0.875rem", fontWeight: 500 }}
                        >
                          {event.strategyName}
                        </Link>
                      )}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--subtle-foreground)", whiteSpace: "nowrap" }}>
                      {formatDateTime(event.occurredAt)}
                    </span>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: "0.9375rem", color: "var(--foreground)" }}>
                    {event.summary}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
