# UI Layout Contract

## 기준 화면
- 기준 화면은 `Dashboard`다.
- 모든 문서형 페이지는 대시보드의 세로 리듬, 카드 밀도, 섹션 간 간격을 기본값으로 따른다.

## 전역 슬롯
- `page-shell`: 페이지 외곽 폭과 기본 세로 간격
- `page-intro`: eyebrow, title, description
- `doc-panel`: 기본 카드
- `summary-metrics`: 요약 카드 행
- `control-panel`: 필터, 생성, 동기화, 설정 입력
- `section-header`: 섹션 제목과 보조 설명
- `content-block`: table, list, chart, empty-state

## 페이지 유형

### Dashboard Page
- `intro -> status/context -> metrics -> content sections`

### Registry Page
- `intro -> create panel -> registry header -> controls -> list/empty`

### Operations Page
- `intro -> info panel -> metrics -> control panel -> content sections`

### Detail Page
- `intro -> overview/context -> detail sections`

### Workbench Page
- `intro panel -> main workspace -> side support panel`

## 고정 규칙
- 기본 페이지 세로 간격: `32px`
- 기본 패널 padding: `24px`
- compact 패널 padding: `18px 20px`
- section header와 본문 간격: `18px`
- metric card 최소 높이: `140px`
- operations control panel 최소 높이: `195px`
- TOC 유무는 본문 시작 기준선을 바꾸지 않는다.

## 구현 원칙
- 페이지 전용 spacing은 가능한 한 추가하지 않는다.
- `style={{ marginTop: ... }}` 대신 공통 슬롯 클래스를 사용한다.
- 같은 역할의 카드와 패널은 페이지가 달라도 같은 높이와 폭 규칙을 사용한다.
