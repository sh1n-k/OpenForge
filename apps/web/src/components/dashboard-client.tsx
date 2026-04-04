"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  updateSystemRiskKillSwitch,
  type DashboardResponse,
  type SystemRisk,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { PageIntroSection, SectionHeaderBlock } from "@/components/page-layout";

type DashboardClientProps = {
  dashboard: DashboardResponse;
  systemRisk: SystemRisk;
};

const strategyStatusLabel: Record<string, string> = {
  running: "실행 중",
  stopped: "중지",
  draft: "초안",
  backtest_completed: "백테스트 완료",
};

const strategyStatusChip: Record<string, string> = {
  running: "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium border bg-success-soft text-success border-success/20",
  stopped: "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium border bg-warning-soft text-warning border-warning/20",
  draft: "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium border bg-surface text-foreground border-border",
  backtest_completed: "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium border bg-primary-soft text-primary border-primary/20",
};

function formatPnl(value: number): string {
  if (value === 0) return "0";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toLocaleString()}`;
}

function pnlClassName(value: number): string {
  if (value > 0) return "text-success";
  if (value < 0) return "text-error";
  return "text-muted";
}

export function DashboardClient({
  dashboard,
  systemRisk,
}: DashboardClientProps) {
  const router = useRouter();
  const [killSwitch, setKillSwitch] = useState(systemRisk.killSwitchEnabled);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleKillSwitch() {
    const next = !killSwitch;
    const label = next ? "자동매매를 가동합니다" : "전체 자동매매를 중지합니다";
    if (!window.confirm(`${label}. 계속하시겠습니까?`)) return;

    try {
      setError(null);
      setIsToggling(true);
      await updateSystemRiskKillSwitch({ enabled: next });
      setKillSwitch(next);
      startTransition(() => router.refresh());
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "킬스위치 변경에 실패했습니다.",
      );
    } finally {
      setIsToggling(false);
    }
  }

  const hasStrategies = dashboard.strategySummaries.length > 0;
  const hasFills = dashboard.recentFills.length > 0;
  const hasPositions = dashboard.currentPositions.length > 0;
  const hasErrors = dashboard.recentErrors.length > 0;
  const killSwitchLabel = killSwitch ? "자동매매 가동 중" : "자동매매 중지됨";
  const killSwitchDescription = killSwitch
    ? "전략 스케줄에 따라 시그널이 생성되고 주문이 실행됩니다."
    : "모든 자동매매가 중지된 상태입니다. 주문이 실행되지 않습니다.";
  const killSwitchActionLabel = isToggling
    ? "변경 중..."
    : killSwitch
      ? "전체 중지"
      : "가동 시작";

  return (
    <main className="grid content-start gap-8 w-[min(100%,var(--content-width))] mx-auto px-5 pt-8 pb-16">
      <PageIntroSection
        id="dashboard-summary"
        eyebrow="Dashboard"
        title="운영 대시보드"
        description="자동매매 상태, 전략 실행 현황, 주문 및 포지션 흐름을 한 화면에서 확인합니다."
      />

      <div
        className={`flex flex-wrap items-start justify-between gap-6 p-6 rounded-xl border ${killSwitch ? "border-success bg-success-soft" : "border-warning bg-warning-soft"}`}
      >
        <div className="grid gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse ${killSwitch ? "bg-success shadow-[0_0_8px_rgba(22,163,74,0.5)]" : "bg-warning shadow-[0_0_8px_rgba(202,138,4,0.5)]"}`}
            />
            <span className={`font-sans font-bold tracking-tight text-lg ${killSwitch ? "text-success" : "text-warning"}`}>{killSwitchLabel}</span>
          </div>
          <p className="m-0 text-foreground font-medium text-[0.9375rem]">
            {killSwitchDescription}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium border ${killSwitch ? "bg-success-soft text-success border-success/20" : "bg-warning-soft text-warning border-warning/20"}`}
            >
              {killSwitch ? "주문 실행 가능" : "주문 실행 차단"}
            </span>
            <span className="text-subtle text-sm">
              전략 설정과 무관하게 현재 상태가 실제 주문 실행을 제어합니다.
            </span>
          </div>
        </div>
        <div>
          <button
            type="button"
            disabled={isToggling}
            onClick={handleToggleKillSwitch}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${killSwitch ? "bg-error hover:bg-red-700 focus:ring-error" : "bg-primary hover:bg-primary-hover focus:ring-primary"} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {killSwitchActionLabel}
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-6 border rounded-xl shadow-sm border-red-200 bg-red-50 text-error">
          <p className="m-0 text-[0.9375rem]">{error}</p>
        </div>
      ) : null}

      {/* Metric Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 justify-start">
        <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-l-primary">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">실행 중 전략</p>
          <p className="m-0 font-sans text-3xl leading-snug font-bold text-foreground">{dashboard.runningStrategyCount}</p>
          <p className="m-0 text-muted text-sm">
            총 {dashboard.strategySummaries.length}개 전략 중 활성 전략 수
          </p>
        </article>
        <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-l-secondary">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">금일 주문</p>
          <p className="m-0 font-sans text-3xl leading-snug font-bold text-foreground">{dashboard.todayOrderCount}</p>
          <p className="m-0 text-muted text-sm">오늘 접수된 주문 요청 수</p>
        </article>
        <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-l-success">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">금일 손익</p>
          <p className={`m-0 font-sans text-3xl leading-snug font-bold ${pnlClassName(dashboard.todayPnl)}`}>
            {formatPnl(dashboard.todayPnl)}
          </p>
          <p className="m-0 text-muted text-sm">실현 손익 기준의 일간 누적 값</p>
        </article>
        <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-l-warning">
          <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">보유 포지션</p>
          <p className="m-0 font-sans text-3xl leading-snug font-bold text-foreground">{dashboard.positionCount}</p>
          <p className="m-0 text-muted text-sm">현재 보유 중인 심볼 포지션 수</p>
        </article>
      </div>

      {/* Strategies */}
      <section id="dashboard-strategies">
        <SectionHeaderBlock title="전략 현황" />
        {hasStrategies ? (
          <div className="p-6 border border-border-soft rounded-xl bg-surface shadow-sm overflow-hidden">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">이름</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">타입</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">상태</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">실행</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">최근 실행</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">포지션</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">금일 주문</th>
                  </tr>
                </thead>
                <tbody className="align-baseline">
                  {dashboard.strategySummaries.map((s) => (
                    <tr key={s.id} className="group hover:bg-slate-50/50">
                      <td className="py-3 border-b border-border-soft">
                        <Link
                          href={`/strategies/${s.id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td className="py-3 border-b border-border-soft text-muted">{s.strategyType}</td>
                      <td className="py-3 border-b border-border-soft">
                        <span
                          className={
                            strategyStatusChip[s.status] ?? "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium border bg-surface text-foreground border-border"
                          }
                        >
                          {strategyStatusLabel[s.status] ?? s.status}
                        </span>
                      </td>
                      <td className="py-3 border-b border-border-soft text-foreground">{s.executionEnabled ? "ON" : "OFF"}</td>
                      <td className="py-3 border-b border-border-soft text-muted">
                        {s.lastRunStatus ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                s.lastRunStatus === "completed"
                                  ? "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-success-soft text-success"
                                  : s.lastRunStatus === "failed"
                                    ? "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-error-soft text-error"
                                    : "inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm text-[0.6875rem] font-bold uppercase bg-primary-soft text-primary"
                              }
                            >
                              {s.lastRunStatus}
                            </span>
                            <span className="text-[0.8125rem]">{formatDateTime(s.lastRunAt)}</span>
                          </div>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </td>
                      <td className="py-3 border-b border-border-soft text-right font-mono text-muted">{s.positionCount}</td>
                      <td className="py-3 border-b border-border-soft text-right font-mono text-muted">{s.todayOrderCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 justify-items-center p-12 px-6 border border-dashed border-border rounded-xl text-center">
            <p className="m-0 text-muted font-medium">등록된 전략이 없습니다</p>
            <p className="m-0 text-subtle text-sm max-w-sm">
              전략을 만들어 자동매매를 시작하세요.
            </p>
            <Link href="/strategies" className="mt-2 inline-flex items-center justify-center px-4 py-2 font-medium rounded-lg bg-primary !text-white hover:bg-primary-hover shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-primary">
              전략 만들기
            </Link>
          </div>
        )}
      </section>

      {/* Recent Fills */}
      <section id="dashboard-fills">
        <SectionHeaderBlock title="최근 체결" />
        {hasFills ? (
          <div className="p-6 border border-border-soft rounded-xl bg-surface shadow-sm overflow-hidden">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">전략</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">심볼</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">방향</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">수량</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">가격</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">손익</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">시간</th>
                  </tr>
                </thead>
                <tbody className="align-baseline">
                  {dashboard.recentFills.map((fill) => (
                    <tr key={fill.id} className="group hover:bg-slate-50/50">
                      <td className="py-3 border-b border-border-soft">
                        <Link
                          href={`/strategies/${fill.strategyId}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {fill.strategyName}
                        </Link>
                      </td>
                      <td className="py-3 border-b border-border-soft font-mono text-muted">{fill.symbol}</td>
                      <td className="py-3 border-b border-border-soft">
                        <span className={fill.side === "buy" ? "text-success font-medium" : "text-error font-medium"}>{fill.side}</span>
                      </td>
                      <td className="py-3 border-b border-border-soft text-right font-mono text-muted">{fill.quantity}</td>
                      <td className="py-3 border-b border-border-soft text-right font-mono text-muted">{fill.price.toLocaleString()}</td>
                      <td className={`py-3 border-b border-border-soft text-right font-mono ${pnlClassName(fill.realizedPnl)}`}>
                        {formatPnl(fill.realizedPnl)}
                      </td>
                      <td className="py-3 border-b border-border-soft text-right text-muted text-[0.8125rem]">{formatDateTime(fill.filledAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center">
            <p className="m-0 text-muted font-medium">체결 내역이 없습니다</p>
            <p className="m-0 text-subtle text-sm max-w-sm">
              주문이 체결되면 최신 체결 흐름이 이 영역에 표시됩니다.
            </p>
            <div className="flex flex-wrap gap-3 mt-2">
              <Link href="/orders" className="inline-flex items-center justify-center px-4 py-2 font-medium rounded-lg bg-surface border border-border text-foreground hover:bg-[#fafafa] shadow-sm transition-all text-sm">
                주문 현황 보기
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Positions */}
      <section id="dashboard-positions">
        <SectionHeaderBlock title="현재 포지션" />
        {hasPositions ? (
          <div className="p-6 border border-border-soft rounded-xl bg-surface shadow-sm overflow-hidden">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">전략</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60">심볼</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">순수량</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">평균단가</th>
                    <th className="font-semibold text-muted pb-3 border-b border-border/60 text-right">최근 체결</th>
                  </tr>
                </thead>
                <tbody className="align-baseline">
                  {dashboard.currentPositions.map((pos) => (
                    <tr key={`${pos.strategyId}-${pos.symbol}`} className="group hover:bg-slate-50/50">
                      <td className="py-3 border-b border-border-soft">
                        <Link
                          href={`/strategies/${pos.strategyId}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {pos.strategyName}
                        </Link>
                      </td>
                      <td className="py-3 border-b border-border-soft font-mono text-muted">{pos.symbol}</td>
                      <td className="py-3 border-b border-border-soft text-right font-mono text-muted">{pos.netQuantity}</td>
                      <td className="py-3 border-b border-border-soft text-right font-mono text-muted">{pos.avgEntryPrice.toLocaleString()}</td>
                      <td className="py-3 border-b border-border-soft text-right text-muted text-[0.8125rem]">{formatDateTime(pos.lastFillAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center">
            <p className="m-0 text-muted font-medium">보유 포지션이 없습니다</p>
            <p className="m-0 text-subtle text-sm max-w-sm">
              브로커 원장 또는 포지션 화면에서 실시간 보유 현황을 확인할 수 있습니다.
            </p>
            <div className="flex flex-wrap gap-3 mt-2">
              <Link href="/positions" className="inline-flex items-center justify-center px-4 py-2 font-medium rounded-lg bg-surface border border-border text-foreground hover:bg-[#fafafa] shadow-sm transition-all text-sm">
                포지션 보기
              </Link>
              <Link href="/broker" className="inline-flex items-center justify-center px-4 py-2 font-medium rounded-lg text-primary hover:bg-primary-soft transition-all text-sm">
                브로커 원장 보기
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Errors */}
      <section id="dashboard-errors">
        <SectionHeaderBlock title="최근 오류" />
        {hasErrors ? (
          <div className="grid gap-3">
            {dashboard.recentErrors.map((err, index) => (
              <div key={`${err.occurredAt}-${index}`} className="flex flex-col gap-3 p-4 border border-red-200 bg-red-50/50 rounded-xl">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[0.6875rem] font-mono border bg-surface text-foreground border-border">{err.source}</span>
                    {err.strategyName ? (
                      <span className="text-muted text-sm">{err.strategyName}</span>
                    ) : null}
                  </div>
                  <span className="text-subtle text-[0.8125rem]">
                    {formatDateTime(err.occurredAt)}
                  </span>
                </div>
                <p className="m-0 text-[0.9375rem] text-error font-medium">{err.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 border border-success/30 rounded-xl bg-success-soft shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1.5">
                <p className="m-0 font-sans text-lg leading-snug font-semibold text-success">최근 오류가 없습니다</p>
                <p className="m-0 text-success/80 text-[0.9375rem]">
                  최근 운영 이벤트에서 치명적 오류가 감지되지 않았습니다.
                </p>
              </div>
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase bg-success text-white border-success">정상</span>
            </div>
          </div>
        )}
      </section>

      {/* Health */}
      <section id="dashboard-health">
        <div className="flex flex-wrap items-center justify-between gap-6 pt-8 mt-8 border-t border-border-soft">
          <h2 className="m-0 font-sans text-[1.375rem] leading-snug font-semibold text-foreground">시스템 상태</h2>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase border ${dashboard.health.apiStatus === "UP" ? "bg-success-soft text-success border-success/20" : "bg-error-soft text-error border-error/20"}`}>
              API {dashboard.health.apiStatus}
            </span>
            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase border ${dashboard.health.dbStatus === "UP" ? "bg-success-soft text-success border-success/20" : "bg-error-soft text-error border-error/20"}`}>
              DB {dashboard.health.dbStatus}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
