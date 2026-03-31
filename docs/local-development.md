# 로컬 개발 가이드

## 전제

- Node.js 22 LTS 권장
- `pnpm` 10 이상
- Java 21 툴체인
- Docker Desktop

## 초기 설정

1. 루트에서 `.env.example`을 `.env`로 복사한다.
2. 필요하면 `.env`의 `API_PORT`, `WEB_PORT`를 수정한다.
3. 워크스페이스 의존성을 설치한다: `pnpm install`
4. DB를 띄운다: `make dev-db`

## 실행

- API: `make dev-api`
- Web: `make dev-web`
- 기본 포트는 API `8080`, Web `3000`이다.
- `API_BASE_URL`, `WEB_ORIGIN`은 포트 기반 기본값을 덮어쓸 때만 사용한다.

## 검증

- 전체 체크: `make check`
- 스모크: API와 Web이 떠 있는 상태에서 `make smoke`
