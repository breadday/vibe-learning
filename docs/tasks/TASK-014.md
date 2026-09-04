# TASK-014: 검수 콘텐츠 컴포넌트 일반화 (최소 범위)

## 목표

`LearningWorkspace`에 하드코딩된 카피/숫자를 `VideoContent` 데이터에서 파생되게 수정한다. 새 검수 콘텐츠 추가 시 컴포넌트 수정 없이 JSON만으로 동작하게 한다.

## 배경

TASK-013에서 `/learn/[slug]` 라우트를 연결했으나, `LearningWorkspace`에 다음 하드코딩이 남아 있다:
- "14분 안에...", "핵심 3줄", "필수 구간 4개", "3단계", "이 영상의 핵심 3줄", "필요한 구간만 바로 보기", "안전한 환경을 직접 설계하기", Route card 학습 순서 3개

현재 `first-video` 1개만 있어 문제 없지만, 콘텐츠 추가 시마다 컴포넌트 수정이 필요해지는 기술 부채다. 스키마에 선택적 필드만 추가해 breaking change 없이 일반화한다.

## 요구사항

### 1. 스키마 확장 (`lib/content/schema.ts`)

`videoSchema`에 다음 선택적 필드 6개 추가 (모두 `nullable().optional()`):

| 필드 | 용도 | 기본값(없을 때) |
|---|---|---|
| `subtitle` | 인트로 부제목 ("14분 안에...") | `video.title` 기반 자동 생성 |
| `introDescription` | 인트로 설명문 | 생략 |
| `summaryTitle` | 요약 섹션 제목 ("핵심 3줄") | `"핵심 ${keyPoints.length}줄"` |
| `summarySectionTitle` | 1단계 섹션 헤더 | `"이해하기"` |
| `segmentsSectionTitle` | 2단계 섹션 헤더 | `"골라 보기"` |
| `practiceSectionTitle` | 3단계 섹션 헤더 | `"직접 해보기"` |

### 2. 컴포넌트 수정 (`components/LearningWorkspace.tsx`)

다음 9곳을 데이터/계산으로 대체:

| 위치 | 현재 하드코딩 | 변경 후 |
|---|---|---|
| L29 `value-copy` | "14분 안에..." | `content.video.introDescription ?? content.video.subtitle ?? \`${Math.ceil((video.durationSeconds??0)/60)}분 안에 ${video.title}을 이해합니다.\`` |
| L29 `learning-stats` 3번째 span | "3단계" | 섹션 수 고정(3) → 상수 `STEP_COUNT = 3` |
| L29 `route-card` ol | 하드코딩 3개 li | `segments`/`practiceSteps`/`copyBlocks` 존재 여부로 동적 생성 |
| L33 `step-section#summary` h2 | "이 영상의 핵심 3줄" | `content.video.summaryTitle ?? \`핵심 ${keyPoints.length}줄\`` |
| L33 `step-section#summary` p | "이해하기" | `content.video.summarySectionTitle ?? "이해하기"` |
| L34 `step-section#segments` h2 | "필요한 구간만 바로 보기" | `content.video.segmentsSectionTitle ?? "골라 보기"` |
| L34 `step-section#segments` p | "골라 보기" | 동일 |
| L35 `step-section#practice` h2 | "안전한 환경을 직접 설계하기" | `content.video.practiceSectionTitle ?? "직접 해보기"` |
| L35 `step-section#practice` p | "직접 해보기" | 동일 |

`keyPoints`는 JSON의 `keyPoints` 필드가 없으므로 `segments.filter(s => s.type === 'required').length` 또는 별도 필드 추가 대신 기존 `segments`에서 파생.

### 3. 데이터 보완 (`content/first-video.json`)

`video` 객체에 위 6개 필드 값 채우기 (기존 콘텐츠와 일치하게).

### 4. 타입 내보내기

`VideoContent` 타입이 자동으로 확장되므로 별도 작업 불필요.

## 작업 범위

### 포함

| 파일 | 변경 내용 |
|---|---|
| `lib/content/schema.ts` | `videoSchema`에 선택적 필드 6개 추가 |
| `components/LearningWorkspace.tsx` | 하드코딩 9곳 데이터/계산으로 대체 |
| `content/first-video.json` | 새 필드 6개 값 채우기 |

### 제외

- 라우트(`app/learn/[slug]/page.tsx`) 변경
- 로더(`lib/content/loadReviewedContent.ts`) 변경
- 홈 페이지(`app/page.tsx`) 변경
- MDX 렌더링, E2E 테스트 변경
- 새 콘텐츠 추가

## 작업 절차

### 1. 스키마 수정

`lib/content/schema.ts`의 `videoSchema`에 6개 필드 추가.

### 2. 컴포넌트 리팩토링

`LearningWorkspace.tsx`:
- 상단에 `STEP_COUNT = 3` 상수 정의
- `requiredCount = segments.filter(s => s.type === 'required').length` 계산
- `routeCardSteps` 배열을 데이터 기반으로 동적 생성
- 각 하드코딩 문자열을 `content.video.필드 ?? 기본값` 패턴으로 대체

### 3. 데이터 업데이트

`content/first-video.json`의 `video` 객체에 6개 필드 추가.

### 4. 검증

| 검증 | 명령 |
|---|---|
| 린트 | `npm run lint` |
| 타입체크 | `npm run typecheck` |
| 단위 테스트 | `npm test` |
| 빌드 | `npm run build -- --webpack` |
| E2E | `npm run test:e2e -- --reporter=line` |
| 수동 확인 | `npm run dev` → `/learn/first-video` 렌더링 동일 확인 |

## 완료조건

- [ ] `LearningWorkspace`에 하드코딩된 문자열/숫자 0개 (데이터/계산/상수로만 렌더링)
- [ ] `first-video.json`에 새 필드 6개 값 채워짐
- [ ] `npm run lint`, `typecheck`, `test`, `build`, `test:e2e` 모두 통과
- [ ] `git diff --check` 통과
- [ ] 시각적 회귀 없음 (기존 렌더링과 동일)

## 예상 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `lib/content/schema.ts` | videoSchema에 선택적 필드 6개 추가 |
| `components/LearningWorkspace.tsx` | 하드코딩 9곳 데이터/계산으로 대체 |
| `content/first-video.json` | video에 필드 6개 추가 |

## 결과 보고 형식

1. 변경된 하드코딩 위치와 대체 방식 요약
2. 스키마에 추가된 필드 목록
3. 검증 명령 실행 결과 표
4. 커밋 해시
5. 남은 이슈