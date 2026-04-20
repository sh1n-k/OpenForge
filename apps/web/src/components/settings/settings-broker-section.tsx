"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  testBrokerConnection,
  updateBrokerConnectionConfig,
  type BrokerConnectionEvent,
  type OrderMode,
  type SystemBrokerStatus,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { dispatchSystemBrokerStatusUpdated } from "@/lib/system-status-events";

const modeLabel: Record<OrderMode, string> = {
  paper: "모의투자",
  live: "실전투자",
};

type SettingsBrokerSectionProps = {
  systemBroker: SystemBrokerStatus;
  events: BrokerConnectionEvent[];
  onError: (message: string | null) => void;
};

export function SettingsBrokerSection({
  systemBroker,
  events,
  onError,
}: SettingsBrokerSectionProps) {
  const router = useRouter();
  const [selectedBrokerMode, setSelectedBrokerMode] = useState<OrderMode>(
    systemBroker.currentSystemMode,
  );
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
    setBrokerEnabled(activeBroker.enabled);
    setAppKeyInput("");
    setAppSecretInput("");
    setAccountNumberInput("");
    setProductCodeInput("");
  }, [activeBroker.enabled, selectedBrokerMode]);

  async function handleSaveBrokerConfig() {
    try {
      onError(null);
      setIsSavingBroker(true);
      await updateBrokerConnectionConfig({
        targetMode: selectedBrokerMode,
        appKey: appKeyInput || null,
        appSecret: appSecretInput || null,
        accountNumber: accountNumberInput || null,
        productCode: productCodeInput || null,
        enabled: brokerEnabled,
      });
      dispatchSystemBrokerStatusUpdated();
      startTransition(() => router.refresh());
    } catch (e) {
      onError(e instanceof Error ? e.message : "브로커 설정 저장에 실패했습니다.");
    } finally {
      setIsSavingBroker(false);
    }
  }

  async function handleTestBrokerConnection() {
    try {
      onError(null);
      setIsTestingBroker(true);
      await testBrokerConnection({ targetMode: selectedBrokerMode });
      dispatchSystemBrokerStatusUpdated();
      startTransition(() => router.refresh());
    } catch (e) {
      onError(e instanceof Error ? e.message : "연결 테스트에 실패했습니다.");
    } finally {
      setIsTestingBroker(false);
    }
  }

  return (
    <section id="settings-broker">
      <h2 className="section-title">브로커 연결</h2>
      <p className="section-copy">
        한국투자증권 Open API 연결 정보를 관리합니다.
        현재 시스템 모드:{" "}
        <strong>
          {modeLabel[systemBroker.currentSystemMode as OrderMode] ??
            systemBroker.currentSystemMode}
        </strong>
      </p>

      {/* 모드 탭 */}
      <div className="settings-tabs">
        {(["paper", "live"] as OrderMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setSelectedBrokerMode(mode)}
            className={`settings-tab ${selectedBrokerMode === mode ? "settings-tab-active" : ""}`}
          >
            {modeLabel[mode]}
          </button>
        ))}
      </div>

      <div className="doc-panel">
        {/* 현재 저장 상태 */}
        <div className="settings-broker-status">
          <div className="settings-broker-status-item">
            <span className="form-label">설정 상태</span>
            <span className={activeBroker.isConfigured ? "status-chip status-chip-success" : "status-chip"}>
              {activeBroker.isConfigured ? "설정 완료" : "미설정"}
            </span>
          </div>
          <div className="settings-broker-status-item">
            <span className="form-label">활성화</span>
            <span
              className={
                activeBroker.enabled
                  ? "status-chip status-chip-success"
                  : "status-chip status-chip-warning"
              }
            >
              {activeBroker.enabled ? "활성" : "비활성"}
            </span>
          </div>
          <div className="settings-broker-status-item">
            <span className="form-label">앱키</span>
            <span className="text-muted">{activeBroker.maskedAppKey ?? "—"}</span>
          </div>
          <div className="settings-broker-status-item">
            <span className="form-label">계좌번호</span>
            <span className="text-muted">{activeBroker.maskedAccountNumber ?? "—"}</span>
          </div>
          <div className="settings-broker-status-item">
            <span className="form-label">연결 테스트</span>
            {activeBroker.lastConnectionTestStatus ? (
              <span
                className={
                  activeBroker.lastConnectionTestStatus === "success"
                    ? "status-chip status-chip-success"
                    : "status-chip status-chip-error"
                }
              >
                {activeBroker.lastConnectionTestStatus === "success"
                  ? "성공"
                  : "실패"}
                {activeBroker.lastConnectionTestAt
                  ? ` · ${formatDateTime(activeBroker.lastConnectionTestAt)}`
                  : ""}
              </span>
            ) : (
              <span className="text-subtle">미실행</span>
            )}
          </div>
        </div>

        {/* 입력 폼 */}
        <div className="settings-broker-form">
          <div className="form-row">
            <label className="form-field">
              <span className="form-label">앱키</span>
              <input
                value={appKeyInput}
                onChange={(e) => setAppKeyInput(e.target.value)}
                placeholder={activeBroker.isConfigured ? "비워두면 기존 값 유지" : "앱키 입력"}
              />
            </label>
            <label className="form-field">
              <span className="form-label">앱시크릿</span>
              <input
                type="password"
                value={appSecretInput}
                onChange={(e) => setAppSecretInput(e.target.value)}
                placeholder={activeBroker.isConfigured ? "비워두면 기존 값 유지" : "앱시크릿 입력"}
              />
            </label>
          </div>
          <div className="form-row">
            <label className="form-field">
              <span className="form-label">계좌번호 (앞 8자리)</span>
              <input
                value={accountNumberInput}
                onChange={(e) => setAccountNumberInput(e.target.value)}
                placeholder={activeBroker.isConfigured ? "비워두면 기존 값 유지" : "12345678"}
              />
            </label>
            <label className="form-field">
              <span className="form-label">상품코드</span>
              <input
                value={productCodeInput}
                onChange={(e) => setProductCodeInput(e.target.value)}
                placeholder={activeBroker.isConfigured ? "비워두면 기존 값 유지" : "01"}
              />
            </label>
          </div>
          <label className="flex-center">
            <input
              type="checkbox"
              checked={brokerEnabled}
              onChange={(e) => setBrokerEnabled(e.target.checked)}
            />
            <span className="form-label">연결 설정 활성화</span>
          </label>
          <p className="text-subtle" style={{ fontSize: "0.8125rem" }}>
            저장된 자격증명은 AES-256-GCM으로 암호화됩니다. 빈 칸은 기존 값을 유지합니다.
          </p>
          <div className="page-actions">
            <button type="button" onClick={handleSaveBrokerConfig} disabled={isSavingBroker} className="button-primary">
              {isSavingBroker ? "저장 중..." : "설정 저장"}
            </button>
            <button type="button" onClick={handleTestBrokerConnection} disabled={isTestingBroker || !activeBroker.isConfigured} className="button-secondary">
              {isTestingBroker ? "테스트 중..." : "연결 테스트"}
            </button>
          </div>
        </div>
      </div>

      {events.length > 0 ? (
        <div className="stack-list" style={{ marginTop: 16 }}>
          {events.map((event) => (
            <div key={event.id} className="list-card">
              <div className="flex-between">
                <div className="flex-center">
                  <span className="mono-pill">{event.eventType}</span>
                  <span className="text-muted">{event.message}</span>
                </div>
                <span className="text-subtle" style={{ fontSize: "0.8125rem" }}>
                  {formatDateTime(event.occurredAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
