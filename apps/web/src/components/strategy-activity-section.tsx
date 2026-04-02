import type {
  StrategyExecutionRun,
  StrategySignalEvent,
} from "@/lib/api";
import { formatDateTime, shortId } from "@/lib/format";

type Props = {
  runs: StrategyExecutionRun[];
  signals: StrategySignalEvent[];
};

export function StrategyActivitySection({ runs, signals }: Props) {
  return (
    <section className="summary-grid summary-grid-columns-2">
      <section
        id="strategy-activity"
        className="doc-panel"
      >
        <div className="detail-card-header">
          <h2 className="detail-heading">최근 실행 로그</h2>
        </div>
        <div className="stack-list" style={{ marginTop: 16 }}>
          {runs.length === 0 ? (
            <p className="section-copy">
              아직 실행 로그가 없습니다.
            </p>
          ) : (
            runs.map((run) => (
              <article
                key={run.runId}
                className="detail-card"
              >
                <div className="flex-between">
                  <div>
                    <p className="detail-label">
                      {shortId(run.runId)}
                    </p>
                    <p className="detail-value">
                      {run.triggerType} / {run.scheduledDate} / v
                      {shortId(run.strategyVersionId)}
                    </p>
                  </div>
                  <span className="detail-badge">
                    {run.status}
                  </span>
                </div>
                <div className="stack-list" style={{ marginTop: 12 }}>
                  <div className="detail-row">
                    <span className="detail-label">종목 수</span>
                    <span className="detail-value">{run.symbolCount}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">시그널 수</span>
                    <span className="detail-value">{run.signalCount}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">시작</span>
                    <span className="detail-value">{formatDateTime(run.startedAt) ?? "대기 중"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">완료</span>
                    <span className="detail-value">{formatDateTime(run.completedAt) ?? "대기 중"}</span>
                  </div>
                </div>
                {run.errorMessage ? (
                  <div className="doc-panel doc-panel-error" style={{ marginTop: 12 }}>
                    <p className="inline-error">{run.errorMessage}</p>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="doc-panel">
        <div className="detail-card-header">
          <h2 className="detail-heading">최근 시그널 이력</h2>
        </div>
        <div className="stack-list" style={{ marginTop: 16 }}>
          {signals.length === 0 ? (
            <p className="section-copy">
              아직 시그널 이력이 없습니다.
            </p>
          ) : (
            signals.map((signal) => (
              <article
                key={signal.id}
                className="detail-card"
              >
                <div className="flex-between">
                  <div>
                    <p className="detail-label">
                      {signal.symbol} / {signal.signalType}
                    </p>
                    <p className="detail-value">
                      {signal.tradingDate} / v{shortId(signal.strategyVersionId)}
                    </p>
                  </div>
                  <span className="detail-timestamp">
                    {formatDateTime(signal.createdAt)}
                  </span>
                </div>
                <pre className="code-block" style={{ marginTop: 12, wordBreak: "break-all" }}>
                  {JSON.stringify(signal.payload)}
                </pre>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
