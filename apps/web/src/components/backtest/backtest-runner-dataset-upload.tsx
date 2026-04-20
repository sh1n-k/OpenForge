"use client";

type BacktestRunnerDatasetUploadProps = {
  isUploading: boolean;
  uploadMessage: string | null;
  uploadError: string | null;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function BacktestRunnerDatasetUpload({
  isUploading,
  uploadMessage,
  uploadError,
  onUpload,
}: BacktestRunnerDatasetUploadProps) {
  return (
    <section className="doc-panel">
      <div className="page-intro-row">
        <div className="page-intro">
          <h2 className="section-title">시세 데이터 업로드</h2>
          <p className="section-copy">
            <code className="inline-code">
              symbol,date,open,high,low,close,volume
            </code>{" "}
            형식의 수정주가 일봉 CSV만 지원합니다.
          </p>
        </div>
        <label className="button-secondary cursor-pointer">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onUpload}
          />
          {isUploading ? "업로드 중..." : "CSV 업로드"}
        </label>
      </div>
      {uploadMessage ? (
        <p className="mt-3 text-sm text-emerald-700">{uploadMessage}</p>
      ) : null}
      {uploadError ? (
        <p className="mt-3 text-sm text-rose-600">{uploadError}</p>
      ) : null}
    </section>
  );
}
