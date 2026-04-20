import { BrokerPageClient } from "@/components/broker/broker-page-client";
import { loadBrokerLedgerStatus, loadBrokerLedgerSyncRuns } from "@/lib/api";

export default async function BrokerPage() {
  const [status, runs] = await Promise.all([
    loadBrokerLedgerStatus(),
    loadBrokerLedgerSyncRuns(20),
  ]);

  return <BrokerPageClient initialStatus={status} initialRuns={runs} />;
}
