# apps/web

## 배치 규칙
- 진입점은 `src/main.ts`, 앱 셸은 `src/App.svelte`, 라우트 파서는 `src/router.ts`다.
- 페이지는 `src/pages/<route>/<Page>.svelte`에 둔다. RouteView는 디스패처 역할만 한다.
- 페이지 한정 컴포넌트는 `src/pages/<route>/_components/`에 둔다.
- 도메인 무관 표현 컴포넌트는 `src/lib/components/`에 둔다 (`PageHeader`, `Metric`, `DataTable`, `StatusChip`, `Toolbar`, `IconButton`, `Drawer`, `Toast`, `ConfirmDialog`, `KillSwitchToggle`, `Tabs`, `EquityChart`, `ThemeToggle`, `EmptyState`).
- API 호출은 페이지에서 직접 하지 말고 `@/lib/api` 배럴을 사용한다.

## 스타일 규칙
- `data-theme="dark"` 속성으로 테마 전환. CSS 변수는 모두 `styles.css` :root 블록에서 정의/미러링.
- semantic 유틸 클래스를 우선 사용한다. 새 스타일은 먼저 `styles.css`에 의미 단위 클래스를 추가한 뒤 참조한다.
- 색상은 변수로만 사용한다. 하드코딩된 hex/rgba는 금지.

## 확인·에러·알림 UI
- 파괴적 작업은 `ConfirmDialog`로 감싼다 (`archive*`, killSwitch 활성화 등).
- 액션 결과 알림은 `lib/toast.ts`의 `toast.success/error/info`를 사용한다.
- 액션 래퍼는 `lib/util.ts:runAction`이지만, RouteView가 이미 페이지에 props로 내려주는 `runAction`을 우선 사용한다.

## 차트
- `EquityChart`는 uPlot 래퍼. 다크 토글 시 자동 재초기화 (`subscribeTheme`).
- 새 차트는 `lib/charts/uplot-theme.ts`의 토큰을 통해 색을 받는다.

## API 접근
- 외부 진입점은 `@/lib/api` 배럴 하나. 도메인별:
  - `lib/api/client.ts` — `apiFetch` 전송 레이어
  - `lib/api/{auth,strategy,backtest,universe,broker,system,dashboard}.ts` — 도메인 엔드포인트
  - `lib/api/types/{...}.ts` — 도메인 타입
- 응답 타입 변경 시 Kotlin API도 동시 수정. 루트 `CLAUDE.md` 참고.

## 조건부/미완 기능
- 플래그는 `src/lib/features.ts`. 조건부 UI는 플래그를 직접 참조.

## 라우트·사이드바
- 라우트 추가 시 `src/router.ts`와 `src/lib/route-meta.ts`를 함께 갱신한다.
- 사이드바 그룹은 `Trading | Strategy Lab | System Ops`. `route-meta.ts`의 `NAV_GROUP_ORDER` 기준.

## 검증
- `pnpm --filter web lint`, `pnpm --filter web test --run`, `pnpm --filter web build`.
- 타입만 빠르게: `pnpm --filter web typecheck`.
