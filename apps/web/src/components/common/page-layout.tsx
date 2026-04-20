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
      className={joinClasses(
        "grid gap-4",
        wide ? "" : "max-w-[768px]",
        // 기존 .page-intro 여백 보정 (page-shell-registry 대체용)
        "group-[.is-registry]:mb-4"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2.5">
          <p className="m-0 text-primary text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
            {eyebrow}
          </p>
          <h1 className="m-0 font-sans text-[clamp(2rem,4vw,2.5rem)] leading-[1.2] font-bold tracking-[0.01em] text-foreground">
            {title}
          </h1>
          <p className="m-0 max-w-[768px] text-muted text-base">
            {description}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
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
    <div className="grid gap-1.5 mb-3.5">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h2 className="m-0 font-sans text-[1.375rem] leading-[1.3] font-semibold text-foreground">
          {title}
        </h2>
        {count ? (
          <span
            className={joinClasses(
              "text-sm",
              countStrong ? "font-bold text-foreground" : "text-subtle"
            )}
          >
            {count}
          </span>
        ) : null}
      </div>
      {description ? (
        <p className="m-0 text-subtle text-sm">{description}</p>
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
          "grid gap-2.5 px-5 py-[18px]",
          "border border-border-soft rounded-xl shadow-sm",
          tinted ? "bg-gradient-to-b from-[#fcfcfd] to-[#f8fbff]" : "bg-surface"
        )}
      >
        <div>
          <h2 className="m-0 font-sans text-[1.375rem] leading-[1.3] font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-2 text-muted text-[0.9375rem]">{description}</p>
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
        "border border-border-soft rounded-xl shadow-sm bg-[#fcfcfd]",
        "px-5 py-[18px]",
        className
      )}
    >
      <SectionHeaderBlock title={title} description={description} />
      {children}
    </section>
  );
}
