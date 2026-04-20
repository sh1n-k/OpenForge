import { StrategiesPageClient } from "@/components/strategies/strategies-page-client";
import { loadStrategies } from "@/lib/api";

export default async function StrategiesPage() {
  const strategies = await loadStrategies();

  return <StrategiesPageClient strategies={strategies} />;
}
