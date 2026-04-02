"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { getScreenMode } from "@/lib/route-meta";

export function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // Login page renders without the navigation shell
  if (pathname === "/login") {
    return <>{children}</>;
  }

  const mode = getScreenMode(pathname);

  return (
    <div className={`app-shell app-shell-${mode}`}>
      <AppNav pathname={pathname} mode={mode} />
      <div className="app-main">{children}</div>
    </div>
  );
}
