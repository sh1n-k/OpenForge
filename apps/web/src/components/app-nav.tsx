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
  getRouteMeta,
  getScreenMode,
  isRouteActive,
  type CommandEntry,
  type PageSection,
  type RouteMeta,
  type ScreenMode,
} from "@/lib/route-meta";

export function AppNav({
  pathname,
  mode,
}: {
  pathname: string;
  mode: ScreenMode;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteSession, setPaletteSession] = useState(0);
  const sections = useMemo(() => getPageSections(pathname), [pathname]);
  const routeMeta = useMemo(() => getRouteMeta(pathname), [pathname]);
  const primaryRoutes = useMemo(() => getPrimaryRoutes(), []);
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

  if (mode === "workbench") {
    return (
      <>
        <WorkbenchChrome
          pathname={pathname}
          routeMeta={routeMeta}
          primaryRoutes={primaryRoutes}
          isNavOpen={navOpen}
          onOpenNav={() => setNavOpen(true)}
          onCloseNav={() => setNavOpen(false)}
          onOpenPalette={openPalette}
        />
        <CommandPalette
          key={`workbench-palette-${paletteSession}`}
          commands={commands}
          isOpen={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onSelect={handleSelectCommand}
        />
      </>
    );
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
}: {
  pathname: string;
  search: string;
  onSearchChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  primaryRoutes: RouteMeta[];
  sections: PageSection[];
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
  onNavigate,
}: {
  pathname: string;
  search: string;
  onSearchChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  primaryRoutes: RouteMeta[];
  sections: PageSection[];
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
          자동매매 운영 콘솔을 문서처럼 탐색할 수 있도록 정리한 정보 구조입니다.
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
    </div>
  );
}

function WorkbenchChrome({
  pathname,
  routeMeta,
  primaryRoutes,
  isNavOpen,
  onOpenNav,
  onCloseNav,
  onOpenPalette,
}: {
  pathname: string;
  routeMeta?: RouteMeta;
  primaryRoutes: RouteMeta[];
  isNavOpen: boolean;
  onOpenNav: () => void;
  onCloseNav: () => void;
  onOpenPalette: () => void;
}) {
  const sections = getPageSections(pathname);
  const contextRoutes = getContextCommands(pathname);

  return (
    <>
      <header className="workbench-chrome">
        <div className="workbench-chrome-row">
          <div className="page-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onOpenNav}
              aria-expanded={isNavOpen}
              aria-controls="workbench-nav"
            >
              탐색
            </button>
            <Link
              href="/"
              className="doc-brand-link"
            >
              OpenForge
            </Link>
          </div>

          <div className="page-actions">
            <CommandPaletteTrigger onOpen={onOpenPalette} />
          </div>
        </div>

        <div className="workbench-chrome-row">
          <div className="workbench-heading">
            <p className="page-eyebrow">Workbench</p>
            <div className="workbench-title-row">
              <h1 className="workbench-title">{routeMeta?.label ?? "Workbench"}</h1>
              <span className="status-chip status-chip-info">
                {getScreenMode(pathname)}
              </span>
            </div>
            <p className="section-copy">
              {routeMeta?.description ?? "작업 중심 화면"}
            </p>
          </div>

          <nav className="workbench-quick-links" aria-label="핵심 이동">
            {primaryRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={navChipClassName(isRouteActive(pathname, route.href))}
              >
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {isNavOpen ? (
        <div className="workbench-drawer-overlay">
          <aside
            id="workbench-nav"
            className="workbench-drawer"
          >
            <div className="doc-mobile-drawer-head">
              <p className="doc-nav-overline">Workbench Navigation</p>
              <button
                type="button"
                className="button-ghost"
                onClick={onCloseNav}
              >
                닫기
              </button>
            </div>

            <div className="doc-sidebar-scroll">
              <nav className="doc-nav-group">
                <p className="doc-nav-overline">Primary</p>
                <div className="doc-nav-list">
                  {primaryRoutes.map((route) => (
                    <Link
                      key={route.href}
                      href={route.href}
                      className={navLinkClassName(isRouteActive(pathname, route.href))}
                      onClick={onCloseNav}
                    >
                      <span className="doc-nav-title">{route.label}</span>
                      <span className="doc-nav-description">{route.description}</span>
                    </Link>
                  ))}
                </div>
              </nav>

              {contextRoutes.length > 0 ? (
                <nav className="doc-nav-group">
                  <p className="doc-nav-overline">Context</p>
                  <div className="doc-nav-list">
                    {contextRoutes.map((route) => (
                      <Link
                        key={route.id}
                        href={route.href}
                        className={navLinkClassName(route.href === pathname)}
                        onClick={onCloseNav}
                      >
                        <span className="doc-nav-title">{route.label}</span>
                        <span className="doc-nav-description">{route.description}</span>
                      </Link>
                    ))}
                  </div>
                </nav>
              ) : null}

              {sections.length > 0 ? (
                <nav className="doc-nav-group">
                  <p className="doc-nav-overline">On This Page</p>
                  <div className="doc-nav-list">
                    {sections.map((section) => (
                      <a
                        key={section.id}
                        href={`${pathname}#${section.id}`}
                        className="doc-nav-link doc-nav-link-secondary"
                        onClick={onCloseNav}
                      >
                        <span className="doc-nav-title">{section.label}</span>
                      </a>
                    ))}
                  </div>
                </nav>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
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

function navChipClassName(isActive: boolean) {
  return ["workbench-chip", isActive ? "workbench-chip-active" : ""]
    .filter(Boolean)
    .join(" ");
}
