"use client";

export function CodeEditor({
  source,
  onChange,
}: {
  source: string;
  onChange: (source: string) => void;
}) {
  return (
    <section
      id="editor-builder"
      className="doc-panel doc-panel-code"
    >
      <h2 className="section-title">코드 원문</h2>
      <p className="section-copy">빌더 결과를 YAML로 직접 확인하거나 수정합니다.</p>
      <textarea
        value={source}
        onChange={(event) => onChange(event.target.value)}
        rows={28}
        className="mt-4 font-mono text-sm"
      />
    </section>
  );
}
