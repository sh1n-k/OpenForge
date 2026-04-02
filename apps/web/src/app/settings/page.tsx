import { SettingsPageClient } from "@/components/settings-page-client";
import {
  loadSystemBrokerStatus,
  loadSystemBrokerEvents,
  loadSystemRisk,
  loadSystemRiskEvents,
} from "@/lib/api";
import { loadHealthStatus } from "@/lib/health";

export default async function SettingsPage() {
  const [systemBroker, systemBrokerEvents, systemRisk, systemRiskEvents, health] =
    await Promise.all([
      loadSystemBrokerStatus(),
      loadSystemBrokerEvents(),
      loadSystemRisk(),
      loadSystemRiskEvents(),
      loadHealthStatus(),
    ]);

  return (
    <SettingsPageClient
      systemBroker={systemBroker}
      systemBrokerEvents={systemBrokerEvents}
      systemRisk={systemRisk}
      systemRiskEvents={systemRiskEvents}
      health={health}
    />
  );
}
