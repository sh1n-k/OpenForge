import type { BrokerLedgerProfit } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { formatNullableNumber, marketLabel } from "./broker-ledger-shared";

type BrokerLedgerProfitsTableProps = {
  profits: BrokerLedgerProfit[];
};

export function BrokerLedgerProfitsTable({ profits }: BrokerLedgerProfitsTableProps) {
  return (
    <section id="broker-ledger-profits" className="grid gap-4">
      <div className="flex items-center gap-3">
        <h2 className="m-0 font-sans text-xl font-bold text-foreground">손익 스냅샷</h2>
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm font-mono text-xs font-semibold bg-border-soft text-foreground border border-border">{profits.length}건</span>
      </div>
      {profits.length === 0 ? (
        <div className="grid justify-items-center p-8 px-6 border border-dashed border-border rounded-xl text-center shadow-sm bg-surface">
          <p className="m-0 text-foreground font-semibold text-[1.0625rem]">조회된 손익 데이터가 없습니다</p>
        </div>
      ) : (
        <div className="p-6 md:p-8 border border-border-soft rounded-2xl bg-surface shadow-sm overflow-hidden">
          <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
            <table className="w-full text-left border-collapse text-[0.9375rem] whitespace-nowrap">
              <thead>
                <tr className="border-b-2 border-border/80">
                  <th className="py-3 px-2 font-semibold text-slate-800">시장</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-left">기준시각</th>
                  <th className="py-3 px-2 font-semibold text-slate-800">심볼</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-right">실현손익</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-right">손익률</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-right">매수금액</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-right">매도금액</th>
                  <th className="py-3 px-2 font-semibold text-slate-800 text-center">통화</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {profits.map((profit) => (
                  <tr key={profit.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2 text-slate-600">{marketLabel[profit.market]}</td>
                    <td className="py-3 px-2 text-slate-500 font-mono text-xs text-left">{formatDateTime(profit.capturedAt) ?? "—"}</td>
                    <td className="py-3 px-2 font-semibold text-foreground">
                      {profit.symbol ?? profit.symbolName ?? "합계"}
                    </td>
                    <td className={`py-3 px-2 font-mono text-right font-medium ${profit.realizedPnl > 0 ? 'text-rose-600' : profit.realizedPnl < 0 ? 'text-blue-600' : 'text-slate-600'}`}>{profit.realizedPnl.toLocaleString("ko-KR")}</td>
                    <td className={`py-3 px-2 font-mono text-right font-medium ${profit.profitRate && profit.profitRate > 0 ? 'text-rose-600' : profit.profitRate && profit.profitRate < 0 ? 'text-blue-600' : 'text-slate-600'}`}>{profit.profitRate === null ? "—" : `${profit.profitRate.toLocaleString("ko-KR")}%`}</td>
                    <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(profit.buyAmount)}</td>
                    <td className="py-3 px-2 text-slate-600 font-mono text-right">{formatNullableNumber(profit.sellAmount)}</td>
                    <td className="py-3 px-2 text-slate-600 font-mono text-center">{profit.currency ?? "—"}</td>
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
