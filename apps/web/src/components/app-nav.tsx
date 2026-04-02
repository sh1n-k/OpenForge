"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import {
  getCommandEntries,
  getContextCommands,
  getPageSections,
  getPrimaryRoutes,
  isRouteActive,
  type CommandEntry,
  type PageSection,
  type RouteMeta,
} from "@/lib/route-meta";
import { logout } from "@/lib/api";

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
  const sections = useMemo(() => getPageSections(pathname), [pathname]);
  const primaryRoutes = useMemo(() => getPrimaryRoutes(), []);
  const contextCommands = useMemo(() => getContextCommands(pathname), [pathname]);
  const commands = useMemo(() => getCommandEntries(pathname), [pathname]);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredPrimaryRoutes = filterPrimaryItems(primaryRoutes, normalizedSearch);
  const filteredSections = filterSections(sections, normalizedSearch);

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
        primaryRoutes={filteredPrimaryRoutes}
        sections={filteredSections}
        contextCommands={contextCommands}
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
              primaryRoutes={filteredPrimaryRoutes}
              sections={filteredSections}
              contextCommands={contextCommands}
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

function DocsSidebar({
  pathname,
  search,
  onSearchChange,
  inputRef,
  primaryRoutes,
  sections,
  contextCommands,
}: {
  pathname: string;
  search: string;
  onSearchChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  primaryRoutes: RouteMeta[];
  sections: PageSection[];
  contextCommands: CommandEntry[];
}) {
  return (
    <aside
      className="doc-sidebar"
      aria-label="주요 탐색"
    >
      <SidebarContent
        pathname={pathname}
        search={search}
        onSearchChange={onSearchChange}
        inputRef={inputRef}
        primaryRoutes={primaryRoutes}
        sections={sections}
        contextCommands={contextCommands}
        onNavigate={() => {}}
      />
    </aside>
  );
}

function SidebarContent({
  pathname,
  search,
  onSearchChange,
  inputRef,
  primaryRoutes,
  sections,
  contextCommands,
  onNavigate,
}: {
  pathname: string;
  search: string;
  onSearchChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  primaryRoutes: RouteMeta[];
  sections: PageSection[];
  contextCommands: CommandEntry[];
  onNavigate: () => void;
}) {
  const showSections = getPageSections(pathname).length >= 3;

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

      <nav className="doc-nav-group">
        <p className="doc-nav-overline">Primary</p>
        <div className="doc-nav-list">
          {primaryRoutes.length === 0 ? (
            <p className="doc-empty-copy">일치하는 페이지가 없습니다.</p>
          ) : (
            primaryRoutes.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClassName(isRouteActive(pathname, item.href))}
                aria-current={isRouteActive(pathname, item.href) ? "page" : undefined}
                onClick={onNavigate}
              >
                <span className="doc-nav-title">{item.label}</span>
                <span className="doc-nav-description">{item.description}</span>
              </Link>
            ))
          )}
        </div>
      </nav>

      {contextCommands.length > 0 ? (
        <nav className="doc-nav-group">
          <p className="doc-nav-overline">Context</p>
          <div className="doc-nav-list">
            {contextCommands.map((cmd) => (
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

      {showSections ? (
        <nav className="doc-nav-group">
          <p className="doc-nav-overline">On This Page</p>
          <div className="doc-nav-list">
            {sections.length === 0 ? (
              <p className="doc-empty-copy">일치하는 섹션이 없습니다.</p>
            ) : (
              sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="doc-nav-link doc-nav-link-secondary"
                  onClick={onNavigate}
                >
                  <span className="doc-nav-title">{section.label}</span>
                </a>
              ))
            )}
          </div>
        </nav>
      ) : null}

      <div className="doc-sidebar-footer">
        <LogoutButton />
      </div>
    </div>
  );
}

function MobileNav({
  onOpenNav,
  onOpenPalette,
}: {
  onOpenNav: () => void;
  onOpenPalette: () => void;
}) {
  return (
    <div className="doc-mobile-bar">
      <button
        type="button"
        className="button-secondary"
        onClick={onOpenNav}
        aria-expanded={false}
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

function filterPrimaryItems(
  items: RouteMeta[],
  search: string,
): RouteMeta[] {
  if (!search) {
    return items;
  }

  return items.filter((item) =>
    `${item.label} ${item.description}`.toLowerCase().includes(search),
  );
}

function filterSections(
  sections: PageSection[],
  search: string,
): PageSection[] {
  if (!search) {
    return sections;
  }

  return sections.filter((section) =>
    section.label.toLowerCase().includes(search),
  );
}

function navLinkClassName(isActive: boolean) {
  return ["doc-nav-link", isActive ? "doc-nav-link-active" : ""]
    .filter(Boolean)
    .join(" ");
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
      className="button-ghost"
      onClick={handleLogout}
    >
      로그아웃
    </button>
  );
}
