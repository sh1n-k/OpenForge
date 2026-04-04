"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cpu,
  Globe,
  Landmark,
  LayoutDashboard,
  LogOut,
  PieChart,
  ScrollText,
  Settings,
  ShoppingCart,
  Menu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CommandPalette } from "@/components/command-palette";
import {
  getCommandEntries,
  getContextCommands,
  getGroupedRoutes,
  getSettingsRoute,
  isRouteActive,
  type CommandEntry,
  type NavIconKey,
  type RouteMeta,
} from "@/lib/route-meta";
import { logout, loadSystemBrokerStatus } from "@/lib/api";

const ICON_MAP: Record<NavIconKey, LucideIcon> = {
  LayoutDashboard,
  Cpu,
  Globe,
  Landmark,
  ShoppingCart,
  PieChart,
  ScrollText,
  Settings,
};

export function AppNav({
  pathname,
}: {
  pathname: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteSession, setPaletteSession] = useState(0);
  const groupedRoutes = useMemo(() => getGroupedRoutes(), []);
  const settingsRoute = useMemo(() => getSettingsRoute(), []);
  const contextCommands = useMemo(() => getContextCommands(pathname), [pathname]);
  const commands = useMemo(() => getCommandEntries(pathname), [pathname]);
  const [brokerOk, setBrokerOk] = useState<boolean | null>(null);

  useEffect(() => {
    loadSystemBrokerStatus({ suppressAuthRedirect: true })
      .then((status) => {
        const conn =
          status.currentSystemMode === "paper" ? status.paper : status.live;
        setBrokerOk(
          status.isCurrentModeConfigured &&
            conn.lastConnectionTestStatus === "success",
        );
      })
      .catch(() => setBrokerOk(null));
  }, []);

  function openPalette() {
    setPaletteSession((current) => current + 1);
    setPaletteOpen(true);
  }

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const hasShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!hasShortcut) {
        return;
      }

      event.preventDefault();
      openPalette();
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function handleSelectCommand(command: CommandEntry) {
    setPaletteOpen(false);
    setNavOpen(false);
    router.push(command.href);
  }

  return (
    <>
      <MobileNav
        navOpen={navOpen}
        onOpenNav={() => setNavOpen(true)}
        onOpenPalette={() => {
          openPalette();
          inputRef.current?.focus();
        }}
      />
      <DocsSidebar
        pathname={pathname}
        search={search}
        onSearchChange={setSearch}
        inputRef={inputRef}
        groupedRoutes={groupedRoutes}
        settingsRoute={settingsRoute}
        contextCommands={contextCommands}
        brokerOk={brokerOk}
      />
      {navOpen ? (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity">
          <div
            id="mobile-doc-nav"
            className="fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-surface border-r border-border shadow-2xl flex flex-col translate-x-0 transition-transform duration-300 ease-in-out"
          >
            <div className="flex items-center justify-between p-4 px-6 border-b border-border/50">
              <p className="m-0 text-subtle text-[0.6875rem] font-semibold tracking-wider uppercase">Navigation</p>
              <button
                type="button"
                className="p-2 -mr-2 text-muted hover:text-foreground hover:bg-slate-100 rounded-lg transition-colors focus:ring-2 focus:ring-primary focus:outline-none"
                onClick={() => setNavOpen(false)}
              >
                닫기
              </button>
            </div>
            <SidebarContent
              pathname={pathname}
              search={search}
              onSearchChange={setSearch}
              inputRef={inputRef}
              groupedRoutes={groupedRoutes}
              settingsRoute={settingsRoute}
              contextCommands={contextCommands}
              brokerOk={brokerOk}
              onNavigate={() => setNavOpen(false)}
            />
          </div>
        </div>
      ) : null}
      <CommandPalette
        key={`docs-palette-${paletteSession}`}
        commands={commands}
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={handleSelectCommand}
      />
    </>
  );
}

type GroupedRoutes = { group: string; routes: RouteMeta[] }[];

type SidebarProps = {
  pathname: string;
  search: string;
  onSearchChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  groupedRoutes: GroupedRoutes;
  settingsRoute: RouteMeta | undefined;
  contextCommands: CommandEntry[];
  brokerOk: boolean | null;
  onNavigate?: () => void;
};

const BROKER_LEDGER_LINK = {
  href: "/broker/ledger",
  label: "Broker Ledger",
  description: "브로커 원장 상세 조회",
};

function DocsSidebar(props: Omit<SidebarProps, "onNavigate">) {
  return (
    <aside
      className="hidden lg:flex fixed inset-y-0 left-0 z-20 w-[var(--sidebar-width)] flex-col bg-surface border-r border-border"
      aria-label="주요 탐색"
    >
      <SidebarContent {...props} onNavigate={() => {}} />
    </aside>
  );
}

function SidebarContent({
  pathname,
  search,
  onSearchChange,
  inputRef,
  groupedRoutes,
  settingsRoute,
  contextCommands,
  brokerOk,
  onNavigate = () => {},
}: SidebarProps) {
  const normalizedSearch = search.trim().toLowerCase();
  const showBrokerSubnav = isBrokerContextPath(pathname);
  const sidebarContextCommands = showBrokerSubnav
    ? contextCommands.filter((cmd) => !isBrokerContextHref(cmd.href))
    : contextCommands;

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-border-soft scrollbar-track-transparent">
      <div className="px-2 mb-6">
        <Link
          href="/"
          className="font-sans text-[1.375rem] font-black tracking-tight text-foreground hover:text-primary transition-colors inline-block"
        >
          OpenForge
        </Link>
        <p className="m-0 text-muted font-medium text-sm mt-1 -tracking-wide">
          개인용 자동매매 운영 콘솔
        </p>
      </div>

      <label className="relative flex items-center mb-6 px-2 text-foreground focus-within:text-primary">
        <span className="sr-only">탐색 검색</span>
        <input
          ref={inputRef}
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="검색"
          className="w-full h-10 pl-4 pr-12 bg-surface text-[0.9375rem] transition-all border border-border hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary rounded-xl shadow-sm placeholder-slate-400"
        />
        <span className="absolute right-4 text-xs font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 pointer-events-none">⌘K</span>
      </label>

      {groupedRoutes.map(({ group, routes }) => {
        const filtered = filterRoutes(routes, normalizedSearch);
        if (normalizedSearch && filtered.length === 0) return null;
        return (
          <nav key={group} className="mb-6 px-2">
            <p className="m-0 mb-3 text-subtle text-[0.6875rem] font-bold tracking-wider uppercase pl-1">{group}</p>
            <div className="grid gap-1">
              {filtered.length === 0 ? (
                <p className="m-0 text-muted text-sm italic pl-1">일치하는 페이지가 없습니다.</p>
              ) : (
                filtered.map((item) => (
                  <div key={item.href} className="grid">
                    <NavItem
                      item={item}
                      pathname={pathname}
                      onNavigate={onNavigate}
                      badge={item.href === "/broker" ? brokerOk : undefined}
                    />
                    {showBrokerSubnav && item.href === "/broker" ? (
                      <BrokerSubnav
                        pathname={pathname}
                        onNavigate={onNavigate}
                      />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </nav>
        );
      })}

      {sidebarContextCommands.length > 0 ? (
        <nav className="mb-6 px-2">
          <p className="m-0 mb-3 text-subtle text-[0.6875rem] font-bold tracking-wider uppercase pl-1">Context</p>
          <div className="grid gap-1">
            {sidebarContextCommands.map((cmd) => (
              <Link
                key={cmd.id}
                href={cmd.href}
                className={`group block p-3 rounded-xl border border-transparent transition-all overflow-hidden ${cmd.href === pathname ? "bg-primary-soft border-blue-200/50" : "hover:bg-slate-50 hover:border-border-soft"}`}
                onClick={onNavigate}
              >
                <span className={`block font-semibold text-[0.9375rem] truncate transition-colors ${cmd.href === pathname ? "text-primary" : "text-slate-700 group-hover:text-foreground"}`}>{cmd.label}</span>
                <span className={`block text-[0.8125rem] truncate mt-0.5 transition-colors ${cmd.href === pathname ? "text-blue-600/80" : "text-muted"}`}>{cmd.description}</span>
              </Link>
            ))}
          </div>
        </nav>
      ) : null}

      <div className="mt-auto pt-4 border-t border-border/50 px-2 grid gap-1">
        {settingsRoute ? (
          <Link
            href={settingsRoute.href}
            className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${isRouteActive(pathname, settingsRoute.href) ? "border-blue-200/50 bg-primary-soft text-primary font-semibold" : "border-transparent text-muted hover:bg-slate-50 hover:text-foreground hover:border-border-soft font-medium"}`}
            onClick={onNavigate}
          >
            <Settings size={18} />
            <span className="text-[0.9375rem]">{settingsRoute.label}</span>
          </Link>
        ) : null}
        <LogoutButton />
      </div>
    </div>
  );
}

function BrokerSubnav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  const active = pathname === BROKER_LEDGER_LINK.href;

  return (
    <div className="mt-1 ml-4 pl-3 border-l-2 border-border/60 grid gap-1 relative before:absolute before:-top-3 before:-left-[2px] before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-border/60 before:to-transparent">
      <Link
        href={BROKER_LEDGER_LINK.href}
        className={`group block p-2.5 rounded-xl border transition-all overflow-hidden relative ${active ? "bg-primary-soft border-blue-200/50" : "border-transparent hover:bg-slate-50 hover:border-border-soft"}`}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
      >
        <span className={`block font-semibold text-[0.875rem] truncate transition-colors ${active ? "text-primary" : "text-slate-700 group-hover:text-foreground"}`}>{BROKER_LEDGER_LINK.label}</span>
        <span className={`block text-[0.75rem] truncate mt-0.5 transition-colors ${active ? "text-blue-600/80" : "text-muted"}`}>
          {BROKER_LEDGER_LINK.description}
        </span>
      </Link>
    </div>
  );
}

function NavItem({
  item,
  pathname,
  onNavigate,
  badge,
}: {
  item: RouteMeta;
  pathname: string;
  onNavigate: () => void;
  badge?: boolean | null;
}) {
  const Icon = item.icon ? ICON_MAP[item.icon] : null;
  const active = isRouteActive(pathname, item.href);
  const current = pathname === item.href;

  return (
    <Link
      href={item.href}
      className={`group block p-3 rounded-xl border transition-all overflow-hidden relative ${active ? "bg-primary-soft border-blue-200/50" : "border-transparent hover:bg-slate-50 hover:border-border-soft"}`}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
    >
      <span className="flex items-center gap-2.5">
        {Icon ? <Icon size={18} className={`flex-shrink-0 transition-colors ${active ? "text-primary" : "text-slate-400 group-hover:text-slate-500"}`} /> : null}
        <span className={`font-semibold text-[0.9375rem] truncate transition-colors flex-1 ${active ? "text-primary" : "text-slate-700 group-hover:text-foreground"}`}>{item.label}</span>
        {badge !== undefined && badge !== null ? (
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${badge ? "bg-success shadow-[0_0_0_2px_rgba(22,163,74,0.1)]" : "bg-warning shadow-[0_0_0_2px_rgba(202,138,4,0.1)]"}`}
            aria-label={badge ? "연결됨" : "연결 안됨"}
          />
        ) : null}
      </span>
      <span className={`block text-[0.8125rem] truncate mt-1 transition-colors pl-7 ${active ? "text-blue-600/80" : "text-muted"}`}>{item.description}</span>
    </Link>
  );
}

function MobileNav({
  navOpen,
  onOpenNav,
  onOpenPalette,
}: {
  navOpen: boolean;
  onOpenNav: () => void;
  onOpenPalette: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 lg:hidden flex items-center justify-between h-14 px-4 bg-surface/95 backdrop-blur border-b border-border shadow-sm">
      <button
        type="button"
        className="p-2 -ml-2 text-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
        onClick={onOpenNav}
        aria-expanded={navOpen}
        aria-controls="mobile-doc-nav"
      >
        <Menu size={20} />
      </button>
      <Link
        href="/"
        className="font-sans text-[1.125rem] font-black tracking-tight text-foreground"
      >
        OpenForge
      </Link>
      <CommandPaletteTrigger onOpen={onOpenPalette} />
    </div>
  );
}

function CommandPaletteTrigger({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="p-1 px-2 -mr-2 text-muted hover:text-foreground hover:bg-slate-50 transition-colors flex items-center gap-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      onClick={onOpen}
    >
      <span className="text-sm font-medium">검색</span>
      <span className="text-[0.625rem] font-semibold text-slate-400 bg-slate-100 px-1 rounded border border-slate-200 hidden sm:inline-block pointer-events-none">⌘K</span>
    </button>
  );
}

function filterRoutes(
  routes: RouteMeta[],
  search: string,
): RouteMeta[] {
  if (!search) {
    return routes;
  }

  return routes.filter((item) =>
    `${item.label} ${item.description}`.toLowerCase().includes(search),
  );
}

function isBrokerContextPath(pathname: string) {
  return isBrokerContextHref(pathname);
}

function isBrokerContextHref(href: string) {
  return href === "/broker" || href === "/broker/ledger";
}

function LogoutButton() {
  async function handleLogout() {
    try {
      await logout();
    } catch {
      // proceed to login even if the API call fails
    }
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 p-2.5 rounded-xl border border-transparent text-muted hover:bg-slate-50 hover:text-foreground hover:border-border-soft transition-all font-medium text-left focus:outline-none focus:ring-2 focus:ring-primary"
      onClick={handleLogout}
    >
      <LogOut size={18} />
      <span className="text-[0.9375rem]">로그아웃</span>
    </button>
  );
}
