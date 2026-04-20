import type { BrokerLedgerTrade } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { formatNullableNumber, marketLabel } from "./broker-ledger-shared";

type BrokerLedgerTradesTableProps = {
  trades: BrokerLedgerTrade[];
};

export function BrokerLedgerTradesTable({ trades }: BrokerLedgerTradesTableProps) {
  return (
    <section id="broker-ledger-trades" className="grid gap-4">
      <div className="flex items-center gap-3">
        <h2 className="m-0 font-sans text-xl font-bold text-foreground">거래 원장</h2>
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm font-mono text-xs font-semibold bg-border-soft text-foreground border border-border">{trades.length}건</span>
      </div>
      {trades.length === 0 ? (
        <div className="grid justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center shadow-sm bg-surface">
          <p className="m-0 text-foreground font-semibold text-[1.0625rem]">조회된 거래 원장 데이터가 없습니다</p>
        </div>
      ) : (
        <div className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm overflow-hidden">
          <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
            <table className="w-full text-left border-collapse text-[0.9375rem] whitespace-nowrap">
              <thead>
                <tr className="border-b-2 border-border/80">
                  <th className="py-3 px-2 font-semibold text-slate-800">시장</th>
                  <th className="py-3 px-2 font-semibold text-slate-800">심볼</th>
                  <th className="py-3 px-2 font-semibold text-slate-800">방향</th>
                  <th className="py-3 px-2 font-semibold text-slate-800">상태</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-right">주문수량</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-right">체결수량</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-right">체결가</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-right">시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2 text-slate-600">{marketLabel[trade.market]}</td>
                    <td className="py-3 px-2 font-semibold text-foreground">
                      {trade.symbol ?? trade.symbolName ?? "—"}
                    </td>
                    <td className="py-3 px-2 text-slate-600">{trade.side ?? "—"}</td>
                    <td className="py-3 px-2 text-slate-600">{trade.orderStatus ?? "—"}</td>
                    <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(trade.quantity)}</td>
                    <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(trade.filledQuantity)}</td>
                    <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(trade.price)}</td>
                    <td className="py-3 px-2 text-slate-500 font-mono text-right text-xs">{formatDateTime(trade.capturedAt) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
