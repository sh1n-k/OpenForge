import type { CSSProperties, ReactNode } from "react";

type ErrorBannerProps = {
  children: ReactNode;
  style?: CSSProperties;
};

export function ErrorBanner({ children, style }: ErrorBannerProps) {
  return (
    <div className="doc-panel doc-panel-error" style={style}>
      <p className="section-copy">{children}</p>
    </div>
  );
}
