/**
 * 조건부/미완 기능 플래그.
 *
 * 현재는 정적 상수. 환경변수/런타임 토글 도입 시 이 파일만 교체한다.
 * 기본값은 현재 동작을 유지하도록 설정되어 있다.
 */

// 전략 자동 실행 모드 select에 `live` 옵션을 노출할지.
// 현재 UI는 paper만 노출 중이며, 실전 실행 경로 검증이 끝나면 true로 전환.
export const LIVE_EXECUTION_ENABLED = false;

// 이전 스키마 초안(invalid_legacy_draft) 경고 블록 노출 여부.
// 마이그레이션 완료가 확인되면 false로 전환하고 관련 UI를 제거한다.
export const LEGACY_DRAFT_SUPPORT = true;

// 백테스트 직접 심볼 입력에서 해외 심볼을 허용할지.
// 현재는 서버에서 차단되며, UI도 국내만 안내한다.
export const OVERSEAS_DIRECT_BACKTEST = false;
