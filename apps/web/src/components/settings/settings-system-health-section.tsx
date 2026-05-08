import type { HealthSnapshot } from "@/lib/health";

type SettingsSystemHealthSectionProps = {
  health: HealthSnapshot;
};

export function SettingsSystemHealthSection({
  health,
}: SettingsSystemHealthSectionProps) {
  const isHealthy = health.status === "UP" && health.database.status === "UP";

  return (
    <section id="settings-system">
      <h2 className="section-title">시스템 상태</h2>
      <div className={`dashboard-health-bar ${isHealthy ? "" : "dashboard-health-bar-degraded"}`}>
        <div className="flex-center">
          <span className={`dashboard-killswitch-dot ${isHealthy ? "dashboard-killswitch-dot-on" : "dashboard-killswitch-dot-off"}`} />
          <span style={{ fontWeight: 600 }}>{isHealthy ? "정상 운영 중" : "일부 서비스 이상"}</span>
        </div>
        <div className="flex-center">
          <span className={health.status === "UP" ? "status-chip status-chip-success" : "status-chip status-chip-error"}>
            API {health.status}
          </span>
          <span className={health.database.status === "UP" ? "status-chip status-chip-success" : "status-chip status-chip-error"}>
            DB {health.database.status}
          </span>
        </div>
      </div>
      <div className="summary-grid summary-grid-columns-2" style={{ marginTop: 16 }}>
        <article className="metric-card">
          <p className="metric-card-label">버전</p>
          <p className="metric-card-value" style={{ fontSize: "1.25rem" }}>{health.version}</p>
        </article>
        <article className="metric-card">
          <p className="metric-card-label">환경</p>
          <p className="metric-card-value" style={{ fontSize: "1.25rem" }}>
            {health.environment} · {health.mode}
          </p>
        </article>
      </div>
    </section>
  );
}
