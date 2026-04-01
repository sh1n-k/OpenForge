import Link from "next/link";
import type { HealthSnapshot } from "@/lib/health";

type ConsoleShellProps = {
  health: HealthSnapshot;
  environment: string;
  mode: string;
};

const futureSections = [
  { label: "Strategy Registry", href: "/strategies" },
  { label: "Universe Registry", href: "/universes" },
  { label: "Backtest Workbench", href: "#" },
  { label: "Order Watch", href: "#" },
];

export function ConsoleShell({
  health,
  environment,
  mode,
}: ConsoleShellProps) {
  const isHealthy = health.status === "UP";

  return (
    <main className="page-shell docs-page-shell">
      <section
        id="overview-summary"
        className="doc-panel"
      >
        <div className="page-intro-row">
          <div className="page-intro">
            <p className="page-eyebrow">Overview</p>
            <h1 className="page-title">개인 자동매매 운영 콘솔의 1단계 부트스트랩</h1>
            <p className="page-description">
              전략, 백테스트, 주문 추적은 아직 비어 있다. 지금 단계의 목표는
              운영 콘솔 셸과 API, 데이터베이스가 같은 규약으로 기동되는지
              확인하는 것이다.
            </p>
          </div>
          <div className="page-actions">
            <span className={isHealthy ? "status-chip status-chip-success" : "status-chip status-chip-warning"}>
              {isHealthy ? "서비스 준비" : "점검 필요"}
            </span>
          </div>
        </div>
      </section>

      <section
        id="overview-health"
        className="summary-grid summary-grid-columns-2"
      >
        <StatusBadge
          label="API"
          value={health.status}
          tone={isHealthy ? "good" : "warn"}
        />
        <StatusBadge
          label="Database"
          value={health.database.status}
          tone={isHealthy ? "good" : "warn"}
        />
        <StatusBadge label="Environment" value={environment} tone="neutral" />
        <StatusBadge label="Mode" value={mode} tone="neutral" />
      </section>

      <section className="summary-grid summary-grid-columns-3">
        <MetricCard
          label="Application"
          value={health.appName}
          detail={`Version ${health.version}`}
        />
        <MetricCard
          label="Database"
          value={health.database.product}
          detail={`Status ${health.database.status}`}
        />
        <MetricCard
          label="Checked At"
          value={new Date(health.timestamp).toLocaleString("ko-KR", {
            hour12: false,
          })}
          detail="Server-side fetch"
        />
      </section>

      <section className="summary-grid summary-grid-columns-2">
        <div
          id="overview-contract"
          className="doc-panel doc-panel-info"
        >
          <div className="page-intro">
            <p className="page-eyebrow">Bootstrap Contract</p>
            <h2 className="section-title">운영 규약</h2>
            <p className="section-copy">
              현재 단계에서 Web, API, DB가 동일한 계약으로 묶이는지 확인하는 기준입니다.
            </p>
          </div>
          <div className="stack-list">
            <div className="list-card">
              <span className="method-badge method-badge-get">GET</span>
              <p className="section-copy">
                Health check: <code className="inline-code">/api/v1/health</code>
              </p>
            </div>
            <div className="list-card">
              <span className="mono-pill">REST</span>
              <p className="section-copy">
                Base path: <code className="inline-code">/api/v1</code>
              </p>
            </div>
            <div className="list-card">
              <span className="mono-pill">DB</span>
              <p className="section-copy">Migration strategy: Flyway only</p>
            </div>
            <div className="list-card">
              <span className="mono-pill">Access</span>
              <p className="section-copy">Remote access: document first, no public ingress</p>
            </div>
          </div>
        </div>

        <div
          id="overview-next"
          className="doc-panel"
        >
          <div className="page-intro">
            <p className="page-eyebrow">Next Sections</p>
            <h2 className="section-title">다음 작업 영역</h2>
            <p className="section-copy">
              이후 단계는 전략, 유니버스, 백테스트 흐름을 같은 문서형 구조 안에서 확장합니다.
            </p>
          </div>
          <div className="stack-list">
            {futureSections.map((section) => (
              <Link
                key={section.label}
                href={section.href}
                className="doc-nav-link"
              >
                <span className="doc-nav-title">{section.label}</span>
                <span className="doc-nav-description">운영 콘솔 다음 단계</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="metric-card">
      <p className="metric-card-label">
        {label}
      </p>
      <h2 className="metric-card-value">{value}</h2>
      <p className="metric-card-copy">{detail}</p>
    </article>
  );
}

function StatusBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "neutral";
}) {
  const toneClassName = {
    good: "status-chip status-chip-success",
    warn: "status-chip status-chip-warning",
    neutral: "status-chip status-chip-info",
  }[tone];

  return (
    <article className="doc-panel">
      <p className="metric-card-label">
        {label}
      </p>
      <p className="metric-card-value">{value}</p>
      <span className={toneClassName}>{label} 상태</span>
    </article>
  );
}
