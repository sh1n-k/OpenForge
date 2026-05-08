export type SystemRisk = {
  killSwitchEnabled: boolean;
  updatedAt: string | null;
};

export type SystemRiskEvent = {
  id: number;
  eventType: string;
  reasonCode: string;
  message: string;
  payload: Record<string, unknown>;
  occurredAt: string;
};

export type ActivityEvent = {
  id: string;
  category: "execution" | "signal" | "order" | "risk" | "broker" | "system";
  strategyId: string | null;
  strategyName: string | null;
  summary: string;
  severity: "info" | "warn" | "error";
  occurredAt: string;
};
