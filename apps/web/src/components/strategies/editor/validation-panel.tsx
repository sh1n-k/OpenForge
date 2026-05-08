"use client";

import type { StrategyValidateResponse } from "@/lib/api";

export function ValidationPanel({
  validation,
  validationError,
  isValidating,
}: {
  validation: StrategyValidateResponse | null;
  validationError: string | null;
  isValidating: boolean;
}) {
  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
      <section
        id="editor-validation"
        className="doc-panel"
      >
        <h2 className="section-title">검증 결과</h2>
        <p className="section-copy">
          {isValidating
            ? "검증 중..."
            : validation
              ? validation.summary
              : validationError ?? "변경 후 자동 검증을 기다리는 중입니다."}
        </p>
        {validationError ? (
          <p className="mt-3 text-sm text-rose-600">{validationError}</p>
        ) : null}
        {validation?.errors.length ? (
          <div className="doc-panel doc-panel-error mt-4 p-4">
            <p className="text-sm font-semibold text-rose-700">오류</p>
            <ul className="mt-2 grid gap-2 text-sm text-rose-700">
              {validation.errors.map((error, index) => (
                <li key={`${error.category}-${index}`}>
                  [{error.category}] {error.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {validation?.warnings.length ? (
          <div className="doc-panel doc-panel-warn mt-4 p-4">
            <p className="text-sm font-semibold text-amber-700">경고</p>
            <ul className="mt-2 grid gap-2 text-sm text-amber-700">
              {validation.warnings.map((warning, index) => (
                <li key={`${warning.category}-${index}`}>
                  [{warning.category}] {warning.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="doc-panel doc-panel-code">
        <h2 className="section-title">YAML 미리보기</h2>
        <p className="section-copy">저장될 규약을 그대로 확인합니다.</p>
        <pre className="code-block mt-4">
          {validation?.yamlPreview || "# validation preview"}
        </pre>
      </section>
    </aside>
  );
}
