import type { DashboardResponse, SystemRisk } from "@/lib/api";

const NOW = Date.now();
const minutesAgo = (mins: number) => new Date(NOW - mins * 60_000).toISOString();

export function demoDashboard(): DashboardResponse {
  return {
    runningStrategyCount: 4,
    todayOrderCount: 27,
    todayPnl: 184320,
    positionCount: 6,
    globalKillSwitchEnabled: false,
    health: { apiStatus: "UP", dbStatus: "UP" },
    strategySummaries: [
      {
        id: "demo-strat-001",
        name: "코스피 모멘텀",
        strategyType: "builder",
        status: "running",
        executionEnabled: true,
        lastRunStatus: "success",
        lastRunAt: minutesAgo(2),
        positionCount: 2,
        todayOrderCount: 11,
      },
      {
        id: "demo-strat-002",
        name: "변동성 돌파",
        strategyType: "builder",
        status: "running",
        executionEnabled: true,
        lastRunStatus: "success",
        lastRunAt: minutesAgo(6),
        positionCount: 1,
        todayOrderCount: 8,
      },
      {
        id: "demo-strat-003",
        name: "페어 트레이딩",
        strategyType: "code",
        status: "stopped",
        executionEnabled: false,
        lastRunStatus: "failed",
        lastRunAt: minutesAgo(18),
        positionCount: 0,
        todayOrderCount: 2,
      },
      {
        id: "demo-strat-004",
        name: "RSI 평균회귀",
        strategyType: "builder",
        status: "running",
        executionEnabled: true,
        lastRunStatus: "success",
        lastRunAt: minutesAgo(4),
        positionCount: 3,
        todayOrderCount: 6,
      },
    ],
    recentFills: [
      {
        id: "demo-fill-001",
        strategyId: "demo-strat-001",
        strategyName: "코스피 모멘텀",
        symbol: "005930",
        side: "buy",
        quantity: 100,
        price: 71200,
        realizedPnl: 0,
        filledAt: minutesAgo(3),
      },
      {
        id: "demo-fill-002",
        strategyId: "demo-strat-002",
        strategyName: "변동성 돌파",
        symbol: "035420",
        side: "sell",
        quantity: 30,
        price: 185500,
        realizedPnl: 24500,
        filledAt: minutesAgo(7),
      },
      {
        id: "demo-fill-003",
        strategyId: "demo-strat-004",
        strategyName: "RSI 평균회귀",
        symbol: "AAPL",
        side: "buy",
        quantity: 20,
        price: 218.45,
        realizedPnl: 0,
        filledAt: minutesAgo(12),
      },
      {
        id: "demo-fill-004",
        strategyId: "demo-strat-001",
        strategyName: "코스피 모멘텀",
        symbol: "000660",
        side: "buy",
        quantity: 50,
        price: 224000,
        realizedPnl: 0,
        filledAt: minutesAgo(28),
      },
    ],
    currentPositions: [
      {
        strategyId: "demo-strat-001",
        strategyName: "코스피 모멘텀",
        symbol: "005930",
        netQuantity: 200,
        avgEntryPrice: 70150,
        lastFillAt: minutesAgo(35),
      },
      {
        strategyId: "demo-strat-002",
        strategyName: "변동성 돌파",
        symbol: "035420",
        netQuantity: -30,
        avgEntryPrice: 186200,
        lastFillAt: minutesAgo(7),
      },
      {
        strategyId: "demo-strat-004",
        strategyName: "RSI 평균회귀",
        symbol: "AAPL",
        netQuantity: 20,
        avgEntryPrice: 218.45,
        lastFillAt: minutesAgo(12),
      },
    ],
    recentErrors: [
      {
        source: "executor",
        strategyId: "demo-strat-003",
        strategyName: "페어 트레이딩",
        message: "주문 거부: 잔고 부족",
        occurredAt: minutesAgo(18),
      },
      {
        source: "broker",
        strategyId: null,
        strategyName: null,
        message: "브로커 토큰 만료 임박 (잔여 6시간)",
        occurredAt: minutesAgo(45),
      },
    ],
  };
}

export function demoSystemRisk(): SystemRisk {
  return { killSwitchEnabled: false, updatedAt: minutesAgo(120) };
}
