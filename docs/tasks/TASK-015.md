# TASK-015: 잔여 하드코딩 제거

## 목표

`components/LearningWorkspace.tsx`에 남은 하드코딩 문구와 `keyPoints`를 콘텐츠 데이터로 옮겨, 검수 콘텐츠 추가 시 컴포넌트 수정 없이 JSON만으로 렌더링되는 범위를 넓힌다.

## 배경

- TASK-014에서 인트로 문구·통계·라우트 카드·섹션 라벨 9곳을 데이터 기반으로 바꿨다.
- 그러나 다음이 여전히 컴포넌트에 하드코딩돼 있다(TASK-014 결과서 남은 이슈):
  - 구간 h2 "필요한 구간만 바로 보기", 실습 h2 "안전한 환경을 직접 설계하기"
  - `keyPoints` 핵심 3문장(컴포넌트 상수)
  - `context-label` "오늘의 바이브코딩 학습"
  - 헤더 내비게이션 "핵심/구간/실습"
  - 히어로 CTA "필수 구간부터 보기" 버튼, "3줄 핵심 먼저 읽기" 링크
- `value-copy` 폴백 문장은 조사 "을"이 고정돼 있어 제목에 따라 부자연스럽다.

## 요구사항

### 1. 스키마 확장 (`lib/content/schema.ts`)

`videoSchema`에 다음 7개 필드를 추가한다. 문자열 필드는 기존 방식과 같이 `nonEmptyText.nullable().optional()`, 배열 필드는 `z.array(...).nullable().optional()`로 정의한다.

| 필드 | 형식 | 용도 | 기본값(없을 때) |
|---|---|---|---|
| `segmentsTitle` | string | 구간 섹션 h2 | `"필요한 구간만 바로 보기"` |
| `practiceTitle` | string | 실습 섹션 h2 | `"안전한 환경을 직접 설계하기"` |
| `keyPoints` | string[] | 요약 섹션 핵심 문장 목록 | 기존 컴포넌트 상수 3개 |
| `contextLabel` | string | 인트로 상단 라벨 | `"오늘의 바이브코딩 학습"` |
| `navItems` | `{ label, href }[]` | 헤더 내비게이션 항목 | 기존 상수(핵심/구간/실습) |
| `heroPrimaryCta` | string | 히어로 기본 버튼 문구 | `"필수 구간부터 보기"` |
| `heroSecondaryCta` | string | 히어로 보조 링크 문구 | `"3줄 핵심 먼저 읽기"` |

- `navItems`의 `href`는 고정 섹션 앵커(`#summary`, `#segments`, `#practice`)를 가리킨다.
- 히어로 CTA는 문구만 데이터화한다. 기본 버튼의 `moveToSegment` 동작과 보조 링크의 `#summary` 이동은 변경하지 않는다.

### 2. 데이터 보완 (`content/first-video.json`)

`video` 객체에 위 7개 필드를 **기존 렌더링 문구 그대로** 채운다.

| 필드 | 값 |
|---|---|
| `segmentsTitle` | "필요한 구간만 바로 보기" |
| `practiceTitle` | "안전한 환경을 직접 설계하기" |
| `keyPoints` | ["코딩 에이전트는 답변을 넘어 파일을 읽고 수정하며 테스트까지 실행합니다.", "MCP는 외부 도구를 연결하지만, 실제 능력과 위험은 허용한 권한에 따라 달라집니다.", "좋은 개발은 작성으로 끝나지 않고 실행 → 확인 → 수정 → 재검증을 반복합니다."] |
| `contextLabel` | "오늘의 바이브코딩 학습" |
| `navItems` | [{"label": "핵심", "href": "#summary"}, {"label": "구간", "href": "#segments"}, {"label": "실습", "href": "#practice"}] |
| `heroPrimaryCta` | "필수 구간부터 보기" |
| `heroSecondaryCta` | "3줄 핵심 먼저 읽기" |

### 3. 컴포넌트 수정 (`components/LearningWorkspace.tsx`)

- `keyPoints = video.keyPoints ?? 기존 상수` (기존 상수는 폴백으로 유지)
- 구간 h2 = `video.segmentsTitle ?? "필요한 구간만 바로 보기"`
- 실습 h2 = `video.practiceTitle ?? "안전한 환경을 직접 설계하기"`
- `contextLabel = video.contextLabel ?? "오늘의 바이브코딩 학습"`
- 내비게이션 = `video.navItems ?? 기존 상수`
- 히어로 CTA 2개 = `video.heroPrimaryCta` / `video.heroSecondaryCta` ?? 기존 문구
- `value-copy` 폴백 문구 변경: `"${title}을 이해합니다."` → `"${title} 이해하기"` (조사 제거, "N분 안에" 접두는 유지)

### 4. 테스트 보강

- `lib/content/schema.test.ts`: 신규 7개 필드 수용/공백 거부 케이스 확장
- `components/LearningWorkspace.test.tsx`: 변경된 폴백 문구 반영("…을 이해합니다." → "… 이해하기"), 신규 필드(`segmentsTitle`, `practiceTitle`, `keyPoints`, `contextLabel`, `navItems`, 히어로 CTA) 렌더링 케이스 추가

## 작업 범위

### 포함

| 파일 | 변경 내용 |
|---|---|
| `lib/content/schema.ts` | 선택 필드 7개 추가 |
| `content/first-video.json` | 신규 필드 7개 값 채우기 |
| `components/LearningWorkspace.tsx` | 잔여 하드코딩 데이터/상수 기반 대체, 폴백 문구 조사 제거 |
| `lib/content/schema.test.ts` | 신규 필드 테스트 케이스 |
| `components/LearningWorkspace.test.tsx` | 폴백 변경 반영 및 신규 필드 렌더링 테스트 |

### 제외

- 라우트(`app/learn/[slug]/page.tsx`), 로더, 홈 페이지 변경
- MDX 렌더링, E2E 스펙 변경
- 새 콘텐츠 추가
- 아래 "여전히 하드코딩으로 남는 것"에 해당하는 문구 변경

### 여전히 하드코딩으로 남는 것 (범위 밖)

푸터 문구, 사이드 노트 요약 문구("학습 전 꼭 확인" 등), `learning-stats` 라벨("전체 영상" 등), 라우트 카드 제목("오늘의 학습 순서"), 세그먼트 카드 "이 구간 보기 →", 실습 프롬프트 라벨("실습에 바로 쓰는 프롬프트"), 검수 기준 문구, 세그먼트 유형 라벨(필수/선택/참고)

## 작업 절차

1. `lib/content/schema.ts`에 필드 7개 추가
2. `content/first-video.json`에 값 채우기
3. `components/LearningWorkspace.tsx` 수정
4. 테스트 보강
5. 검증 실행

## 검증

| 검증 | 명령 |
|---|---|
| 린트 | `npm run lint` |
| 타입체크 | `npm run typecheck` |
| 단위 테스트 | `npm test` |
| 빌드 | `npm run build -- --webpack` |
| E2E | `npm run test:e2e -- --reporter=line` |
| diff 형식 | `git diff --check` |
| 시각적 회귀 | `/learn/first-video` 스크린샷을 TASK-014 결과와 비교 — first-video는 모든 문구를 JSON 값으로 사용하므로 렌더링이 완전히 동일해야 함 (폴백 문구 변경은 JSON 값이 없는 콘텐츠에만 적용되므로 컴포넌트 테스트로 검증) |

## 완료조건

- [ ] `lib/content/schema.ts`에 선택 필드 7개 추가됨
- [ ] `first-video.json`에 7개 필드가 기존 문구 그대로 채워짐
- [ ] `LearningWorkspace`의 대상 하드코딩(구간/실습 h2, keyPoints, contextLabel, 내비, 히어로 CTA)이 데이터/상수 기반으로 렌더링됨
- [ ] `value-copy` 폴백 문구에서 조사 제거됨
- [ ] `npm run lint`, `typecheck`, `test`, `build`, `test:e2e` 모두 통과
- [ ] `git diff --check` 통과
- [ ] 시각적 회귀 없음 (first-video 렌더링 기준)

## 커밋

- 메시지: `refactor: 학습 워크스페이스 잔여 문구 및 keyPoints 콘텐츠화`

## 결과 보고 형식

1. 대체한 하드코딩 위치와 방식 요약
2. 스키마에 추가된 필드 목록과 first-video.json 값
3. 검증 명령 실행 결과 표
4. 커밋 해시
5. 남은 이슈
