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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-10 md:px-10">
      <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur md:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
            OpenForge Bootstrap
          </span>
          <div className="space-y-3">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
              개인 자동매매 운영 콘솔의 1단계 부트스트랩
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
              전략, 백테스트, 주문 추적은 아직 비어 있다. 지금 단계의 목표는
              운영 콘솔 셸과 API, 데이터베이스가 같은 규약으로 기동되는지
              확인하는 것이다.
            </p>
          </div>
        </div>

        <div className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
          <StatusBadge label="API" value={health.status} tone={isHealthy ? "good" : "warn"} />
          <StatusBadge label="Database" value={health.database.status} tone={isHealthy ? "good" : "warn"} />
          <StatusBadge label="Environment" value={environment} tone="neutral" />
          <StatusBadge label="Mode" value={mode} tone="neutral" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
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

      <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.08)] md:grid-cols-2">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
            Future Sections
          </p>
          <div className="grid gap-3">
            {futureSections.map((section) => (
              <Link
                key={section.label}
                href={section.href}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
              >
                {section.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_45%),linear-gradient(160deg,_#0f172a_0%,_#111827_100%)] p-6 text-slate-100">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">
            Bootstrap Contract
          </p>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-200">
            <li>REST base path: `/api/v1`</li>
            <li>Health check: `GET /api/v1/health`</li>
            <li>Migration strategy: Flyway only</li>
            <li>Remote access: document first, no public ingress</li>
          </ul>
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
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_16px_60px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-950">{value}</h2>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
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
    good: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    warn: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    neutral: "border-slate-400/30 bg-slate-400/10 text-slate-100",
  }[tone];

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClassName}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-75">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
