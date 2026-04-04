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
        <div className="doc-mobile-overlay">
          <div
            id="mobile-doc-nav"
            className="doc-mobile-drawer"
          >
            <div className="doc-mobile-drawer-head">
              <p className="doc-nav-overline">Navigation</p>
              <button
                type="button"
                className="button-ghost"
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
      className="doc-sidebar"
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
    <div className="doc-sidebar-scroll">
      <div className="doc-sidebar-head">
        <Link
          href="/"
          className="doc-brand-link"
        >
          OpenForge
        </Link>
        <p className="doc-sidebar-copy">
          개인용 자동매매 운영 콘솔
        </p>
      </div>

      <label className="doc-search-shell">
        <span className="sr-only">탐색 검색</span>
        <input
          ref={inputRef}
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="섹션 또는 페이지 검색"
          className="doc-search-input"
        />
        <span className="doc-search-shortcut">⌘K</span>
      </label>

      {groupedRoutes.map(({ group, routes }) => {
        const filtered = filterRoutes(routes, normalizedSearch);
        if (normalizedSearch && filtered.length === 0) return null;
        return (
          <nav key={group} className="doc-nav-group">
            <p className="doc-nav-overline">{group}</p>
            <div className="doc-nav-list">
              {filtered.length === 0 ? (
                <p className="doc-empty-copy">일치하는 페이지가 없습니다.</p>
              ) : (
                filtered.map((item) => (
                  <div key={item.href} className="doc-nav-entry">
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
        <nav className="doc-nav-group">
          <p className="doc-nav-overline">Context</p>
          <div className="doc-nav-list">
            {sidebarContextCommands.map((cmd) => (
              <Link
                key={cmd.id}
                href={cmd.href}
                className={navLinkClassName(cmd.href === pathname)}
                onClick={onNavigate}
              >
                <span className="doc-nav-title">{cmd.label}</span>
                <span className="doc-nav-description">{cmd.description}</span>
              </Link>
            ))}
          </div>
        </nav>
      ) : null}

      <div className="doc-sidebar-footer">
        {settingsRoute ? (
          <Link
            href={settingsRoute.href}
            className={`doc-footer-link ${isRouteActive(pathname, settingsRoute.href) ? "doc-footer-link-active" : ""}`}
            onClick={onNavigate}
          >
            <Settings size={16} />
            <span>{settingsRoute.label}</span>
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
    <div className="doc-subnav-list">
      <Link
        href={BROKER_LEDGER_LINK.href}
        className={subnavLinkClassName(active)}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
      >
        <span className="doc-subnav-title">{BROKER_LEDGER_LINK.label}</span>
        <span className="doc-subnav-description">
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
      className={navLinkClassName(active)}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
    >
      <span className="doc-nav-link-row">
        {Icon ? <Icon size={16} className="doc-nav-icon" /> : null}
        <span className="doc-nav-title">{item.label}</span>
        {badge !== undefined && badge !== null ? (
          <span
            className={`nav-status-dot ${badge ? "nav-status-dot-ok" : "nav-status-dot-error"}`}
            aria-label={badge ? "연결됨" : "연결 안됨"}
          />
        ) : null}
      </span>
      <span className="doc-nav-description">{item.description}</span>
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
    <div className="doc-mobile-bar">
      <button
        type="button"
        className="button-secondary"
        onClick={onOpenNav}
        aria-expanded={navOpen}
        aria-controls="mobile-doc-nav"
      >
        메뉴
      </button>
      <Link
        href="/"
        className="doc-brand-link"
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
      className="button-ghost"
      onClick={onOpen}
    >
      검색
      <span className="doc-search-shortcut">⌘K</span>
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

function navLinkClassName(isActive: boolean) {
  return ["doc-nav-link", isActive ? "doc-nav-link-active" : ""]
    .filter(Boolean)
    .join(" ");
}

function subnavLinkClassName(isActive: boolean) {
  return ["doc-subnav-link", isActive ? "doc-subnav-link-active" : ""]
    .filter(Boolean)
    .join(" ");
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
      className="doc-footer-link"
      onClick={handleLogout}
    >
      <LogOut size={16} />
      <span>로그아웃</span>
    </button>
  );
}
