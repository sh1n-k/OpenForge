export type ScreenMode = "docs" | "workbench";

export type PageSection = {
  id: string;
  label: string;
};

export type CommandEntry = {
  id: string;
  label: string;
  description: string;
  href: string;
  group: "Pages" | "Context" | "Sections";
  keywords?: string[];
};

export type RouteMeta = {
  href: string;
  label: string;
  description: string;
  mode: ScreenMode;
  sections: PageSection[];
  match: RegExp;
};

const routeMetaList: RouteMeta[] = [
  {
    href: "/",
    label: "Overview",
    description: "부트스트랩 상태와 시스템 규약",
    mode: "docs",
    match: /^\/$/,
    sections: [
      { id: "overview-summary", label: "요약" },
      { id: "overview-health", label: "상태" },
      { id: "overview-contract", label: "운영 규약" },
      { id: "overview-next", label: "다음 섹션" },
    ],
  },
  {
    href: "/strategies",
    label: "Strategies",
    description: "전략 레지스트리와 실행 관리",
    mode: "docs",
    match: /^\/strategies$/,
    sections: [
      { id: "strategies-summary", label: "요약" },
      { id: "strategies-risk", label: "전역 리스크" },
      { id: "strategies-broker", label: "브로커 연결" },
      { id: "strategies-registry", label: "전략 레지스트리" },
    ],
  },
  {
    href: "/strategies/[strategyId]",
    label: "Strategy Detail",
    description: "전략 실행, 리스크, 주문 현황",
    mode: "workbench",
    match: /^\/strategies\/[^/]+$/,
    sections: [
      { id: "strategy-overview", label: "개요" },
      { id: "strategy-execution", label: "자동 실행" },
      { id: "strategy-risk", label: "리스크" },
      { id: "strategy-versions", label: "버전과 유니버스" },
      { id: "strategy-orders", label: "주문" },
      { id: "strategy-activity", label: "실행 로그" },
    ],
  },
  {
    href: "/strategies/[strategyId]/edit",
    label: "Strategy Editor",
    description: "전략 편집과 검증",
    mode: "workbench",
    match: /^\/strategies\/[^/]+\/edit$/,
    sections: [
      { id: "editor-summary", label: "편집기 개요" },
      { id: "editor-builder", label: "전략 정의" },
      { id: "editor-note", label: "버전 메모" },
      { id: "editor-validation", label: "검증" },
    ],
  },
  {
    href: "/strategies/[strategyId]/backtest",
    label: "Backtest Runner",
    description: "백테스트 실행과 데이터 준비",
    mode: "workbench",
    match: /^\/strategies\/[^/]+\/backtest$/,
    sections: [
      { id: "backtest-summary", label: "개요" },
      { id: "backtest-config", label: "실행 설정" },
      { id: "backtest-datasets", label: "데이터 입력" },
      { id: "backtest-coverage", label: "커버리지" },
      { id: "backtest-runs", label: "실행 이력" },
    ],
  },
  {
    href: "/universes",
    label: "Universes",
    description: "유니버스 레지스트리와 종목 구성",
    mode: "docs",
    match: /^\/universes$/,
    sections: [
      { id: "universes-summary", label: "요약" },
      { id: "universes-create", label: "생성" },
      { id: "universes-registry", label: "레지스트리" },
    ],
  },
  {
    href: "/universes/[universeId]",
    label: "Universe Detail",
    description: "유니버스 상세와 심볼 구성",
    mode: "docs",
    match: /^\/universes\/[^/]+$/,
    sections: [
      { id: "universe-overview", label: "개요" },
      { id: "universe-basic-info", label: "기본 정보" },
      { id: "universe-symbols", label: "심볼 구성" },
    ],
  },
  {
    href: "/backtests/[runId]",
    label: "Backtest Result",
    description: "백테스트 결과와 차트",
    mode: "workbench",
    match: /^\/backtests\/[^/]+$/,
    sections: [
      { id: "run-summary", label: "요약" },
      { id: "run-charts", label: "차트" },
      { id: "run-config", label: "실행 설정" },
      { id: "run-trades", label: "거래 이력" },
    ],
  },
];

export function getPrimaryRoutes() {
  return routeMetaList.filter((route) =>
    ["/", "/strategies", "/universes"].includes(route.href),
  );
}

export function getRouteMeta(pathname: string): RouteMeta | undefined {
  return routeMetaList.find((route) => route.match.test(pathname));
}

export function getScreenMode(pathname: string): ScreenMode {
  return getRouteMeta(pathname)?.mode ?? "docs";
}

export function getPageSections(pathname: string): PageSection[] {
  return getRouteMeta(pathname)?.sections ?? [];
}

export function getCommandEntries(pathname: string): CommandEntry[] {
  const routeMeta = getRouteMeta(pathname);

  const pageCommands = getPrimaryRoutes().map((route) => ({
    id: `page:${route.href}`,
    label: route.label,
    description: route.description,
    href: route.href,
    group: "Pages" as const,
    keywords: [route.label, route.description],
  }));

  const contextCommands = getContextCommands(pathname);
  const sectionCommands = (routeMeta?.sections ?? []).map((section) => ({
    id: `section:${pathname}:${section.id}`,
    label: section.label,
    description: `${routeMeta?.label ?? "Current Page"} 섹션으로 이동`,
    href: `${pathname}#${section.id}`,
    group: "Sections" as const,
  }));

  return [...pageCommands, ...contextCommands, ...sectionCommands];
}

export function getContextCommands(pathname: string): CommandEntry[] {
  const strategyMatch = pathname.match(
    /^\/strategies\/([^/]+)(?:\/(edit|backtest))?$/,
  );

  if (!strategyMatch) {
    return [];
  }

  const strategyId = strategyMatch[1];

  return [
    {
      id: `context:strategy:${strategyId}:detail`,
      label: "Strategy Detail",
      description: "전략 상세 화면으로 이동",
      href: `/strategies/${strategyId}`,
      group: "Context",
      keywords: ["strategy", "detail", strategyId],
    },
    {
      id: `context:strategy:${strategyId}:edit`,
      label: "Strategy Editor",
      description: "전략 편집기 열기",
      href: `/strategies/${strategyId}/edit`,
      group: "Context",
      keywords: ["strategy", "editor", "edit", strategyId],
    },
    {
      id: `context:strategy:${strategyId}:backtest`,
      label: "Backtest Runner",
      description: "백테스트 실행 화면으로 이동",
      href: `/strategies/${strategyId}/backtest`,
      group: "Context",
      keywords: ["backtest", "runner", strategyId],
    },
  ];
}

export function isRouteActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
