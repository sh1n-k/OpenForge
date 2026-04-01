"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  archiveStrategy,
  cloneStrategy,
  createStrategy,
  testBrokerConnection,
  updateBrokerConnectionConfig,
  updateSystemRiskKillSwitch,
  type BrokerConnectionEvent,
  type OrderMode,
  type StrategySummary,
  type StrategyType,
  type SystemBrokerStatus,
  type SystemRisk,
  type SystemRiskEvent,
} from "@/lib/api";
import { StrategyListView } from "@/components/strategy-list-view";
import {
  makeBuilderPayload,
  makeCodeTemplate,
} from "@/lib/strategy-editor";

type StrategiesPageClientProps = {
  strategies: StrategySummary[];
  systemRisk: SystemRisk;
  systemRiskEvents: SystemRiskEvent[];
  systemBroker: SystemBrokerStatus;
  systemBrokerEvents: BrokerConnectionEvent[];
};

const defaultPayloads: Record<StrategyType, string> = {
  builder: JSON.stringify(
    makeBuilderPayload({
      metadata: {
        id: "new_builder_strategy",
        name: "New Builder Strategy",
        description: "",
        category: "custom",
        author: "OpenForge",
        tags: [],
      },
      indicators: [],
      entry: { logic: "AND", conditions: [] },
      exit: { logic: "AND", conditions: [] },
      risk: {
        stopLoss: { enabled: false, percent: 0 },
        takeProfit: { enabled: false, percent: 0 },
        trailingStop: { enabled: false, percent: 0 },
      },
    }),
    null,
    2,
  ),
  code: JSON.stringify(
    {
      source: makeCodeTemplate("New Code Strategy", ""),
      sourceKind: "openforge_yaml",
    },
    null,
    2,
  ),
};

export function StrategiesPageClient({
  strategies,
  systemRisk,
  systemRiskEvents,
  systemBroker,
  systemBrokerEvents,
}: StrategiesPageClientProps) {
  const router = useRouter();
  const [strategyType, setStrategyType] = useState<StrategyType>("builder");
  const [payload, setPayload] = useState(defaultPayloads.builder);
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
    setPayload(defaultPayloads[strategyType]);
  }, [strategyType]);

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

  async function handleCreate(formData: FormData) {
    try {
      setError(null);
      const parsedPayload = JSON.parse(payload) as Record<string, unknown>;
      const payloadFormat =
        strategyType === "builder" ? "builder_json" : "code_text";

      await createStrategy({
        name: String(formData.get("name")),
        description: String(formData.get("description") ?? ""),
        strategyType,
        initialPayload: {
          payloadFormat,
          payload: parsedPayload,
          changeSummary: String(formData.get("changeSummary") ?? ""),
        },
      });

      startTransition(() => router.refresh());
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "전략 생성에 실패했습니다.",
      );
    }
  }

  async function handleClone(strategyId: string) {
    await cloneStrategy(strategyId);
    startTransition(() => router.refresh());
  }

  async function handleArchive(strategyId: string) {
    await archiveStrategy(strategyId);
    startTransition(() => router.refresh());
  }

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
        id="strategies-summary"
        className="doc-panel"
      >
        <div className="page-intro-row">
          <div className="page-intro">
            <p className="page-eyebrow">Strategies</p>
            <h1 className="page-title">Strategy Registry</h1>
            <p className="page-description">
              전략 등록, 전역 리스크, 브로커 연결 상태를 한 화면에서 관리합니다.
            </p>
          </div>
          <div className="page-actions">
            <span className="status-chip status-chip-info">
              {strategies.length} strategies
            </span>
          </div>
        </div>
        <div className="page-actions">
          <Link
            href="/universes"
            className="button-secondary"
          >
            Universes
          </Link>
        </div>
      </section>

      <section
        id="strategies-risk"
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
          id="strategies-broker"
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
        id="strategies-create"
        className="doc-panel doc-panel-code"
      >
        <h2 className="section-title">
          Create Strategy
        </h2>
        <form
          className="mt-5 grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await handleCreate(new FormData(event.currentTarget));
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="name"
              required
              placeholder="전략 이름"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            <select
              value={strategyType}
              onChange={(event) =>
                setStrategyType(event.target.value as StrategyType)
              }
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="builder">builder</option>
              <option value="code">code</option>
            </select>
          </div>
          <input
            name="description"
            placeholder="설명"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
          <input
            name="changeSummary"
            placeholder="버전 메모"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
          <textarea
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            rows={12}
            className="rounded-3xl border border-slate-200 px-4 py-4 font-mono text-sm text-slate-800"
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div>
            <button
              type="submit"
              className="button-primary"
            >
              전략 생성
            </button>
          </div>
        </form>
      </section>

      <StrategyListView strategies={strategies} />

      {strategies.length > 0 ? (
        <section className="doc-panel">
          <h2 className="section-title">
            Quick Actions
          </h2>
          <div className="mt-4 grid gap-3">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {strategy.name}
                  </div>
                  <div className="text-sm text-slate-500">
                    v{strategy.latestVersionNumber ?? 0} /{" "}
                    {strategy.strategyType}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleClone(strategy.id)}
                    className="button-secondary"
                  >
                    Clone
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(strategy.id)}
                    className="button-danger"
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatConnectionStatus(status: "success" | "failed") {
  return status === "success" ? "성공" : "실패";
}
