import { StrategiesPageClient } from "@/components/strategies-page-client";
import {
  loadStrategies,
  loadSystemBrokerEvents,
  loadSystemBrokerStatus,
  loadSystemRisk,
  loadSystemRiskEvents,
} from "@/lib/api";

export default async function StrategiesPage() {
  const [strategies, systemRisk, systemRiskEvents, systemBroker, systemBrokerEvents] = await Promise.all([
    loadStrategies(),
    loadSystemRisk(),
    loadSystemRiskEvents(),
    loadSystemBrokerStatus(),
    loadSystemBrokerEvents(),
  ]);

  return (
    <StrategiesPageClient
      strategies={strategies}
      systemRisk={systemRisk}
      systemRiskEvents={systemRiskEvents}
      systemBroker={systemBroker}
      systemBrokerEvents={systemBrokerEvents}
    />
  );
}
