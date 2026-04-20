import { UniversesPageClient } from "@/components/universes/universes-page-client";
import { loadUniverses } from "@/lib/api";

export default async function UniversesPage() {
  const universes = await loadUniverses();

  return <UniversesPageClient universes={universes} />;
}

