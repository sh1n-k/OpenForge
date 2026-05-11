<script lang="ts">
  import { onMount } from "svelte";
  import LoginPage from "@/pages/LoginPage.svelte";
  import RouteView from "@/pages/RouteView.svelte";
  import { parseRoute } from "@/router";
  import {
    getGroupedRoutes,
    getPageSections,
    getRouteMeta,
    isRouteActive,
  } from "@/lib/route-meta";
  import Toast from "@/lib/components/Toast.svelte";
  import ThemeToggle from "@/lib/components/ThemeToggle.svelte";
  import Drawer from "@/lib/components/Drawer.svelte";
  import NavIcon from "@/lib/components/NavIcon.svelte";

  const navGroups = getGroupedRoutes();
  let pathname = window.location.pathname;
  let route = parseRoute(pathname);
  let routeMeta = getRouteMeta(pathname);
  let sections = getPageSections(pathname);
  let mobileNavOpen = false;

  $: route = parseRoute(pathname);
  $: routeMeta = getRouteMeta(pathname);
  $: sections = getPageSections(pathname);

  onMount(() => {
    const onPopState = () => {
      pathname = window.location.pathname;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  });

  function navigate(href: string) {
    const current = `${pathname}${window.location.search}${window.location.hash}`;
    if (href === current) return;
    const prevPath = pathname;
    const prevHash = window.location.hash;
    window.history.pushState({}, "", href);
    pathname = window.location.pathname;
    mobileNavOpen = false;
    const pathChanged = prevPath !== pathname;
    const hashChanged = prevHash !== window.location.hash;
    if (pathChanged) {
      window.scrollTo({ top: 0 });
    } else if (hashChanged) {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  function handleShellClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest("a");
    if (!anchor) return;
    const url = new URL(anchor.href);
    if (url.origin !== window.location.origin || anchor.target) return;
    event.preventDefault();
    navigate(`${url.pathname}${url.search}${url.hash}`);
  }
</script>

<svelte:head>
  <title>{routeMeta?.label ? `${routeMeta.label} | OpenForge` : "OpenForge"}</title>
</svelte:head>

{#if route.name === "login"}
  <LoginPage />
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="app-shell"
    class:app-shell-docs={routeMeta?.mode !== "workbench"}
    class:app-shell-workbench={routeMeta?.mode === "workbench"}
    on:click={handleShellClick}
  >
    <aside class="doc-sidebar">
      <div class="doc-sidebar-scroll">
        <div class="doc-sidebar-head">
          <a class="doc-brand-link" href="/">OpenForge</a>
          <p class="doc-sidebar-copy">자동매매 운영 콘솔</p>
        </div>
        {#each navGroups as group}
          <nav class="doc-nav-group" aria-label={group.group}>
            <p class="doc-nav-overline">{group.group}</p>
            <div class="doc-nav-list">
              {#each group.routes as item}
                <a
                  class:doc-nav-link-active={isRouteActive(pathname, item.href)}
                  class="doc-nav-link"
                  href={item.href}
                  aria-current={isRouteActive(pathname, item.href) ? "page" : undefined}
                >
                  {#if item.icon}
                    <NavIcon name={item.icon} />
                  {/if}
                  <span class="doc-nav-title">{item.label}</span>
                </a>
              {/each}
            </div>
          </nav>
        {/each}
        <div class="doc-sidebar-footer">
          <ThemeToggle />
        </div>
      </div>
    </aside>

    <div class="doc-mobile-bar">
      <a class="doc-brand-link" href="/">OpenForge</a>
      <div class="doc-mobile-bar-actions">
        <ThemeToggle />
        <button class="button-ghost" type="button" on:click={() => (mobileNavOpen = true)}>메뉴</button>
      </div>
    </div>

    <Drawer open={mobileNavOpen} title="OpenForge" on:close={() => (mobileNavOpen = false)}>
      <div class="doc-mobile-drawer-content">
        {#each navGroups as group}
          <nav class="doc-nav-group" aria-label={group.group}>
            <p class="doc-nav-overline">{group.group}</p>
            {#each group.routes as item}
              <a
                class:doc-nav-link-active={isRouteActive(pathname, item.href)}
                class="doc-nav-link"
                href={item.href}
                aria-current={isRouteActive(pathname, item.href) ? "page" : undefined}
              >
                {#if item.icon}
                  <NavIcon name={item.icon} />
                {/if}
                <span class="doc-nav-title">{item.label}</span>
              </a>
            {/each}
          </nav>
        {/each}
      </div>
    </Drawer>

    <main class="app-main" class:app-main-workbench={routeMeta?.mode === "workbench"}>
      <div class:app-main-with-toc={sections.length > 0}>
        <RouteView {route} />
        {#if sections.length > 0}
          <aside class="page-toc">
            <p class="page-toc-overline">On this page</p>
            <div class="page-toc-list">
              {#each sections as section}
                <a class="page-toc-link" href={`#${section.id}`}>{section.label}</a>
              {/each}
            </div>
          </aside>
        {/if}
      </div>
    </main>
  </div>
  <Toast />
{/if}
