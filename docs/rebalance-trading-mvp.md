# Rebalance Trading MVP

개인 계좌 리밸런싱 MVP는 기본값에서 실계좌 주문을 내지 않는다. 현재 자동 주문 루프는 승인된 계획만 처리하고, 브로커 어댑터는 기본 mock이며 `LIVE_TRADING_MOCK_BROKER=false`일 때도 KIS paper 계좌 주문만 사용한다. live 계획은 환경과 전략 게이트를 통과해도 실제 KIS live 주문 게이트웨이가 의도적으로 비활성화되어 있다.

## 환경 변수

- `APP_MODE=paper`: 기본 실행 모드. live 주문 전송 조건에 포함된다.
- `LIVE_TRADING_ENABLED=false`: live 계획 전송 차단 기본값.
- `LIVE_TRADING_MOCK_BROKER=true`: mock 브로커 사용. `false`로 바꾸면 paper 계획만 KIS paper API로 전송한다.
- `LIVE_TRADING_MAX_CONSECUTIVE_FAILURES=3`: 주문/상태 조회 연속 실패 시 자동 중지와 kill switch를 켠다.

## 운영 절차

1. `/settings`에서 paper KIS 연결 정보를 저장하고 연결 테스트를 통과시킨다.
2. `/broker`에서 원장 동기화를 실행한다.
3. `/strategies/{id}`의 리밸런싱 탭에서 목표 비중을 입력한다.
4. 최신 원장 요약에 현금 필드가 없으면 현금 보정을 입력한다.
5. 계획을 생성하고 주문 수량, 매수/매도 방향, 위험 사유를 확인한다.
6. 계획을 승인한 뒤 전송한다.
7. 장중에는 동기화로 broker 상태를 확인하고, 장마감 미체결 처리는 전략의 close policy에 따른다.

## 안전 장치

- 계획 생성, 승인, 전송, 상태 동기화는 모두 감사 로그에 기록된다.
- 전송 전 승인 없이는 주문을 보낼 수 없다.
- 동일 전략/종목에 열린 리밸런싱 주문이 있으면 후속 주문은 precheck에서 막힌다.
- broker 상태가 알 수 없는 값이면 내부 상태를 `unknown`으로 낮추고 수량을 주문 수량 범위로 보정한다.
- stale 원장 스냅샷은 계획 생성에서 거부된다.
- KIS paper 주문 어댑터는 국내 주식 현금 주문만 처리한다.

## 검증 명령

```bash
cd apps/api && ./gradlew test --tests com.openforge.api.strategy.RebalanceTradingApiIntegrationTest
cd apps/web && pnpm test --run RouteView
pnpm check
```
