import { BrokerLedgerPageClient } from "@/components/broker/broker-ledger-page-client";
import {
  loadBrokerLedgerBalances,
  loadBrokerLedgerProfits,
  loadBrokerLedgerStatus,
  loadBrokerLedgerSyncRuns,
  loadBrokerLedgerTrades,
  type BrokerLedgerBalance,
  type BrokerLedgerProfit,
  type BrokerLedgerTrade,
} from "@/lib/api";

export default async function BrokerLedgerPage() {
  const [status, runs] = await Promise.all([
    loadBrokerLedgerStatus(),
    loadBrokerLedgerSyncRuns(20),
  ]);

  const defaultRunId = status.latestSuccessfulSyncRun?.id ?? null;

  const [trades, balances, profits]: [
    BrokerLedgerTrade[],
    BrokerLedgerBalance[],
    BrokerLedgerProfit[],
  ] = defaultRunId
    ? await Promise.all([
        loadBrokerLedgerTrades({ syncRunId: defaultRunId, limit: 200 }),
        loadBrokerLedgerBalances({ syncRunId: defaultRunId, limit: 200 }),
        loadBrokerLedgerProfits({ syncRunId: defaultRunId, limit: 200 }),
      ])
    : [[], [], []];

  return (
    <BrokerLedgerPageClient
      initialStatus={status}
      initialRuns={runs}
      initialTrades={trades}
      initialBalances={balances}
      initialProfits={profits}
    />
  );
}
