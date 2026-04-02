import { UniverseDetailClient } from "@/components/universe-detail-client";
import { loadSymbolMasterStatus, loadUniverse } from "@/lib/api";

type UniverseDetailPageProps = {
  params: Promise<{
    universeId: string;
  }>;
};

export default async function UniverseDetailPage({
  params,
}: UniverseDetailPageProps) {
  const { universeId } = await params;
  const [universe, symbolMasterStatus] = await Promise.all([
    loadUniverse(universeId),
    loadSymbolMasterStatus(),
  ]);

  return (
    <UniverseDetailClient
      universe={universe}
      symbolMasterStatus={symbolMasterStatus}
    />
  );
}
