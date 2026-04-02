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
import { formatConnectionStatus, formatDateTime } from "@/lib/format";
import type { HealthSnapshot } from "@/lib/health";

type SettingsPageClientProps = {
  systemBroker: SystemBrokerStatus;
  systemBrokerEvents: BrokerConnectionEvent[];
  systemRisk: SystemRisk;
  systemRiskEvents: SystemRiskEvent[];
  health: HealthSnapshot;
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
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(
    systemRisk.killSwitchEnabled,
  );
  const [isSavingRisk, setIsSavingRisk] = useState(false);
  const [selectedBrokerMode, setSelectedBrokerMode] =
    useState<OrderMode>("paper");
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
    setKillSwitchEnabled(systemRisk.killSwitchEnabled);
  }, [systemRisk.killSwitchEnabled]);

  useEffect(() => {
    setBrokerEnabled(activeBroker.enabled);
    setAppKeyInput("");
    setAppSecretInput("");
    setAccountNumberInput("");
    setProductCodeInput("");
  }, [
    activeBroker.enabled,
    activeBroker.maskedAccountNumber,
    activeBroker.maskedAppKey,
    activeBroker.maskedProductCode,
    selectedBrokerMode,
  ]);

  async function handleSaveSystemRisk() {
    try {
      setError(null);
      setIsSavingRisk(true);
      await updateSystemRiskKillSwitch({ enabled: killSwitchEnabled });
      startTransition(() => router.refresh());
    } catch (systemRiskError) {
      setError(
        systemRiskError instanceof Error
          ? systemRiskError.message
          : "전역 리스크 설정 저장에 실패했습니다.",
      );
    } finally {
      setIsSavingRisk(false);
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
    } catch (brokerError) {
      setError(
        brokerError instanceof Error
          ? brokerError.message
          : "브로커 연결 설정 저장에 실패했습니다.",
      );
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
    } catch (brokerError) {
      setError(
        brokerError instanceof Error
          ? brokerError.message
          : "브로커 연결 테스트에 실패했습니다.",
      );
    } finally {
      setIsTestingBroker(false);
    }
  }

  return (
    <main className="page-shell page-shell-wide docs-page-shell">
      <section
        id="settings-summary"
        className="doc-panel"
      >
        <div className="page-intro-row">
          <div className="page-intro">
            <p className="page-eyebrow">Settings</p>
            <h1 className="page-title">System Settings</h1>
            <p className="page-description">
              브로커 연결, 전역 리스크, 시스템 상태를 관리합니다.
            </p>
          </div>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </section>

      <section
        id="settings-broker"
        className="summary-grid summary-grid-columns-2"
      >
        <div className="doc-panel doc-panel-warn">
          <div className="page-intro-row">
            <div>
              <p className="page-eyebrow">Global Risk</p>
              <h2 className="section-title">전역 킬 스위치</h2>
              <p className="section-copy">
                {killSwitchEnabled
                  ? "모든 새 주문 요청을 차단합니다."
                  : "전역 주문 차단이 비활성 상태입니다."}
              </p>
            </div>
            <label className="list-card flex items-center gap-3">
              <input
                type="checkbox"
                checked={killSwitchEnabled}
                onChange={(event) => setKillSwitchEnabled(event.target.checked)}
              />
              <span className="text-sm font-semibold text-slate-900">
                킬 스위치
              </span>
            </label>
          </div>
          <div className="page-actions">
            <button
              type="button"
              onClick={handleSaveSystemRisk}
              disabled={isSavingRisk}
              className="button-primary"
            >
              {isSavingRisk ? "저장 중..." : "전역 설정 저장"}
            </button>
            <span className="section-copy">
              updated {formatDateTime(systemRisk.updatedAt) ?? "unknown"}
            </span>
          </div>
          <div className="stack-list">
            {systemRiskEvents.length === 0 ? (
              <p className="section-copy">
                최근 전역 리스크 이벤트가 없습니다.
              </p>
            ) : (
              systemRiskEvents.map((event) => (
                <article
                  key={event.id}
                  className="list-card"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {event.eventType} / {event.reasonCode}
                      </p>
                      <p className="section-copy">{event.message}</p>
                    </div>
                    <span className="metric-card-label">
                      {formatDateTime(event.occurredAt)}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div
          id="settings-risk"
          className="doc-panel doc-panel-info"
        >
          <div className="page-intro-row">
            <div>
              <p className="page-eyebrow">Broker Connectivity</p>
              <h2 className="section-title">브로커 연결 설정</h2>
              <p className="section-copy">
                현재 시스템 모드:{" "}
                <span className="font-semibold text-slate-900">
                  {systemBroker.currentSystemMode}
                </span>
                {" · "}
                {systemBroker.isCurrentModeConfigured
                  ? "현재 모드 설정이 준비되었습니다."
                  : "현재 모드 설정이 아직 준비되지 않았습니다."}
              </p>
            </div>
            <div className="inline-flex rounded-full border border-sky-200 bg-white p-1">
              {(["paper", "live"] as OrderMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedBrokerMode(mode)}
                  className={`button-ghost ${
                    selectedBrokerMode === mode
                      ? "bg-[#2563eb] text-white"
                      : "text-slate-600"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="summary-grid summary-grid-columns-2">
            <div className="list-card">
              <p className="metric-card-label">
                Saved
              </p>
              <div className="stack-list">
                <p>설정 상태: {activeBroker.isConfigured ? "완료" : "미설정"}</p>
                <p>활성화: {activeBroker.enabled ? "예" : "아니오"}</p>
                <p>앱키: {activeBroker.maskedAppKey ?? "없음"}</p>
                <p>계좌번호: {activeBroker.maskedAccountNumber ?? "없음"}</p>
                <p>상품코드: {activeBroker.maskedProductCode ?? "없음"}</p>
                <p>
                  마지막 테스트:{" "}
                  {activeBroker.lastConnectionTestStatus
                    ? `${formatConnectionStatus(activeBroker.lastConnectionTestStatus)} / ${
                        formatDateTime(activeBroker.lastConnectionTestAt) ??
                        "unknown"
                      }`
                    : "없음"}
                </p>
                <p className="section-copy">
                  {activeBroker.lastConnectionTestMessage ??
                    "연결 테스트 결과가 없습니다."}
                </p>
              </div>
            </div>

            <div className="stack-list doc-panel">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                앱키
                <input
                  value={appKeyInput}
                  onChange={(event) => setAppKeyInput(event.target.value)}
                  placeholder={
                    activeBroker.isConfigured
                      ? "비워두면 기존 값 유지"
                      : "앱키 입력"
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                앱시크릿
                <input
                  type="password"
                  value={appSecretInput}
                  onChange={(event) => setAppSecretInput(event.target.value)}
                  placeholder={
                    activeBroker.isConfigured
                      ? "비워두면 기존 값 유지"
                      : "앱시크릿 입력"
                  }
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  계좌번호(앞 8자리)
                  <input
                    value={accountNumberInput}
                    onChange={(event) => setAccountNumberInput(event.target.value)}
                    placeholder={
                      activeBroker.isConfigured
                        ? "비워두면 기존 값 유지"
                        : "12345678"
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  상품코드
                  <input
                    value={productCodeInput}
                    onChange={(event) => setProductCodeInput(event.target.value)}
                    placeholder={
                      activeBroker.isConfigured ? "비워두면 기존 값 유지" : "01"
                    }
                  />
                </label>
              </div>
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={brokerEnabled}
                  onChange={(event) => setBrokerEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                연결 설정 활성화
              </label>
              <p className="text-xs text-slate-500">
                저장 API는 평문을 다시 반환하지 않습니다. 빈 칸은 기존 암호화 값을
                유지합니다.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveBrokerConfig}
                  disabled={isSavingBroker}
                  className="button-primary"
                >
                  {isSavingBroker ? "저장 중..." : "브로커 설정 저장"}
                </button>
                <button
                  type="button"
                  onClick={handleTestBrokerConnection}
                  disabled={isTestingBroker || !activeBroker.isConfigured}
                  className="button-secondary"
                >
                  {isTestingBroker ? "테스트 중..." : "연결 테스트"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {systemBrokerEvents.length === 0 ? (
              <p className="text-sm text-slate-600">
                최근 브로커 연결 이벤트가 없습니다.
              </p>
            ) : (
              systemBrokerEvents.map((event) => (
                <article
                  key={event.id}
                  className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {event.targetMode} / {event.eventType}
                      </p>
                      <p className="text-sm text-slate-600">{event.message}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {formatDateTime(event.occurredAt)}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section
        id="settings-system"
        className="doc-panel"
      >
        <p className="page-eyebrow">System</p>
        <h2 className="section-title">시스템 상태</h2>
        <div className="summary-grid summary-grid-columns-2">
          <div className="list-card">
            <p className="metric-card-label">API</p>
            <div className="stack-list">
              <p>
                상태:{" "}
                <span
                  className={`status-chip ${health.status === "UP" ? "status-chip-ok" : "status-chip-danger"}`}
                >
                  {health.status}
                </span>
              </p>
              <p>버전: {health.version}</p>
              <p>환경: {health.environment}</p>
              <p>모드: {health.mode}</p>
            </div>
          </div>
          <div className="list-card">
            <p className="metric-card-label">Database</p>
            <div className="stack-list">
              <p>
                상태:{" "}
                <span
                  className={`status-chip ${health.database.status === "UP" ? "status-chip-ok" : "status-chip-danger"}`}
                >
                  {health.database.status}
                </span>
              </p>
              <p>제품: {health.database.product}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
