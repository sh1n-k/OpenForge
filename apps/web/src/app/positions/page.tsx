import { PositionsPageClient } from "@/components/positions-page-client";
import { loadAllPositions, loadStrategies } from "@/lib/api";

export default async function PositionsPage() {
  const [positions, strategies] = await Promise.all([
    loadAllPositions(),
    loadStrategies(),
  ]);

  return <PositionsPageClient positions={positions} strategies={strategies} />;
}
