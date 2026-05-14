# Rebalance Trading MVP

개인 계좌 리밸런싱 MVP는 기본값에서 실계좌 주문을 내지 않는다. 현재 자동 주문 루프는 승인된 계획만 처리하고, 브로커 어댑터는 기본 mock이며 `LIVE_TRADING_MOCK_BROKER=false`일 때도 KIS paper 계좌 주문만 사용한다. live 계획은 별도 환경 게이트, 전략 게이트, 운영 체크리스트, 확인 문구, 기본 주문 한도를 모두 통과해야 한다.

## 환경 변수

- `APP_MODE=paper`: 기본 실행 모드. live 주문 전송 조건에 포함된다.
- `LIVE_TRADING_ENABLED=false`: live 계획 전송 차단 기본값.
- `LIVE_TRADING_MOCK_BROKER=true`: mock 브로커 사용. `false`로 바꾸면 paper 계획만 KIS paper API로 전송한다.
- `LIVE_TRADING_ALLOW_LIVE_BROKER=false`: live 브로커 전송 차단 기본값.
- `LIVE_TRADING_MAX_ORDER_NOTIONAL=100000.000000`: live 계획의 주문별 기본 상한.
- `LIVE_TRADING_MAX_CONSECUTIVE_FAILURES=3`: 주문/상태 조회 연속 실패 시 자동 중지와 kill switch를 켠다.

## 운영 절차

1. `/settings`에서 paper KIS 연결 정보를 저장하고 연결 테스트를 통과시킨다.
2. `/broker`에서 원장 동기화를 실행한다.
3. `/strategies/{id}`의 리밸런싱 탭에서 목표 비중을 입력한다.
4. 최신 원장 요약에 현금 필드가 없으면 현금 보정을 입력한다.
5. 계획을 생성하고 주문 수량, 매수/매도 방향, 위험 사유를 확인한다.
6. 계획을 승인한 뒤 전송한다.
7. 장중에는 동기화로 broker 상태를 확인하고, 장마감 미체결 처리는 전략의 close policy에 따른다.

## Live 전환 게이트

live 계획 전송은 다음 조건을 모두 만족해야 한다. 하나라도 빠지면 계획은 `blocked`가 되고 `failureReason`에 차단 사유가 저장된다.

- `APP_MODE=live`
- `LIVE_TRADING_ENABLED=true`
- `LIVE_TRADING_ALLOW_LIVE_BROKER=true`
- 전략 리스크 설정의 `liveTradingEnabled=true`
- 승인 요청의 `confirmLiveRisk=true`
- 승인 요청의 `liveChecklistAccepted=true`
- 승인 요청의 `liveConfirmationPhrase=LIVE 리밸런싱 위험 확인`
- 주문별 금액이 `LIVE_TRADING_MAX_ORDER_NOTIONAL` 이하

## 안전 장치

- 계획 생성, 승인, 전송, 상태 동기화는 모두 감사 로그에 기록된다.
- 전송 전 승인 없이는 주문을 보낼 수 없다.
- 동일 전략/종목에 열린 리밸런싱 주문이 있으면 후속 주문은 precheck에서 막힌다.
- broker 상태가 알 수 없는 값이면 내부 상태를 `unknown`으로 낮추고 수량을 주문 수량 범위로 보정한다.
- stale 원장 스냅샷은 계획 생성에서 거부된다.
- KIS paper 주문 어댑터는 국내 주식 현금 주문만 처리한다.
- KIS API timeout 또는 불확실한 응답은 재주문하지 않고 `unknown` 또는 실패 상태로 기록한다.
- KIS 상태값이 알 수 없는 텍스트이면 `unknown`으로 매핑한다.

## 실제 KIS Paper 검증

실제 KIS paper 계정 검증은 로컬에 계정 정보가 준비된 경우에만 수행한다. 토큰, 계좌번호, 주문번호 전체값은 로그와 이슈에 남기지 않는다.

1. `/settings`에서 paper KIS app key, app secret, 계좌번호, 상품코드를 저장하고 paper 연결 테스트를 통과시킨다.
2. `LIVE_TRADING_MOCK_BROKER=false`, `APP_MODE=paper`로 API를 실행한다.
3. 테스트 가능한 소액 국내 종목으로 paper 리밸런싱 계획을 만든다.
4. 계획을 승인하고 전송한다.
5. 응답에서 주문번호와 응답 코드가 저장됐는지 확인한다.
6. 동기화를 실행해 접수, 거부, 부분체결, 전량체결, 취소, unknown 매핑을 확인한다.

실제 계정 통합 테스트는 명시적으로 활성화한 경우에만 실행한다. 아래 값은 커밋하거나 로그에 남기지 않는다.

```bash
cd apps/api
RUN_KIS_PAPER_E2E=true \
KIS_APP_KEY=... \
KIS_APP_SECRET=... \
KIS_ACCOUNT_NUMBER=... \
KIS_PRODUCT_CODE=... \
KIS_PAPER_SYMBOL=... \
KIS_PAPER_PRICE=... \
KIS_PAPER_EQUITY=... \
KIS_PAPER_CASH=... \
./gradlew test --tests com.openforge.api.strategy.KisPaperExternalE2eIntegrationTest
```

선택 값으로 `KIS_PAPER_TARGET_WEIGHT`와 `KIS_PAPER_MAX_NOTIONAL`을 지정할 수 있다. 테스트는 목표 주문 금액이 기본 `100000` 이하이고, 최소 1주를 살 수 있으며, 현금이 목표 주문 금액 이상일 때만 실행된다.

## 검증 명령

```bash
cd apps/api && ./gradlew test --tests com.openforge.api.strategy.RebalanceTradingApiIntegrationTest
cd apps/api && ./gradlew test --tests com.openforge.api.strategy.KisPaperRebalanceTradingApiIntegrationTest
cd apps/api && ./gradlew test --tests com.openforge.api.strategy.KisPaperExternalE2eIntegrationTest
cd apps/web && pnpm test --run RouteView
pnpm check
```
