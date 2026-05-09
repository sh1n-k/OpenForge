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
4. DB를 띄운다: `pnpm dev:db`

`pnpm dev:db:down`은 DB 컨테이너와 Compose 네트워크만 제거하고 `postgres-data` 볼륨은 보존한다. 로컬 DB 데이터를 초기화해야 할 때만 `pnpm dev:db:reset`을 사용한다.

Docker Compose 컨테이너 이름은 고정하지 않고 프로젝트명 기준으로 자동 생성한다. 여러 OpenForge checkout을 동시에 실행하려면 각 checkout의 `.env`에서 `COMPOSE_PROJECT_NAME`과 `DB_PORT`를 서로 다르게 지정한다.

## 실행

- API: `pnpm dev:api`
- Web: `pnpm dev:web` 또는 `pnpm web:dev`
- 기본 포트는 API `8080`, Web `3000`이다.
- 로컬 Web은 Vite dev server로 실행되며 `/api` 요청을 API 서버로 프록시한다.
- `API_BASE_URL`, `VITE_API_BASE_URL`, `WEB_ORIGIN`은 포트 기반 기본값을 덮어쓸 때만 사용한다.
- Windows Docker Desktop 환경에서는 Postgres 포트가 IPv6 loopback(`::1`)으로 전달될 수 있으므로 `.env`의 `DB_HOST` 기본값은 `localhost`다. PowerShell 스크립트는 Java 실행 시 `-Djava.net.preferIPv6Addresses=true`를 자동 적용한다.

## 공통 실행 명령

- `.env` 생성: `cp .env.example .env`
- DB 시작: `pnpm dev:db`
- DB 중지/컨테이너 제거: `pnpm dev:db:down`
- DB 데이터 초기화: `pnpm dev:db:reset`
- API 시작: `pnpm dev:api`
- Web 시작: `pnpm dev:web`
- API/Web 동시 시작: `pnpm dev:all`

## 검증

- 전체 체크: `pnpm check`
- 스모크: API와 Web이 떠 있는 상태에서 `pnpm smoke`

## 배포 Jar 빌드

- 배포 Jar 빌드: `pnpm jar`

`bootJar`는 먼저 `apps/web`에서 `pnpm build`를 실행하고, 생성된 `apps/web/dist` 내용을 Jar의 `BOOT-INF/classes/static`에 포함한다.

## 운영 기능 범위

- UI에서는 기존 API/DB의 `universe` 개념을 `종목 그룹`으로 표시한다. 종목 그룹은 전략이 자동 실행 시 검사할 종목 묶음이다.
- 자동 실행 활성화는 백테스트 완료를 요구하지 않는다. 대신 유효한 전략 버전, 하나 이상의 국내 종목 그룹 연결, 종목 구성, 리스크 설정을 실행 전 검증한다.
- 백테스트는 핵심 운용 기능이 아니라 `과거 데이터 점검` 보조 기능으로 취급한다. 여러 종목 입력 시 초기 자본을 종목 수로 균등 분할해 독립 시뮬레이션하며, 자동 실행의 주문 수량 정책과 일치하지 않을 수 있다.

## 배포 Jar 스모크

다음 명령으로 배포 Jar를 빌드하고 임시로 실행한 뒤 주요 응답을 확인한다.

```powershell
pnpm jar:smoke
```

`jar-smoke`는 로컬 DB 접근을 확인하고, 필요하면 개발 DB를 시작한 다음 다음 항목을 점검한다.

- `/api/v1/health` 200 응답
- `/`, `/strategies`, `/universes`, `/broker/ledger`, `/orders`, `/positions`, `/settings` SPA 라우트 200 응답
- `index.html`의 Vite JavaScript asset 참조와 `/assets/index-*.js` 200 응답

## 운영 환경변수

- `SERVER_PORT` 또는 `API_PORT`: Jar 실행 포트
- `JAR_SMOKE_PORT`: `jar-smoke`가 임시 Jar 실행에 사용할 포트. 기본값은 `18083`이다.
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: PostgreSQL 연결
- `OPENFORGE_AUTH_PASSWORD`: 값이 있으면 `/api/**` 인증을 요구한다.
- `OPENFORGE_JWT_SECRET`: 운영에서는 기본 개발 secret 대신 고정된 비밀값을 사용한다.
- `WEB_ORIGIN`: 로컬 Vite 개발 서버 CORS origin. Jar 통합 배포에서는 프론트와 API가 같은 origin으로 동작한다.

## 정적 리소스와 라우팅

- Vite 산출물은 `BOOT-INF/classes/static`에 포함된다.
- SPA 딥링크는 Spring MVC fallback을 통해 `index.html`로 전달된다.
- `/api/**`, `/actuator/**`, `/assets/**`, `favicon.ico`, 확장자가 있는 정적 파일 요청은 SPA fallback에서 제외된다.
- `/assets/**`는 해시 파일명을 전제로 `public, max-age=31536000, immutable` 캐시를 사용한다.
- `index.html`은 장기 캐시를 적용하지 않아 새 배포 후 최신 asset 참조가 반영된다.

## 배포 전 체크리스트

- `.env` 또는 운영 secret에 DB와 인증 환경변수가 설정되어 있는지 확인한다.
- `pnpm check`가 통과하는지 확인한다.
- `pnpm jar`로 Jar가 생성되는지 확인한다.
- Jar 안에 `BOOT-INF/classes/static/index.html`과 `BOOT-INF/classes/static/assets/index-*.js`, `index-*.css`가 포함되는지 확인한다.
- 가능하면 `pnpm jar:smoke`로 Jar 실행 스모크를 수행한다.

## 배포 후 체크리스트

- `/api/v1/health`가 200을 반환하는지 확인한다.
- `/`, `/strategies`, `/universes`, `/orders`, `/settings` 등 주요 화면이 새로고침으로 열리는지 확인한다.
- 브라우저 개발자 도구에서 `/assets/index-*.js`, `/assets/index-*.css`가 200으로 로드되는지 확인한다.
- 인증을 켠 환경에서는 로그인 후 `/api/**` 요청이 401 없이 처리되는지 확인한다.
- 장애 시 API 로그, DB 접속 정보, `SERVER_PORT`, `OPENFORGE_AUTH_PASSWORD`, `OPENFORGE_JWT_SECRET` 설정을 우선 확인한다.
