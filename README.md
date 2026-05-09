# OpenForge

OpenForge는 국내 시장 우선의 1인용 자동매매 운영 앱을 목표로 하는 모노레포다. `Svelte + Vite` 웹, `Spring Boot 4 + Kotlin` API, `PostgreSQL` 기반 로컬 실행 환경을 제공한다.

## 구성

- `apps/web`: Svelte/Vite 운영 콘솔
- `apps/api`: 헬스체크, 공통 설정, Flyway 마이그레이션
- `infra`: 로컬 PostgreSQL용 Docker Compose
- `docs`: 로컬 개발, 시스템 구조, 원격 접속 초안

## 빠른 시작

1. `.env.example`을 `.env`로 복사
2. 필요하면 `.env`의 `API_PORT`, `WEB_PORT`를 수정
3. `pnpm install --frozen-lockfile`
4. `pnpm dev:db`
5. API만 실행: `pnpm dev:api`
6. Web만 실행: `pnpm dev:web`
7. 둘 다 함께 실행: `pnpm dev:all`

DB 컨테이너를 중지/제거하되 데이터 볼륨을 보존하려면 `pnpm dev:db:down`을 사용한다. 로컬 DB 데이터를 초기화해야 할 때만 `pnpm dev:db:reset`을 사용한다.

포트 기본값은 API `8080`, Web `3000`이며, `API_BASE_URL`과 `WEB_ORIGIN`은 필요 시 개별 override 용도로 유지한다.

검증은 `pnpm check`, 실행 중 서비스 점검은 `pnpm smoke`를 사용한다. 배포용 Jar는 `pnpm jar`로 생성하며, 이 과정에서 `apps/web`의 Vite 빌드 산출물이 Jar 정적 리소스로 포함된다.

## 공통 명령

- DB 시작: `pnpm dev:db`
- DB 종료: `pnpm dev:db:down`
- DB 데이터 초기화: `pnpm dev:db:reset`
- API 시작: `pnpm dev:api`
- Web 시작: `pnpm dev:web`
- API/Web 동시 시작: `pnpm dev:all`
- 전체 체크: `pnpm check`
- 실행 중 서비스 스모크: `pnpm smoke`
- 배포 Jar 빌드: `pnpm jar`
- 배포 Jar 스모크: `pnpm jar:smoke`

Windows에서도 같은 `pnpm` 명령을 사용한다. 내부적으로는 `scripts/openforge.ps1`가 호출된다.

## 배포 점검

1. `.env` 또는 운영 환경변수에서 `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `OPENFORGE_AUTH_PASSWORD`, `OPENFORGE_JWT_SECRET`를 확인한다.
2. `pnpm check`로 API 테스트와 Web lint/typecheck/test/build를 실행한다.
3. `pnpm jar`로 배포 Jar를 생성한다.
4. 가능하면 `pnpm jar:smoke`로 Jar 실행, 헬스체크, 주요 SPA 라우트, Vite asset 로딩을 점검한다.
5. 운영 배포 후 `/api/v1/health`, `/`, 주요 딥링크 새로고침, `/assets/index-*.js` 응답을 확인한다.

Vite가 생성한 `/assets/**` 정적 파일은 해시 파일명을 전제로 장기 캐시된다. `index.html`은 캐시 정책을 별도로 길게 두지 않아 새 배포의 asset 참조가 바로 반영되도록 유지한다.
