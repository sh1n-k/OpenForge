import type { DashboardResponse } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type DashboardErrorsSectionProps = {
  errors: DashboardResponse["recentErrors"];
};

export function DashboardErrorsSection({
  errors,
}: DashboardErrorsSectionProps) {
  const hasErrors = errors.length > 0;

  return (
    <section id="dashboard-errors">
      <h2 className="section-title">최근 오류</h2>
      {hasErrors ? (
        <div className="stack-list">
          {errors.map((err, index) => (
            <div
              key={`${err.occurredAt}-${index}`}
              className="list-card list-card-error"
            >
              <div className="flex-between">
                <div className="flex-center">
                  <span className="mono-pill">{err.source}</span>
                  {err.strategyName ? (
                    <span className="text-muted">{err.strategyName}</span>
                  ) : null}
                </div>
                <span
                  className="text-subtle"
                  style={{ fontSize: "0.8125rem" }}
                >
                  {formatDateTime(err.occurredAt)}
                </span>
              </div>
              <p className="section-copy text-error">{err.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state empty-state-compact empty-state-success">
          <p className="empty-state-message">최근 오류가 없습니다</p>
        </div>
      )}
    </section>
  );
}
