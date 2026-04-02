"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "@/components/app-nav";

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

  return (
    <div className="app-shell app-shell-docs">
      <AppNav pathname={pathname} />
      <div className="app-main">{children}</div>
    </div>
  );
}
