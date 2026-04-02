import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsPageClient } from "@/components/settings-page-client";
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
  it("should_render_broker_section_heading_when_rendered", () => {
    render(
      <SettingsPageClient
        systemBroker={systemBrokerFixture}
        systemBrokerEvents={emptyBrokerEvents}
        systemRisk={systemRiskFixture}
        systemRiskEvents={emptyRiskEvents}
        health={healthFixture}
      />,
    );

    expect(screen.getByText("브로커 연결 설정")).toBeInTheDocument();
  });

  it("should_render_kill_switch_section_when_rendered", () => {
    render(
      <SettingsPageClient
        systemBroker={systemBrokerFixture}
        systemBrokerEvents={emptyBrokerEvents}
        systemRisk={systemRiskFixture}
        systemRiskEvents={emptyRiskEvents}
        health={healthFixture}
      />,
    );

    expect(screen.getByText("전역 킬 스위치")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "전역 설정 저장" })).toBeInTheDocument();
  });

  it("should_render_system_status_section_when_rendered", () => {
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
    expect(screen.getAllByText("UP").length).toBeGreaterThanOrEqual(2);
  });

  it("should_show_kill_switch_active_description_when_enabled", () => {
    render(
      <SettingsPageClient
        systemBroker={systemBrokerFixture}
        systemBrokerEvents={emptyBrokerEvents}
        systemRisk={{ ...systemRiskFixture, killSwitchEnabled: true }}
        systemRiskEvents={emptyRiskEvents}
        health={healthFixture}
      />,
    );

    expect(screen.getByText("모든 새 주문 요청을 차단합니다.")).toBeInTheDocument();
  });

  it("should_show_kill_switch_inactive_description_when_disabled", () => {
    render(
      <SettingsPageClient
        systemBroker={systemBrokerFixture}
        systemBrokerEvents={emptyBrokerEvents}
        systemRisk={{ ...systemRiskFixture, killSwitchEnabled: false }}
        systemRiskEvents={emptyRiskEvents}
        health={healthFixture}
      />,
    );

    expect(screen.getByText("전역 주문 차단이 비활성 상태입니다.")).toBeInTheDocument();
  });
});
