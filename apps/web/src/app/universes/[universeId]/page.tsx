import { UniverseDetailClient } from "@/components/universe-detail-client";
import { loadUniverse } from "@/lib/api";

type UniverseDetailPageProps = {
  params: Promise<{
    universeId: string;
  }>;
};

export default async function UniverseDetailPage({
  params,
}: UniverseDetailPageProps) {
  const { universeId } = await params;
  const universe = await loadUniverse(universeId);

  return <UniverseDetailClient universe={universe} />;
}

