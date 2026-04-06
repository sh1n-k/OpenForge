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
    <main className="grid content-start gap-8 w-[min(100%,var(--content-width))] mx-auto px-5 pt-8 pb-16">
      <section
        id="overview-summary"
        className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-6 mb-2 pb-6 border-b border-border-soft">
          <div className="grid gap-2">
            <p className="m-0 text-primary font-bold tracking-wider uppercase text-xs">Overview</p>
            <h1 className="m-0 font-sans text-3xl font-bold tracking-tight text-foreground">개인 자동매매 운영 콘솔의 1단계 부트스트랩</h1>
            <p className="m-0 text-muted font-medium flex items-center gap-2 max-w-2xl">
              전략, 백테스트, 주문 추적은 아직 비어 있다. 지금 단계의 목표는
              운영 콘솔 셸과 API, 데이터베이스가 같은 규약으로 기동되는지
              확인하는 것이다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase border ${isHealthy ? "bg-success-soft text-success border-success/20" : "bg-warning-soft text-warning border-warning/20"}`}>
              {isHealthy ? "서비스 준비" : "점검 필요"}
            </span>
          </div>
        </div>
      </section>

      <section
        id="overview-health"
        className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 justify-start"
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

      <section className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4 justify-start">
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

      <section className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4 justify-start">
        <div
          id="overview-contract"
          className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm border-l-[3px] border-l-info"
        >
          <div className="grid gap-2 mb-6">
            <p className="m-0 text-primary font-bold tracking-wider uppercase text-xs">Bootstrap Contract</p>
            <h2 className="m-0 font-sans text-xl font-bold text-foreground">운영 규약</h2>
            <p className="m-0 text-muted text-[0.9375rem] leading-relaxed">
              현재 단계에서 Web, API, DB가 동일한 계약으로 묶이는지 확인하는 기준입니다.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="p-4 bg-surface border border-border-soft rounded-xl shadow-sm">
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-info-soft text-info border border-info/20 mb-2">GET</span>
              <p className="m-0 text-foreground font-medium text-[0.9375rem] leading-relaxed">
                Health check: <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[0.875rem] font-mono border border-slate-200">/api/v1/health</code>
              </p>
            </div>
            <div className="p-4 bg-surface border border-border-soft rounded-xl shadow-sm">
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm font-mono text-[0.6875rem] font-semibold bg-border-soft text-foreground border border-border mb-2 leading-none">REST</span>
              <p className="m-0 text-foreground font-medium text-[0.9375rem] leading-relaxed">
                Base path: <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[0.875rem] font-mono border border-slate-200">/api/v1</code>
              </p>
            </div>
            <div className="p-4 bg-surface border border-border-soft rounded-xl shadow-sm">
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm font-mono text-[0.6875rem] font-semibold bg-border-soft text-foreground border border-border mb-2 leading-none">DB</span>
              <p className="m-0 text-foreground font-medium text-[0.9375rem] leading-relaxed">Migration strategy: Flyway only</p>
            </div>
            <div className="p-4 bg-surface border border-border-soft rounded-xl shadow-sm">
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm font-mono text-[0.6875rem] font-semibold bg-border-soft text-foreground border border-border mb-2 leading-none">Access</span>
              <p className="m-0 text-foreground font-medium text-[0.9375rem] leading-relaxed">Remote access: document first, no public ingress</p>
            </div>
          </div>
        </div>

        <div
          id="overview-next"
          className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm"
        >
          <div className="grid gap-2 mb-6">
            <p className="m-0 text-primary font-bold tracking-wider uppercase text-xs">Next Sections</p>
            <h2 className="m-0 font-sans text-xl font-bold text-foreground">다음 작업 영역</h2>
            <p className="m-0 text-muted text-[0.9375rem] leading-relaxed">
              이후 단계는 전략, 유니버스, 백테스트 흐름을 같은 문서형 구조 안에서 확장합니다.
            </p>
          </div>
          <div className="grid gap-3">
            {futureSections.map((section) => (
              <Link
                key={section.label}
                href={section.href}
                className="block p-4 bg-surface border border-border-soft rounded-xl shadow-sm hover:shadow hover:border-primary/50 transition-all font-medium text-foreground hover:text-primary list-card"
              >
                <div className="font-semibold text-foreground text-[0.9375rem] group-hover:text-primary transition-colors">{section.label}</div>
                <div className="text-muted text-[0.8125rem] mt-1">운영 콘솔 다음 단계</div>
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
    <article className="grid gap-2.5 p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm content-start hover:shadow hover:border-gray-300 transition-all">
      <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">
        {label}
      </p>
      <h2 className="m-0 font-sans text-4xl leading-tight font-bold tracking-tight text-foreground">{value}</h2>
      <p className="m-0 text-muted text-[0.9375rem] leading-relaxed">{detail}</p>
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
    good: "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-success-soft text-success border border-success/20",
    warn: "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-warning-soft text-warning border border-warning/20",
    neutral: "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-info-soft text-info border border-info/20",
  }[tone];

  return (
    <article className="p-5 bg-surface border border-border-soft rounded-xl shadow-sm hover:shadow hover:border-gray-300 transition-all flex flex-col gap-2">
      <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">
        {label}
      </p>
      <p className="m-0 font-sans text-2xl leading-snug font-bold text-foreground">{value}</p>
      <div className="mt-2 text-left">
        <span className={toneClassName}>{label} 상태</span>
      </div>
    </article>
  );
}
