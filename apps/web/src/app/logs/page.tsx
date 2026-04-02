import { LogsPageClient } from "@/components/logs-page-client";
import { loadSystemActivity } from "@/lib/api";

export default async function LogsPage() {
  const events = await loadSystemActivity();
  return <LogsPageClient events={events} />;
}
