import type { DashboardResponse } from "@/lib/api";

type DashboardHealthSectionProps = {
  health: DashboardResponse["health"];
};

export function DashboardHealthSection({
  health,
}: DashboardHealthSectionProps) {
  return (
    <section id="dashboard-health">
      <div className="dashboard-health-bar">
        <h2 className="section-title">시스템 상태</h2>
        <div className="flex-center">
          <span
            className={
              health.apiStatus === "UP"
                ? "status-chip status-chip-success"
                : "status-chip status-chip-error"
            }
          >
            API {health.apiStatus}
          </span>
          <span
            className={
              health.dbStatus === "UP"
                ? "status-chip status-chip-success"
                : "status-chip status-chip-error"
            }
          >
            DB {health.dbStatus}
          </span>
        </div>
      </div>
    </section>
  );
}
