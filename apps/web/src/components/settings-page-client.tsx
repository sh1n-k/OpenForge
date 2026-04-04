"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  testBrokerConnection,
  updateBrokerConnectionConfig,
  updateSystemRiskKillSwitch,
  type BrokerConnectionEvent,
  type OrderMode,
  type SystemBrokerStatus,
  type SystemRisk,
  type SystemRiskEvent,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { HealthSnapshot } from "@/lib/health";
import { PageIntroSection, SectionHeaderBlock } from "@/components/page-layout";

type SettingsPageClientProps = {
  systemBroker: SystemBrokerStatus;
  systemBrokerEvents: BrokerConnectionEvent[];
  systemRisk: SystemRisk;
  systemRiskEvents: SystemRiskEvent[];
  health: HealthSnapshot;
};

const modeLabel: Record<OrderMode, string> = {
  paper: "모의투자",
  live: "실전투자",
};

export function SettingsPageClient({
  systemBroker,
  systemBrokerEvents,
  systemRisk,
  systemRiskEvents,
  health,
}: SettingsPageClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [killSwitch, setKillSwitch] = useState(systemRisk.killSwitchEnabled);
  const [isTogglingRisk, setIsTogglingRisk] = useState(false);
  const [selectedBrokerMode, setSelectedBrokerMode] = useState<OrderMode>("paper");
  const [brokerEnabled, setBrokerEnabled] = useState(systemBroker.paper.enabled);
  const [appKeyInput, setAppKeyInput] = useState("");
  const [appSecretInput, setAppSecretInput] = useState("");
  const [accountNumberInput, setAccountNumberInput] = useState("");
  const [productCodeInput, setProductCodeInput] = useState("");
  const [isSavingBroker, setIsSavingBroker] = useState(false);
  const [isTestingBroker, setIsTestingBroker] = useState(false);

  const activeBroker =
    selectedBrokerMode === "paper" ? systemBroker.paper : systemBroker.live;

  useEffect(() => {
    setKillSwitch(systemRisk.killSwitchEnabled);
  }, [systemRisk.killSwitchEnabled]);

  useEffect(() => {
    setBrokerEnabled(activeBroker.enabled);
    setAppKeyInput("");
    setAppSecretInput("");
    setAccountNumberInput("");
    setProductCodeInput("");
  }, [activeBroker.enabled, selectedBrokerMode]);

  async function handleToggleKillSwitch() {
    const next = !killSwitch;
    const label = next ? "전역 킬스위치를 활성화합니다" : "전역 킬스위치를 비활성화합니다";
    if (!window.confirm(`${label}. 계속하시겠습니까?`)) return;
    try {
      setError(null);
      setIsTogglingRisk(true);
      await updateSystemRiskKillSwitch({ enabled: next });
      setKillSwitch(next);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "킬스위치 변경에 실패했습니다.");
    } finally {
      setIsTogglingRisk(false);
    }
  }

  async function handleSaveBrokerConfig() {
    try {
      setError(null);
      setIsSavingBroker(true);
      await updateBrokerConnectionConfig({
        targetMode: selectedBrokerMode,
        appKey: appKeyInput || null,
        appSecret: appSecretInput || null,
        accountNumber: accountNumberInput || null,
        productCode: productCodeInput || null,
        enabled: brokerEnabled,
      });
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "브로커 설정 저장에 실패했습니다.");
    } finally {
      setIsSavingBroker(false);
    }
  }

  async function handleTestBrokerConnection() {
    try {
      setError(null);
      setIsTestingBroker(true);
      await testBrokerConnection({ targetMode: selectedBrokerMode });
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "연결 테스트에 실패했습니다.");
    } finally {
      setIsTestingBroker(false);
    }
  }

  const isHealthy = health.status === "UP" && health.database.status === "UP";

  return (
    <main className="grid content-start gap-8 w-[min(100%,var(--content-width))] mx-auto px-5 pt-8 pb-16">
      <PageIntroSection
        id="settings-summary"
        eyebrow="Settings"
        title="시스템 설정"
        description="브로커 연결, 전역 리스크, 시스템 상태를 관리합니다."
      />

      {error ? (
        <section className="p-4 rounded-xl bg-error-soft text-error border border-error/20 text-[0.9375rem] font-medium flex items-start gap-2 shadow-sm">
          {error}
        </section>
      ) : null}

      {/* ── 전역 킬스위치 ── */}
      <section id="settings-risk" className="grid gap-5">
        <SectionHeaderBlock title="전역 리스크" />
        <div className={`p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-2xl border shadow-sm transition-all ${killSwitch ? "bg-error-soft/30 border-error" : "bg-surface border-border-soft"}`}>
          <div className="grid gap-3 flex-1">
            <div className="flex items-center gap-3">
              <span className={`flex-shrink-0 w-3 h-3 rounded-full ${killSwitch ? "bg-error shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" : "bg-success"}`} />
              <span className={`font-sans text-xl font-bold tracking-tight ${killSwitch ? "text-error" : "text-foreground"}`}>
                {killSwitch ? "킬스위치 활성 — 신규 주문 차단 중" : "킬스위치 비활성 — 정상 운영 중"}
              </span>
            </div>
            <p className="m-0 text-muted font-medium text-[0.9375rem] pl-6">
              {killSwitch
                ? "모든 전략의 신규 주문 요청이 차단됩니다."
                : "전략 설정에 따라 주문이 정상적으로 실행됩니다."}
            </p>
          </div>
          <button
            type="button"
            disabled={isTogglingRisk}
            onClick={handleToggleKillSwitch}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 whitespace-nowrap ${killSwitch ? "bg-surface border border-border text-foreground hover:bg-[#fafafa]" : "bg-error text-white hover:bg-error-hover focus:ring-error"}`}
          >
            {isTogglingRisk ? "변경 중..." : killSwitch ? "비활성화" : "킬스위치 활성화"}
          </button>
        </div>

        {systemRiskEvents.length > 0 ? (
          <div className="grid gap-3">
            {systemRiskEvents.map((event) => (
              <div key={event.id} className="p-5 bg-surface border border-border-soft rounded-xl shadow-sm hover:shadow hover:border-gray-300 transition-all group">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm font-mono text-xs font-semibold bg-border-soft text-foreground border border-border">{event.eventType}</span>
                    <span className="text-muted text-[0.9375rem]">{event.message}</span>
                  </div>
                  <span className="text-muted text-[0.75rem]">
                    {formatDateTime(event.occurredAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── 브로커 연결 ── */}
      <section id="settings-broker" className="grid gap-5">
        <SectionHeaderBlock
          title="브로커 연결"
          description={`한국투자증권 Open API 연결 정보를 관리합니다. 현재 시스템 모드: ${modeLabel[systemBroker.currentSystemMode as OrderMode] ?? systemBroker.currentSystemMode}`}
        />

        {/* 모드 탭 */}
        <div className="flex bg-surface border border-border-soft rounded-lg p-1.5 shadow-sm max-w-fit">
          {(["paper", "live"] as OrderMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSelectedBrokerMode(mode)}
              className={`px-5 py-2 font-medium text-sm rounded-md transition-all ${selectedBrokerMode === mode ? "bg-primary text-white shadow" : "text-muted hover:text-foreground hover:bg-slate-50"}`}
            >
              {modeLabel[mode]}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm grid gap-8">
          {/* 현재 저장 상태 */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6 p-5 bg-[#fafafa] border border-border-soft rounded-xl">
            <div className="grid gap-2">
              <span className="text-subtle text-xs font-semibold tracking-wider uppercase">설정 상태</span>
              <div>
                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase border ${activeBroker.isConfigured ? "bg-success-soft text-success border-success/20" : "bg-surface text-muted border-border"}`}>
                  {activeBroker.isConfigured ? "설정 완료" : "미설정"}
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-subtle text-xs font-semibold tracking-wider uppercase">활성화</span>
              <div>
                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase border ${activeBroker.enabled ? "bg-success-soft text-success border-success/20" : "bg-warning-soft text-warning border-warning/20"}`}>
                  {activeBroker.enabled ? "활성" : "비활성"}
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-subtle text-xs font-semibold tracking-wider uppercase">앱키</span>
              <span className="font-mono text-[0.9375rem] text-muted">{activeBroker.maskedAppKey ?? "—"}</span>
            </div>
            <div className="grid gap-2">
              <span className="text-subtle text-xs font-semibold tracking-wider uppercase">계좌번호</span>
              <span className="font-mono text-[0.9375rem] text-muted">{activeBroker.maskedAccountNumber ?? "—"}</span>
            </div>
            <div className="grid gap-2">
              <span className="text-subtle text-xs font-semibold tracking-wider uppercase">연결 테스트</span>
              {activeBroker.lastConnectionTestStatus ? (
                <div className="grid gap-1">
                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase border self-start ${activeBroker.lastConnectionTestStatus === "success" ? "bg-success-soft text-success border-success/20" : "bg-error-soft text-error border-error/20"}`}>
                    {activeBroker.lastConnectionTestStatus === "success" ? "성공" : "실패"}
                  </span>
                  {activeBroker.lastConnectionTestAt ? <span className="text-muted text-[0.75rem]">{formatDateTime(activeBroker.lastConnectionTestAt)}</span> : null}
                </div>
              ) : (
                <span className="text-muted text-[0.9375rem]">미실행</span>
              )}
            </div>
          </div>

          {/* 입력 폼 */}
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="grid gap-1.5 focus-within:text-primary">
                <span className="text-subtle text-sm font-medium transition-colors">앱키</span>
                <input
                  className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
                  value={appKeyInput}
                  onChange={(e) => setAppKeyInput(e.target.value)}
                  placeholder={activeBroker.isConfigured ? "비워두면 기존 값 유지" : "앱키 입력"}
                />
              </label>
              <label className="grid gap-1.5 focus-within:text-primary">
                <span className="text-subtle text-sm font-medium transition-colors">앱시크릿</span>
                <input
                  type="password"
                  className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
                  value={appSecretInput}
                  onChange={(e) => setAppSecretInput(e.target.value)}
                  placeholder={activeBroker.isConfigured ? "비워두면 기존 값 유지" : "앱시크릿 입력"}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="grid gap-1.5 focus-within:text-primary">
                <span className="text-subtle text-sm font-medium transition-colors">계좌번호 (앞 8자리)</span>
                <input
                  className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
                  value={accountNumberInput}
                  onChange={(e) => setAccountNumberInput(e.target.value)}
                  placeholder={activeBroker.isConfigured ? "비워두면 기존 값 유지" : "12345678"}
                />
              </label>
              <label className="grid gap-1.5 focus-within:text-primary">
                <span className="text-subtle text-sm font-medium transition-colors">상품코드</span>
                <input
                  className="w-full px-3 py-2 bg-surface text-foreground border border-border hover:border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[0.9375rem] transition-all"
                  value={productCodeInput}
                  onChange={(e) => setProductCodeInput(e.target.value)}
                  placeholder={activeBroker.isConfigured ? "비워두면 기존 값 유지" : "01"}
                />
              </label>
            </div>
            <label className="flex items-center gap-4 p-4 border border-border-soft rounded-xl bg-surface hover:shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-primary cursor-pointer mt-2 md:w-1/2">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                checked={brokerEnabled}
                onChange={(e) => setBrokerEnabled(e.target.checked)}
              />
              <span className="text-foreground font-semibold text-[0.9375rem]">연결 설정 활성화</span>
            </label>
            <p className="m-0 text-muted text-[0.8125rem]">
              저장된 자격증명은 AES-256-GCM으로 암호화됩니다. 빈 칸은 기존 값을 유지합니다.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-6 mt-2 border-t border-border-soft">
              <button type="button" onClick={handleSaveBrokerConfig} disabled={isSavingBroker} className="inline-flex items-center justify-center gap-2 px-5 py-2 font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
                {isSavingBroker ? "저장 중..." : "설정 저장"}
              </button>
              <button type="button" onClick={handleTestBrokerConnection} disabled={isTestingBroker || !activeBroker.isConfigured} className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg bg-surface border border-border text-foreground hover:bg-[#fafafa] hover:border-gray-300 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border disabled:opacity-50">
                {isTestingBroker ? "테스트 중..." : "연결 테스트"}
              </button>
            </div>
          </div>
        </div>

        {systemBrokerEvents.length > 0 ? (
          <div className="grid gap-3">
            {systemBrokerEvents.map((event) => (
              <div key={event.id} className="p-5 bg-surface border border-border-soft rounded-xl shadow-sm hover:shadow hover:border-gray-300 transition-all group">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm font-mono text-xs font-semibold bg-border-soft text-foreground border border-border">{event.eventType}</span>
                    <span className="text-muted text-[0.9375rem]">{event.message}</span>
                  </div>
                  <span className="text-muted text-[0.75rem]">
                    {formatDateTime(event.occurredAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── 시스템 상태 ── */}
      <section id="settings-system" className="grid gap-5">
        <SectionHeaderBlock title="시스템 상태" />
        <div className={`p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm border ${isHealthy ? "bg-success-soft/30 border-success/20" : "bg-warning-soft/30 border-warning/20"}`}>
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${isHealthy ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-warning animate-pulse"}`} />
            <span className={`font-sans text-lg font-bold tracking-tight ${isHealthy ? "text-success" : "text-warning"}`}>{isHealthy ? "정상 운영 중" : "일부 서비스 이상"}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase border ${health.status === "UP" ? "bg-success-soft text-success border-success/20" : "bg-error-soft text-error border-error/20"}`}>
              API {health.status}
            </span>
            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase border ${health.database.status === "UP" ? "bg-success-soft text-success border-success/20" : "bg-error-soft text-error border-error/20"}`}>
              DB {health.database.status}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 justify-start">
          <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-primary">
            <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">버전</p>
            <p className="m-0 font-sans text-2xl leading-snug font-bold text-foreground font-mono">{health.version}</p>
            <p className="m-0 text-muted text-[0.875rem]">현재 실행 중인 애플리케이션 버전</p>
          </article>
          <article className="grid gap-2.5 p-5 min-h-[138px] border border-border-soft rounded-xl bg-surface shadow-sm border-l-[3px] border-info">
            <p className="m-0 text-subtle text-xs font-semibold tracking-wider uppercase">환경</p>
            <p className="m-0 font-sans text-2xl leading-snug font-bold text-foreground font-mono">
              {health.environment} · {health.mode}
            </p>
            <p className="m-0 text-muted text-[0.875rem]">배포 환경과 주문 실행 모드</p>
          </article>
        </div>
      </section>
    </main>
  );
}
