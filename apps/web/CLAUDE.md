# apps/web

## 배치 규칙
- 진입점은 `src/main.ts`, 앱 셸은 `src/App.svelte`, 라우트 파서는 `src/router.ts`다.
- 화면은 `src/pages/`에 둔다. 여러 화면이 공유하는 작은 UI는 `src/pages/shared/`에 둔다.
- API 호출은 페이지에서 직접 하지 말고 `src/lib/api`의 도메인별 클라이언트를 사용한다.

## 스타일 규칙
- semantic 유틸 클래스를 우선 사용한다. 사용 가능한 클래스는 `src/styles.css`를 참고.
- 새 스타일이 필요하면 먼저 `styles.css`에 의미 단위 클래스를 추가한 뒤 참조한다. 인라인 Tailwind만 쌓지 않는다.
- 기존 인라인 Tailwind는 같은 파일을 수정할 때 점진 치환.

## 확인·에러 UI
- 파괴적 작업은 페이지 내부의 명시적 확인 흐름을 사용한다. 새 공용 확인 헬퍼는 재사용 지점이 생길 때만 추가한다.
- 단일 메시지 에러는 `doc-panel doc-panel-error` 또는 화면의 기존 에러 영역을 사용한다.

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
- 라우트 추가 시 `src/router.ts`와 `src/lib/route-meta.ts`를 함께 갱신한다.

## 전역 상태
- 전역 상태는 아직 도입하지 않는다. 소비자가 늘 때만 Svelte store 승격을 검토한다.

## 검증
- `pnpm --filter web lint`, `pnpm --filter web test --run`, `pnpm --filter web build`.
- 타입만 빠르게: `pnpm --filter web typecheck`.
