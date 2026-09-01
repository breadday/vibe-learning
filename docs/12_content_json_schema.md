# 콘텐츠 JSON Schema v1

`content/*.json`은 `lib/content/schema.ts`의 `videoContentSchema`로 로드 시점에 검증한다. 같은 모듈의 `videoContentJsonSchema`는 도구 연동용 JSON Schema Draft 2020-12 표현을 제공한다. 이 문서는 v0.1 콘텐츠 계약을 고정하며, 호환되지 않는 변경은 `schemaVersion`을 올린 뒤 진행한다.

## JSON과 MDX의 책임

- JSON: 영상 메타데이터, 최신성, 재생 구간, 실습, 복사 블록, 개념, 경고, 출처, 검수 TODO처럼 구조와 검증이 필요한 데이터
- 검수된 MDX: “이 영상을 볼 가치”와 10줄 이내 핵심 요약 같은 서술형 본문
- 프롬프트와 코드는 JSON 문자열로만 저장하며 HTML, JSX, 외부 스크립트로 실행하지 않는다.

## 루트 필드

| 필드 | 형식 | 규칙 |
| --- | --- | --- |
| `schemaVersion` | `1` | v1 고정값 |
| `verificationStatus` | `pending \| reviewed` | 검수 상태 |
| `slug` | string | 소문자 영숫자와 하이픈만 허용 |
| `video` | object | YouTube 메타데이터 |
| `freshness` | object | 최신성 상태, 확인일, 판단 근거 |
| `segments` | array | 필수 최대 5개, 선택 최대 3개 |
| `practiceSteps` | array | 제목과 실행 지시 |
| `copyBlocks` | array | `prompt` 또는 `code` 문자열 |
| `concepts` | array | 용어와 설명 |
| `warnings` | string[] | 주의사항 |
| `sources` | array | 공식자료, 원본, 관련 자료의 HTTPS 링크 |
| `todo` | string[] | 검수 전에 남은 확인 사항 |

모든 객체는 정의되지 않은 필드를 거부하고, 사람이 읽는 문자열은 공백만으로 구성될 수 없다. 날짜는 `YYYY-MM-DD`, URL은 HTTPS만 허용한다.

## 상태 규칙

`pending`은 확인하지 않은 영상 값을 `null`로 둘 수 있다. 확인하지 않은 정보를 추측해서 채우지 않는다.

`reviewed`는 다음 조건을 모두 만족해야 한다.

1. `video`의 모든 메타데이터가 확인되어 `null`이 아니다.
2. `freshness.status`가 `unverified`가 아니며 `checkedAt`이 있다.
3. `todo`가 비어 있다.

## 영상 구간 규칙

- `startSeconds`와 `endSeconds`는 정수 초다.
- 시작은 0 이상이고 종료는 1 이상이며, 종료가 시작보다 늦어야 한다.
- 구간은 서로 겹칠 수 없다. 한 구간의 종료와 다음 구간의 시작이 같은 것은 허용한다.
- 구간이 하나라도 있으면 `video.durationSeconds`가 필요하다.
- 종료 시각은 영상 길이를 초과할 수 없다.
- 배열 순서는 검증에 영향을 주지 않는다.

표준 JSON Schema가 표현하기 어려운 구간 간 중복과 상태별 조건까지 Zod의 교차 필드 검증으로 강제한다. 콘텐츠를 추가하거나 변경한 뒤 `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`를 실행한다.
