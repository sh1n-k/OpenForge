# OpenForge

투자 전략 관리·백테스트·주문 실행을 위한 웹 애플리케이션.

## 구조

- `apps/api` — Spring Boot 4 + Kotlin, PostgreSQL, Flyway
- `apps/web` — Next.js 16 (App Router) + React 19 + Tailwind 4

## 빌드 & 검증

```bash
make check          # API 테스트 + 코드 스타일 + web lint + test (전체 검증)
make dev-db         # PostgreSQL 컨테이너 시작
make dev-api        # API 서버 (Gradle bootRun)
make dev-web        # 웹 서버 (Next.js dev)
make smoke          # 실행 중인 서버 헬스 체크
```

### API (apps/api)

```bash
cd apps/api && ./gradlew test              # 단위/통합 테스트
cd apps/api && ./gradlew spotlessCheck     # Kotlin 코드 스타일
cd apps/api && ./gradlew spotlessApply     # 자동 포맷팅
```

### Web (apps/web)

```bash
pnpm --filter web lint        # ESLint
pnpm --filter web test --run  # Vitest
pnpm --filter web build       # 프로덕션 빌드
```

## 패키지 구조 규칙

### API (Kotlin)

```
com.openforge.api
├── auth/              # 인증 (JWT)
├── backtest/          # 백테스트 엔진
│   ├── application/
│   ├── domain/
│   └── web/
├── common/            # 공통 (예외 처리, JPA 베이스)
├── config/            # 설정 (Security, WebConfig, Properties)
├── operations/        # 대시보드·운영 조회
├── strategy/          # 전략 도메인
│   ├── application/
│   ├── domain/
│   ├── editor/        # 전략 편집기 (검증·정규화·인디케이터 레지스트리)
│   └── web/
└── system/            # 시스템 관리
    ├── activity/
    ├── broker/
    ├── health/
    └── risk/
```

### Web (TypeScript)

```
apps/web/src
├── app/               # Next.js App Router 페이지
├── components/        # 클라이언트 컴포넌트
└── lib/
    └── api/           # API 클라이언트(client.ts) + 타입 정의(types.ts)
```

## 핵심 규칙

- API 응답 타입 변경 시 → `apps/web/src/lib/api/types.ts` 동기화 필수
- 인디케이터 추가/변경 시 → `IndicatorRegistry.kt` (source of truth) + `strategy-editor.ts` (프론트) 양쪽 반영
- DB 스키마 변경 → Flyway 마이그레이션 파일 추가 (`V{N}__description.sql`)
- 환경변수 추가 시 → `.env.example` + `ApplicationProperties.kt` 양쪽 반영
- 테스트는 Testcontainers(PostgreSQL) 기반 통합 테스트를 기본으로 함

## 환경변수

`.env.example` 참조. 주요 변수:
- `OPENFORGE_AUTH_PASSWORD` — 비어있으면 인증 비활성화
- `OPENFORGE_JWT_SECRET` — 프로덕션에서 반드시 설정 (미설정 시 시작 차단)
