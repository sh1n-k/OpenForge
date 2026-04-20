import type { BrokerLedgerBalance } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { formatNullableNumber, marketLabel } from "./broker-ledger-shared";

type BrokerLedgerBalancesTableProps = {
  balances: BrokerLedgerBalance[];
};

export function BrokerLedgerBalancesTable({ balances }: BrokerLedgerBalancesTableProps) {
  return (
    <section id="broker-ledger-balances" className="grid gap-4">
      <div className="flex items-center gap-3">
        <h2 className="m-0 font-sans text-xl font-bold text-foreground">잔고 스냅샷</h2>
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm font-mono text-xs font-semibold bg-border-soft text-foreground border border-border">{balances.length}건</span>
      </div>
      {balances.length === 0 ? (
        <div className="grid justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center shadow-sm bg-surface">
          <p className="m-0 text-foreground font-semibold text-[1.0625rem]">조회된 잔고 데이터가 없습니다</p>
        </div>
      ) : (
        <div className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm overflow-hidden">
          <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
            <table className="w-full text-left border-collapse text-[0.9375rem] whitespace-nowrap">
              <thead>
                <tr className="border-b-2 border-border/80">
                  <th className="py-3 px-2 font-semibold text-slate-800">시장</th>
                  <th className="py-3 px-2 font-semibold text-slate-800">심볼</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-right">보유수량</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-right">현재가</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-right">평균단가</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-right">평가금액</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-right">평가손익</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-right">기준시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {balances.map((balance) => (
                  <tr key={balance.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2 text-slate-600">{marketLabel[balance.market]}</td>
                    <td className="py-3 px-2 font-semibold text-foreground">
                      {balance.symbol ?? balance.symbolName ?? "—"}
                    </td>
                    <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(balance.quantity)}</td>
                    <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(balance.currentPrice)}</td>
                    <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(balance.averagePrice)}</td>
                    <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(balance.valuationAmount)}</td>
                    <td className={`py-3 px-2 font-mono text-right font-medium ${balance.unrealizedPnl && balance.unrealizedPnl > 0 ? 'text-rose-600' : balance.unrealizedPnl && balance.unrealizedPnl < 0 ? 'text-blue-600' : 'text-slate-600'}`}>{formatNullableNumber(balance.unrealizedPnl)}</td>
                    <td className="py-3 px-2 text-slate-500 font-mono text-right text-xs">{formatDateTime(balance.capturedAt) ?? "—"}</td>
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
