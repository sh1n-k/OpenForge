import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import type {
  BrokerConnectionEvent,
  SystemBrokerStatus,
  SystemRisk,
  SystemRiskEvent,
} from "@/lib/api";
import type { HealthSnapshot } from "@/lib/health";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const brokerConnectionBase = {
  brokerType: "kis",
  enabled: false,
  isConfigured: false,
  maskedAppKey: null,
  maskedAccountNumber: null,
  maskedProductCode: null,
  lastConnectionTestAt: null,
  lastConnectionTestStatus: null,
  lastConnectionTestMessage: null,
};

const systemBrokerFixture: SystemBrokerStatus = {
  currentSystemMode: "paper",
  paper: { ...brokerConnectionBase, targetMode: "paper" },
  live: { ...brokerConnectionBase, targetMode: "live" },
  hasPaperConfig: false,
  hasLiveConfig: false,
  isCurrentModeConfigured: false,
};

const systemRiskFixture: SystemRisk = {
  killSwitchEnabled: false,
  updatedAt: "2026-04-01T08:00:00+09:00",
};

const healthFixture: HealthSnapshot = {
  status: "UP",
  appName: "OpenForge API",
  version: "0.0.1-SNAPSHOT",
  timestamp: "2026-04-01T09:00:00+09:00",
  database: { status: "UP", product: "PostgreSQL" },
  environment: "local",
  mode: "paper",
};

const emptyBrokerEvents: BrokerConnectionEvent[] = [];
const emptyRiskEvents: SystemRiskEvent[] = [];

describe("SettingsPageClient", () => {
  it("renders broker connection section", () => {
    render(
      <SettingsPageClient
        systemBroker={systemBrokerFixture}
        systemBrokerEvents={emptyBrokerEvents}
        systemRisk={systemRiskFixture}
        systemRiskEvents={emptyRiskEvents}
        health={healthFixture}
      />,
    );

    expect(screen.getAllByText("브로커 연결").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("모의투자").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("실전투자").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/현재 시스템은 모의투자 기준으로 동작합니다/),
    ).toBeInTheDocument();
  });

  it("keeps summary cards anchored to the actual system mode", () => {
    render(
      <SettingsPageClient
        systemBroker={{
          ...systemBrokerFixture,
          currentSystemMode: "live",
          paper: {
            ...systemBrokerFixture.paper,
            isConfigured: false,
            lastConnectionTestStatus: null,
          },
          live: {
            ...systemBrokerFixture.live,
            isConfigured: true,
            lastConnectionTestStatus: "success",
          },
        }}
        systemBrokerEvents={emptyBrokerEvents}
        systemRisk={systemRiskFixture}
        systemRiskEvents={emptyRiskEvents}
        health={healthFixture}
      />,
    );

    const currentModeCard = screen.getByText("현재 모드").closest("article");
    const brokerConnectionCard = screen.getAllByText("브로커 연결")[0].closest("article");

    expect(currentModeCard).not.toBeNull();
    expect(brokerConnectionCard).not.toBeNull();

    const currentMode = within(currentModeCard as HTMLElement);
    const brokerConnection = within(brokerConnectionCard as HTMLElement);

    expect(currentMode.getByText("실전투자")).toBeInTheDocument();
    expect(brokerConnection.getByText("연결 준비")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "모의투자" }));

    expect(currentMode.getByText("실전투자")).toBeInTheDocument();
    expect(brokerConnection.getByText("연결 준비")).toBeInTheDocument();
  });

  it("renders kill switch section with inactive state", () => {
    render(
      <SettingsPageClient
        systemBroker={systemBrokerFixture}
        systemBrokerEvents={emptyBrokerEvents}
        systemRisk={systemRiskFixture}
        systemRiskEvents={emptyRiskEvents}
        health={healthFixture}
      />,
    );

    expect(screen.getByText("전역 리스크")).toBeInTheDocument();
    expect(screen.getAllByText("정상 운영 중").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "신규 주문 차단" })).toBeInTheDocument();
  });

  it("renders kill switch active state when enabled", () => {
    render(
      <SettingsPageClient
        systemBroker={systemBrokerFixture}
        systemBrokerEvents={emptyBrokerEvents}
        systemRisk={{ ...systemRiskFixture, killSwitchEnabled: true }}
        systemRiskEvents={emptyRiskEvents}
        health={healthFixture}
      />,
    );

    expect(screen.getAllByText("신규 주문 차단 중").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "차단 해제" })).toBeInTheDocument();
  });

  it("renders system status with health info", () => {
    render(
      <SettingsPageClient
        systemBroker={systemBrokerFixture}
        systemBrokerEvents={emptyBrokerEvents}
        systemRisk={systemRiskFixture}
        systemRiskEvents={emptyRiskEvents}
        health={healthFixture}
      />,
    );

    expect(screen.getByText("시스템 상태")).toBeInTheDocument();
    expect(screen.getAllByText("정상 운영 중").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("0.0.1-SNAPSHOT")).toBeInTheDocument();
  });

  it("shows broker status fields", () => {
    render(
      <SettingsPageClient
        systemBroker={systemBrokerFixture}
        systemBrokerEvents={emptyBrokerEvents}
        systemRisk={systemRiskFixture}
        systemRiskEvents={emptyRiskEvents}
        health={healthFixture}
      />,
    );

    expect(screen.getAllByText("미설정").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "설정 저장" })).toBeInTheDocument();
  });
});
