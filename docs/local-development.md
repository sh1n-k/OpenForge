# 로컬 개발 가이드

## 전제

- Node.js 22 LTS 권장
- `pnpm` 10 이상
- Java 21 툴체인
- Docker Desktop

## 초기 설정

1. 루트에서 `.env.example`을 `.env`로 복사한다.
2. 필요하면 `.env`의 `API_PORT`, `WEB_PORT`를 수정한다.
3. 워크스페이스 의존성을 설치한다: `pnpm install --frozen-lockfile`
4. DB를 띄운다: `pnpm dev:db`

## 실행

- API: `pnpm dev:api`
- Web: `pnpm dev:web`
- API/Web 동시 실행: `pnpm dev:all`
- 기본 포트는 API `8080`, Web `3000`이다.
- 로컬 Web은 Vite dev server로 실행되며 `/api` 요청을 API 서버로 프록시한다.
- `API_BASE_URL`, `VITE_API_BASE_URL`, `WEB_ORIGIN`은 포트 기반 기본값을 덮어쓸 때만 사용한다.
- Windows Docker Desktop 환경에서는 Postgres 포트가 IPv6 loopback(`::1`)으로 전달될 수 있으므로 `.env`의 `DB_HOST` 기본값은 `localhost`다. Windows에서는 같은 `pnpm` 명령이 내부적으로 PowerShell 스크립트를 호출하고, Java 실행 시 `-Djava.net.preferIPv6Addresses=true`를 자동 적용한다.

## 검증

- 전체 체크: `pnpm check`
- 스모크: API와 Web이 떠 있는 상태에서 `pnpm smoke`

## 배포 Jar 빌드

- `pnpm jar`

`bootJar`는 먼저 `apps/web`에서 `pnpm build`를 실행하고, 생성된 `apps/web/dist` 내용을 Jar의 `BOOT-INF/classes/static`에 포함한다.

## 배포 Jar 스모크

다음 명령으로 배포 Jar를 빌드하고 임시로 실행한 뒤 주요 응답을 확인한다.

```bash
pnpm jar:smoke
```

`jar-smoke`는 로컬 DB 접근을 확인하고, 필요하면 개발 DB를 시작한 다음 다음 항목을 점검한다.

- `/api/v1/health` 200 응답
- `/`, `/strategies`, `/universes`, `/broker/ledger`, `/orders`, `/positions`, `/settings` SPA 라우트 200 응답
- `index.html`의 Vite JavaScript asset 참조와 `/assets/index-*.js` 200 응답

## 운영 환경변수

- `SERVER_PORT` 또는 `API_PORT`: Jar 실행 포트
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
