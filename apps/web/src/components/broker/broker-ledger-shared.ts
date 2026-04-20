import type { BrokerLedgerMarket } from "@/lib/api";

export const marketLabel: Record<BrokerLedgerMarket, string> = {
  domestic: "국내주식",
  overseas: "해외주식",
};

export function formatNullableNumber(value: number | null) {
  return value === null ? "—" : value.toLocaleString("ko-KR");
}
