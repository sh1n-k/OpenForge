import { StrategiesPageClient } from "@/components/strategies-page-client";
import {
  loadStrategies,
  loadSystemRisk,
  loadSystemRiskEvents,
} from "@/lib/api";

export default async function StrategiesPage() {
  const [strategies, systemRisk, systemRiskEvents] = await Promise.all([
    loadStrategies(),
    loadSystemRisk(),
    loadSystemRiskEvents(),
  ]);

  return (
    <StrategiesPageClient
      strategies={strategies}
      systemRisk={systemRisk}
      systemRiskEvents={systemRiskEvents}
    />
  );
}
