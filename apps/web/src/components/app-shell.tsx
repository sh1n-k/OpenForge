"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { PageToc } from "@/components/page-toc";
import { getPageSections, getScreenMode } from "@/lib/route-meta";

export function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const screenMode = useMemo(() => getScreenMode(pathname), [pathname]);
  const sections = useMemo(() => getPageSections(pathname), [pathname]);
  const showToc = screenMode === "docs" && sections.length >= 3;

  // Login page renders without the navigation shell
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className={`app-shell app-shell-${screenMode}`}>
      <AppNav pathname={pathname} />
      <div
        className={[
          "app-main",
          screenMode === "workbench" ? "app-main-workbench" : "",
          showToc ? "app-main-with-toc" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
        {showToc ? <PageToc sections={sections} /> : null}
      </div>
    </div>
  );
}
