export type ScreenMode = "docs" | "workbench";

export type NavGroup = "Trading" | "Strategy Lab" | "System Ops";

export type NavIconKey =
  | "LayoutDashboard"
  | "Cpu"
  | "Globe"
  | "Landmark"
  | "ShoppingCart"
  | "PieChart"
  | "ScrollText"
  | "Settings";

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
  navGroup?: NavGroup;
  icon?: NavIconKey;
};

const routeMetaList: RouteMeta[] = [
  {
    href: "/",
    label: "대시보드",
    description: "운영 대시보드와 현황 요약",
    mode: "docs",
    match: /^\/$/,
    navGroup: "Trading",
    icon: "LayoutDashboard",
    sections: [
      { id: "dashboard-summary", label: "운영 요약" },
      { id: "dashboard-strategies", label: "전략 현황" },
      { id: "dashboard-fills", label: "최근 체결" },
      { id: "dashboard-positions", label: "현재 포지션" },
      { id: "dashboard-errors", label: "최근 오류" },
      { id: "dashboard-health", label: "시스템 상태" },
    ],
  },
  {
    href: "/strategies",
    label: "전략",
    description: "전략 레지스트리와 실행 관리",
    mode: "docs",
    match: /^\/strategies$/,
    navGroup: "Strategy Lab",
    icon: "Cpu",
    sections: [
      { id: "strategies-summary", label: "요약" },
      { id: "strategies-create", label: "생성" },
      { id: "strategies-registry", label: "전략 레지스트리" },
    ],
  },
  {
    href: "/strategies/[strategyId]",
    label: "전략 상세",
    description: "전략 실행, 리스크, 주문 현황",
    mode: "workbench",
    match: /^\/strategies\/[^/]+$/,
    sections: [
      { id: "overview", label: "개요" },
      { id: "versions", label: "버전" },
      { id: "orders", label: "시그널·주문" },
      { id: "positions", label: "포지션" },
      { id: "activity", label: "활동" },
    ],
  },
  {
    href: "/strategies/[strategyId]/edit",
    label: "전략 편집",
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
    label: "과거 데이터 점검",
    description: "보조 과거 데이터 점검과 데이터 준비",
    mode: "workbench",
    match: /^\/strategies\/[^/]+\/backtest$/,
    sections: [
      { id: "backtest-summary", label: "개요" },
      { id: "backtest-config", label: "점검 설정" },
      { id: "backtest-datasets", label: "데이터 입력" },
      { id: "backtest-coverage", label: "커버리지" },
      { id: "backtest-runs", label: "점검 이력" },
    ],
  },
  {
    href: "/universes",
    label: "종목 그룹",
    description: "종목 그룹 레지스트리와 종목 구성",
    mode: "docs",
    match: /^\/universes$/,
    navGroup: "Strategy Lab",
    icon: "Globe",
    sections: [
      { id: "universes-summary", label: "요약" },
      { id: "universes-create", label: "생성" },
      { id: "universes-registry", label: "레지스트리" },
    ],
  },
  {
    href: "/universes/[universeId]",
    label: "종목 그룹 상세",
    description: "종목 그룹 상세와 종목 구성",
    mode: "docs",
    match: /^\/universes\/[^/]+$/,
    sections: [
      { id: "universe-overview", label: "개요" },
      { id: "universe-basic-info", label: "기본 정보" },
      { id: "universe-symbols", label: "종목 구성" },
    ],
  },
  {
    href: "/backtests/[runId]",
    label: "과거 데이터 점검 결과",
    description: "과거 데이터 점검 결과와 차트",
    mode: "workbench",
    match: /^\/backtests\/[^/]+$/,
    sections: [
      { id: "run-summary", label: "요약" },
      { id: "run-charts", label: "차트" },
      { id: "run-config", label: "실행 설정" },
      { id: "run-trades", label: "거래 이력" },
    ],
  },
  {
    href: "/broker",
    label: "브로커",
    description: "한투 계좌 원장과 동기화 상태",
    mode: "docs",
    match: /^\/broker$/,
    navGroup: "System Ops",
    icon: "Landmark",
    sections: [
      { id: "broker-summary", label: "원장 요약" },
      { id: "broker-sync", label: "수동 동기화" },
      { id: "broker-sync-runs", label: "동기화 이력" },
    ],
  },
  {
    href: "/broker/ledger",
    label: "브로커 원장",
    description: "브로커 원장 상세 조회",
    mode: "docs",
    match: /^\/broker\/ledger$/,
    sections: [
      { id: "broker-ledger-summary", label: "조회 기준" },
      { id: "broker-ledger-trades", label: "거래 원장" },
      { id: "broker-ledger-balances", label: "잔고 스냅샷" },
      { id: "broker-ledger-profits", label: "손익 스냅샷" },
    ],
  },
  {
    href: "/orders",
    label: "주문",
    description: "전체 주문 및 체결 조회",
    mode: "docs",
    match: /^\/orders$/,
    navGroup: "Trading",
    icon: "ShoppingCart",
    sections: [
      { id: "orders-summary", label: "요약" },
      { id: "orders-requests", label: "주문 요청" },
      { id: "orders-fills", label: "체결 내역" },
    ],
  },
  {
    href: "/positions",
    label: "포지션",
    description: "전체 포지션 현황",
    mode: "docs",
    match: /^\/positions$/,
    navGroup: "Trading",
    icon: "PieChart",
    sections: [
      { id: "positions-summary", label: "포지션 요약" },
      { id: "positions-detail", label: "전략별 보유" },
    ],
  },
  {
    href: "/logs",
    label: "로그",
    description: "실행 로그와 오류 추적",
    mode: "docs",
    match: /^\/logs$/,
    navGroup: "System Ops",
    icon: "ScrollText",
    sections: [
      { id: "logs-summary", label: "요약" },
      { id: "logs-timeline", label: "이벤트 타임라인" },
    ],
  },
  {
    href: "/settings",
    label: "설정",
    description: "시스템 설정과 브로커 연결",
    mode: "docs",
    match: /^\/settings$/,
    navGroup: "System Ops",
    icon: "Settings",
    sections: [
      { id: "settings-summary", label: "요약" },
      { id: "settings-broker", label: "브로커 연결" },
      { id: "settings-risk", label: "전역 리스크" },
      { id: "settings-system", label: "시스템 상태" },
    ],
  },
];

const NAV_GROUP_ORDER: NavGroup[] = ["Trading", "Strategy Lab", "System Ops"];

export function getPrimaryRoutes() {
  return routeMetaList
    .filter((route) => route.navGroup !== undefined)
    .sort(
      (a, b) =>
        NAV_GROUP_ORDER.indexOf(a.navGroup!) - NAV_GROUP_ORDER.indexOf(b.navGroup!),
    );
}

export function getGroupedRoutes(): { group: NavGroup; routes: RouteMeta[] }[] {
  const primary = getPrimaryRoutes();
  return NAV_GROUP_ORDER.map((group) => ({
    group,
    routes: primary.filter((r) => r.navGroup === group),
  })).filter((g) => g.routes.length > 0);
}

export function getSettingsRoute(): RouteMeta | undefined {
  return routeMetaList.find((route) => route.href === "/settings");
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

  const settings = getSettingsRoute();
  const allNavRoutes = settings ? [...getPrimaryRoutes(), settings] : getPrimaryRoutes();
  const pageCommands = allNavRoutes.map((route) => ({
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
    description: `${routeMeta?.label ?? "현재 페이지"} 섹션으로 이동`,
    href: `${pathname}#${section.id}`,
    group: "Sections" as const,
  }));

  return [...pageCommands, ...contextCommands, ...sectionCommands];
}

export function getContextCommands(pathname: string): CommandEntry[] {
  if (pathname === "/broker" || pathname === "/broker/ledger") {
    return [
      {
        id: "context:broker:home",
        label: "브로커",
        description: "원장 요약 화면으로 이동",
        href: "/broker",
        group: "Context",
        keywords: ["broker", "ledger", "원장", "sync", "브로커"],
      },
      {
        id: "context:broker:ledger",
        label: "브로커 원장",
        description: "원장 상세 화면으로 이동",
        href: "/broker/ledger",
        group: "Context",
        keywords: ["broker", "ledger", "원장", "거래", "잔고", "손익", "브로커"],
      },
    ];
  }

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
      label: "전략 상세",
      description: "전략 상세 화면으로 이동",
      href: `/strategies/${strategyId}`,
      group: "Context",
      keywords: ["strategy", "detail", strategyId, "전략"],
    },
    {
      id: `context:strategy:${strategyId}:edit`,
      label: "전략 편집",
      description: "전략 편집기 열기",
      href: `/strategies/${strategyId}/edit`,
      group: "Context",
      keywords: ["strategy", "editor", "edit", strategyId, "전략", "편집"],
    },
    {
      id: `context:strategy:${strategyId}:backtest`,
      label: "과거 데이터 점검",
      description: "과거 데이터 점검 화면으로 이동",
      href: `/strategies/${strategyId}/backtest`,
      group: "Context",
      keywords: ["backtest", "historical", "check", strategyId, "백테스트", "과거 데이터 점검"],
    },
  ];
}

export function isRouteActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
