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
      />,
    );

    expect(screen.getByText("전역 킬 스위치")).toBeInTheDocument();
    expect(screen.queryByText("최근 전역 리스크 이벤트가 없습니다.")).not.toBeInTheDocument();
    expect(
      screen.getByText("risk_global_kill_switch_changed / global_kill_switch_enabled"),
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
