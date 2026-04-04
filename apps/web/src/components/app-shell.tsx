"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { PageToc } from "@/components/page-toc";
import { getPageSections } from "@/lib/route-meta";

export function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const sections = useMemo(() => getPageSections(pathname), [pathname]);
  const showToc = sections.length >= 3;

  // Login page renders without the navigation shell
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="app-shell app-shell-docs">
      <AppNav pathname={pathname} />
      <div className={`app-main ${showToc ? "app-main-with-toc" : ""}`}>
        {children}
        {showToc ? <PageToc key={pathname} sections={sections} /> : null}
      </div>
    </div>
  );
}
