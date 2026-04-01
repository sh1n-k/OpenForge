import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrategiesPageClient } from "@/components/strategies-page-client";
import * as apiModule from "@/lib/api";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh,
  }),
}));

describe("StrategiesPageClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    refresh.mockReset();
  });

  it("renders global risk controls and saves the kill switch", async () => {
    const updateKillSwitch = vi
      .spyOn(apiModule, "updateSystemRiskKillSwitch")
      .mockResolvedValue(systemRiskFixture);

    render(
      <StrategiesPageClient
        strategies={[]}
        systemRisk={systemRiskFixture}
        systemRiskEvents={systemRiskEventsFixture}
        systemBroker={systemBrokerFixture}
        systemBrokerEvents={systemBrokerEventsFixture}
      />,
    );

    expect(screen.getByText("전역 킬 스위치")).toBeInTheDocument();
    expect(
      screen.getByText(
        "risk_global_kill_switch_changed / global_kill_switch_enabled",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "킬 스위치" }));
    fireEvent.click(screen.getByRole("button", { name: "전역 설정 저장" }));

    await waitFor(() => {
      expect(updateKillSwitch).toHaveBeenCalledWith({ enabled: false });
    });
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("renders broker controls and calls save plus connection test APIs", async () => {
    const updateBroker = vi
      .spyOn(apiModule, "updateBrokerConnectionConfig")
      .mockResolvedValue(systemBrokerFixture.paper);
    const testBroker = vi
      .spyOn(apiModule, "testBrokerConnection")
      .mockResolvedValue(systemBrokerFixture.paper);

    render(
      <StrategiesPageClient
        strategies={[]}
        systemRisk={systemRiskFixture}
        systemRiskEvents={systemRiskEventsFixture}
        systemBroker={systemBrokerFixture}
        systemBrokerEvents={systemBrokerEventsFixture}
      />,
    );

    expect(screen.getByText("브로커 연결 설정")).toBeInTheDocument();
    expect(screen.getByText(/현재 시스템 모드/)).toBeInTheDocument();
    expect(screen.getByText(/pk12\*+789/)).toBeInTheDocument();
    expect(screen.queryByText("plain-secret-key")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "live" }));

    fireEvent.change(screen.getByLabelText("앱키"), {
      target: { value: "live-app-key" },
    });
    fireEvent.change(screen.getByLabelText("앱시크릿"), {
      target: { value: "live-secret" },
    });
    fireEvent.change(screen.getByLabelText("계좌번호(앞 8자리)"), {
      target: { value: "87654321" },
    });
    fireEvent.change(screen.getByLabelText("상품코드"), {
      target: { value: "01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "브로커 설정 저장" }));

    await waitFor(() => {
      expect(updateBroker).toHaveBeenCalledWith({
        targetMode: "live",
        appKey: "live-app-key",
        appSecret: "live-secret",
        accountNumber: "87654321",
        productCode: "01",
        enabled: false,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "paper" }));
    fireEvent.click(screen.getByRole("button", { name: "연결 테스트" }));

    await waitFor(() => {
      expect(testBroker).toHaveBeenCalledWith({ targetMode: "paper" });
    });
  });
});

const systemRiskFixture: apiModule.SystemRisk = {
  killSwitchEnabled: true,
  updatedAt: "2026-04-01T09:00:00+09:00",
};

const systemRiskEventsFixture: apiModule.SystemRiskEvent[] = [
  {
    id: 1,
    eventType: "risk_global_kill_switch_changed",
    reasonCode: "global_kill_switch_enabled",
    message: "전역 킬 스위치 활성화",
    payload: {},
    occurredAt: "2026-04-01T09:10:00+09:00",
  },
];

const systemBrokerFixture: apiModule.SystemBrokerStatus = {
  currentSystemMode: "paper",
  paper: {
    brokerType: "kis",
    targetMode: "paper",
    enabled: true,
    isConfigured: true,
    maskedAppKey: "pk12******789",
    maskedAccountNumber: "12****78",
    maskedProductCode: "01",
    lastConnectionTestAt: "2026-04-01T09:30:00+09:00",
    lastConnectionTestStatus: "success",
    lastConnectionTestMessage: "OAuth 토큰 발급 및 계좌 조회 성공",
  },
  live: {
    brokerType: "kis",
    targetMode: "live",
    enabled: false,
    isConfigured: false,
    maskedAppKey: null,
    maskedAccountNumber: null,
    maskedProductCode: null,
    lastConnectionTestAt: null,
    lastConnectionTestStatus: null,
    lastConnectionTestMessage: null,
  },
  hasPaperConfig: true,
  hasLiveConfig: false,
  isCurrentModeConfigured: true,
};

const systemBrokerEventsFixture: apiModule.BrokerConnectionEvent[] = [
  {
    id: "broker-event-1",
    targetMode: "paper",
    eventType: "config_saved",
    message: "paper KIS 연결 설정 저장",
    payload: {},
    occurredAt: "2026-04-01T09:40:00+09:00",
  },
];
