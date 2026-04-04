import { forwardRef, type ReactNode } from "react";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type PageIntroSectionProps = {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  wide?: boolean;
};

export function PageIntroSection({
  id,
  eyebrow,
  title,
  description,
  actions,
  wide = true,
}: PageIntroSectionProps) {
  return (
    <section
      id={id}
      className={joinClasses("page-intro", wide && "page-intro-wide")}
    >
      <div className="page-intro-row">
        <div className="page-intro-stack">
          <p className="page-eyebrow">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-description">{description}</p>
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
    </section>
  );
}

type SectionHeaderBlockProps = {
  title: string;
  description?: string;
  count?: ReactNode;
  countStrong?: boolean;
};

export function SectionHeaderBlock({
  title,
  description,
  count,
  countStrong = false,
}: SectionHeaderBlockProps) {
  return (
    <div className="section-header">
      <div className="section-header-row">
        <h2 className="section-title">{title}</h2>
        {count ? (
          <span
            className={joinClasses(
              "section-count",
              countStrong && "section-count-strong",
            )}
          >
            {count}
          </span>
        ) : null}
      </div>
      {description ? (
        <p className="text-subtle section-header-copy">{description}</p>
      ) : null}
    </div>
  );
}

type RegistryCreatePanelProps = {
  id?: string;
  title: string;
  description: string;
  tinted?: boolean;
  children: ReactNode;
};

export const RegistryCreatePanel = forwardRef<HTMLElement, RegistryCreatePanelProps>(
  function RegistryCreatePanel(
    {
      id,
      title,
      description,
      tinted = false,
      children,
    }: RegistryCreatePanelProps,
    ref,
  ) {
    return (
      <section
        ref={ref}
        id={id}
        className={joinClasses(
          "doc-panel",
          "registry-create-panel",
          tinted && "registry-create-panel-tinted",
        )}
      >
        <div className="registry-create-copy">
          <h2 className="section-title">{title}</h2>
          <p className="section-copy">{description}</p>
        </div>
        {children}
      </section>
    );
  },
);

type OperationsControlPanelProps = {
  id?: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
};

export function OperationsControlPanel({
  id,
  title,
  description,
  children,
  className,
}: OperationsControlPanelProps) {
  return (
    <section
      id={id}
      className={joinClasses(
        "doc-panel",
        "doc-panel-soft",
        "filter-panel",
        "filter-panel-compact",
        "filter-panel-constrained-2",
        "operations-filter-panel",
        className,
      )}
    >
      <SectionHeaderBlock title={title} description={description} />
      {children}
    </section>
  );
}
