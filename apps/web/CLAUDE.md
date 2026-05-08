# apps/web

## 배치 규칙
- 페이지 진입: `src/app/**/page.tsx`는 서버 컴포넌트에서 병렬 fetch 후 `*-page-client.tsx` 1:1 렌더. 구조 유지.
- 컴포넌트는 도메인 폴더로 분리한다.
  - `components/shell/` — AppShell, AppNav, CommandPalette, PageToc 등 **앱 외곽** 전용
  - `components/common/` — 여러 도메인이 쓰는 공용 원시(`confirmAction`, `ErrorBanner`, `page-layout` 프리미티브)
  - `components/auth/`, `components/dashboard/`, `components/strategies/`, `components/backtest/`, `components/universes/`, `components/orders/`, `components/positions/`, `components/logs/`, `components/broker/`, `components/settings/` — 도메인별
- 페이지 내부 섹션은 같은 도메인 폴더에 파일 분해. 파일이 많아지면 서브폴더 사용(예: `components/strategies/editor/*`). 한 파일만 쓰는 하위 컴포넌트를 `common`으로 올리지 말 것.

## 스타일 규칙
- semantic 유틸 클래스를 우선 사용한다. 사용 가능한 클래스는 `src/app/globals.css`를 참고.
- 새 스타일이 필요하면 먼저 `globals.css`에 의미 단위 클래스를 추가한 뒤 참조한다. 인라인 Tailwind만 쌓지 않는다.
- 기존 인라인 Tailwind는 같은 파일을 수정할 때 점진 치환.

## 확인·에러 UI
- 파괴적 작업 확인은 `confirmAction(message)` (`components/common/confirm-action.ts`). `window.confirm` 직접 호출 금지.
- 단일 메시지 에러 배너는 `<ErrorBanner>` (`components/common/error-banner.tsx`). 리스트형 에러는 `doc-panel doc-panel-error`를 직접 사용해도 된다.

## 조건부/미완 기능
- 플래그는 `src/lib/features.ts`. 조건부 UI는 플래그를 직접 참조.
- 새 조건부 기능은 플래그를 먼저 추가하고 참조.

## API 접근
- 외부 진입점은 `@/lib/api` 배럴 하나. 내부는 도메인별:
  - `lib/api/client.ts` — `apiFetch` 전송 레이어
  - `lib/api/{auth,strategy,backtest,universe,broker,system,dashboard}.ts` — 도메인 엔드포인트
  - `lib/api/types/{common,strategy,backtest,universe,broker,system,dashboard}.ts` — 도메인 타입
- 새 엔드포인트/타입은 해당 도메인 파일에만 추가. 배럴이 자동 노출하므로 호출부는 수정 불필요.
- 응답 타입 변경 시 Kotlin API도 동시 수정. 루트 `CLAUDE.md` 참고.

## 라우트·사이드바
- 라우트 메타, 사이드바 그룹, 커맨드 팔레트, 페이지 TOC는 `src/lib/route-meta.ts` 단일 소스. 라우트 추가 시 이 파일만 갱신.

## 전역 상태
- 브로커 연결 상태는 `AppNav`가 서버에서 직접 fetch하고, 설정 화면에서 `dispatchSystemBrokerStatusUpdated()` (`src/lib/system-status-events.ts`) 이벤트로 갱신을 알린다. 소비자 1개라 Provider 미도입. 소비자가 늘면 Provider로 승격 검토.

## 검증
- `pnpm --filter web lint`, `pnpm --filter web test --run`, `pnpm --filter web build`.
- 타입만 빠르게: `pnpm --filter web exec tsc --noEmit`.
