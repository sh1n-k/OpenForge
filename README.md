# OpenForge

OpenForge는 국내 시장 우선의 1인용 자동매매 운영 앱을 목표로 하는 모노레포다. 현재는 1단계 부트스트랩만 포함하며 `Next.js` 웹, `Spring Boot 4 + Kotlin` API, `PostgreSQL` 기반 로컬 실행 환경을 제공한다.

## 구성

- `apps/web`: 운영 콘솔 셸과 API 헬스 상태 화면
- `apps/api`: 헬스체크, 공통 설정, Flyway 마이그레이션
- `infra`: 로컬 PostgreSQL용 Docker Compose
- `docs`: 로컬 개발, 시스템 구조, 원격 접속 초안

## 빠른 시작

1. `cp .env.example .env`
2. 필요하면 `.env`의 `API_PORT`, `WEB_PORT`를 수정
3. `make dev-db`
4. `pnpm install`
5. API만 실행: `pnpm dev:api`
6. Web만 실행: `pnpm dev:web`
7. 둘 다 함께 실행: `pnpm dev:all`

포트 기본값은 API `8080`, Web `3000`이며, `API_BASE_URL`과 `WEB_ORIGIN`은 필요 시 개별 override 용도로 유지한다.

검증은 `make check`, 실행 중 서비스 점검은 `make smoke`를 사용한다.

## Windows PowerShell

Windows에서는 `Makefile`과 `zsh` 대신 `scripts/openforge.ps1`를 사용한다.

1. `Copy-Item .env.example .env`
2. `pnpm install`
3. `powershell -ExecutionPolicy Bypass -File .\scripts\openforge.ps1 dev-db`
4. API만 실행: `powershell -ExecutionPolicy Bypass -File .\scripts\openforge.ps1 dev-api`
5. Web만 실행: `powershell -ExecutionPolicy Bypass -File .\scripts\openforge.ps1 dev-web`
6. 둘 다 실행: `powershell -ExecutionPolicy Bypass -File .\scripts\openforge.ps1 dev-all`

`package.json`에도 Windows용 별칭이 있다.

- DB: `pnpm ps:dev-db`
- API: `pnpm ps:dev:api`
- Web: `pnpm ps:dev:web`
- 전체 체크: `pnpm ps:check`
