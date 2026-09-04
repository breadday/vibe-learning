# TASK-014 결과서: 검수 콘텐츠 컴포넌트 일반화 (최소 범위)

## 1. 변경된 하드코딩 위치와 대체 방식 요약

`components/LearningWorkspace.tsx`에서 지시서의 9곳을 다음과 같이 대체했다.

| 위치 | 이전 (하드코딩) | 이후 |
|---|---|---|
| 인트로 `value-copy` | "14분 안에 코딩 에이전트의 구조와 안전한 권한 설정을 이해합니다." | `video.introDescription ?? video.subtitle ?? \`${분}분 안에 ${video.title}을 이해합니다.\`` |
| `learning-stats` 3번째 | "3단계" | 모듈 상수 `STEP_COUNT = 3` |
| `route-card` ol | 고정 li 3개 | `routeCardSteps` 배열을 데이터 존재 여부로 동적 생성(아래 상세) |
| 요약 섹션 h2 | "이 영상의 핵심 3줄" | `video.summaryTitle ?? \`핵심 ${keyPoints.length}줄\`` |
| 요약 섹션 p | "이해하기" | `video.summarySectionTitle ?? "이해하기"` |
| 구간 섹션 p | "골라 보기" | `video.segmentsSectionTitle ?? "골라 보기"` |
| 실습 섹션 p | "직접 해보기" | `video.practiceSectionTitle ?? "직접 해보기"` |

- **`route-card` 동적 생성**: 1단계는 항상 표시(`핵심 ${keyPoints.length}줄`), 2단계는 `segments.length > 0`일 때(`필수 구간 ${requiredCount}개`), 3단계는 `practiceSteps.length > 0 || copyBlocks.length > 0`일 때(`실습 ${practiceSteps.length}단계`) 표시된다.
- **`key-points` 목록**: 인라인 하드코딩 li 3개를 모듈 상수 배열 `keyPoints`로 추출해 렌더링한다. 지시서가 요약 제목 폴백 계산에 쓰라고 한 `keyPoints`의 실체다.

### 지시서 대비 보정한 부분

1. **`*SectionTitle`은 p(단계 라벨)에만 사용**: 지시서 표는 구간/실습 h2에도 `segmentsSectionTitle`/`practiceSectionTitle`을 매핑했지만, 스키마 요구사항 표의 기본값("골라 보기", "직접 해보기")은 p 라벨 텍스트다. 표대로 h2에 쓰면 h2와 p가 같은 문자열로 겹쳐 시각적 회귀가 발생한다. 따라서 `*SectionTitle`은 p에 사용하고, 구간 h2("필요한 구간만 바로 보기")와 실습 h2("안전한 환경을 직접 설계하기")는 대응 스키마 필드가 없어 기존 문자열을 컴포넌트 기본값으로 유지했다.
2. **`keyPoints` 파생원 변경**: 지시서는 `segments.filter(required).length`(첫 영상 기준 4)로 파생하라고 했지만, 실제 표시되는 핵심 목록은 3개라 "핵심 4줄"처럼 표시 내용과 불일치한다. 표시 목록 자체를 `keyPoints` 상수 배열로 추출해 `keyPoints.length = 3` 기준으로 폴백 문구와 라우트 카드를 산출했다.
3. **라우트 카드 3번째 small 변경**: "안전 점검 실습"은 대응 데이터가 없어 `실습 ${practiceSteps.length}단계`(첫 영상: "실습 5단계")로 바뀌었다. 이것이 이번 작업의 유일한 시각적 변화다. 남겨두면 새 콘텐츠에서 "안전 점검 실습"이라는 엉뚱한 문구가 노출되므로 일반화를 위해 변경했다.
4. **`vitest.config.ts` 수정**: `LearningWorkspace`가 프로젝트에서 유일하게 `@/` 경로 별칭으로 import하는 컴포넌트라, 신규 컴포넌트 테스트가 이를 해석하지 못해 실패했다. vitest에 `@` → 프로젝트 루트 별칭을 추가했다(tsconfig paths와 동일한 대상).
5. **신규 테스트**: `lib/content/schema.test.ts`에 선택 필드 수용/공백 거부 케이스 1개, `components/LearningWorkspace.test.tsx` 신규 생성(폴백 렌더링 1개, 데이터 렌더링 1개).

## 2. 스키마에 추가된 필드 목록

`lib/content/schema.ts`의 `videoSchema`에 모두 `nonEmptyText.nullable().optional()`로 추가했다. 기존 콘텐츠는 필드가 없어도 파싱되므로 breaking change가 없다.

| 필드 | first-video.json에 채운 값 |
|---|---|
| `subtitle` | "14분 안에 코딩 에이전트의 구조와 안전한 권한 설정을 이해합니다." |
| `introDescription` | `null` (별도 인트로 설명문이 없는 기존 콘텐츠와 일치하는 값) |
| `summaryTitle` | "이 영상의 핵심 3줄" |
| `summarySectionTitle` | "이해하기" |
| `segmentsSectionTitle` | "골라 보기" |
| `practiceSectionTitle` | "직접 해보기" |

`introDescription`이 `null`인 이유: 현재 콘텐츠에는 `subtitle`과 별개의 더 긴 인트로 설명문이 없다. 지시서 완료조건의 "6개 값 채워짐" 중 5개는 실제 문자열, `introDescription`만 스키마가 허용하는 `null`이다. 값이 있으면 `value-copy`에서 `subtitle`보다 우선 표시된다.

## 3. 검증 명령 실행 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| 린트 | `npm run lint` | 통과, 종료 코드 0 |
| 타입체크 | `npm run typecheck` | 통과, `next typegen` 후 `tsc --noEmit`, 종료 코드 0 |
| 단위 테스트 | `npm test` | 17개 파일 133개 테스트 통과(신규 3개 포함), 종료 코드 0 |
| 프로덕션 빌드 | `npm run build -- --webpack` | 성공, `/learn/first-video` SSG 프리렌더 유지, 종료 코드 0 |
| E2E | `npm run test:e2e -- --reporter=line` | 14개 통과, 종료 코드 0 |
| diff 형식 | `git diff --check` | 통과, 종료 코드 0 (LF→CRLF 안내 경고만 출력) |
| 시각적 회귀 | `/learn/first-video` 스크린샷 비교 (TASK-013 대비) | 라우트 카드 3번째 small("안전 점검 실습"→"실습 5단계")만 변경, 인트로·통계·요약·구간·실습·MDX·사이드 노트 모두 동일 |

스크린샷: `docs/tasks/screenshots/task-014-learn-desktop.png`, `task-014-learn-mobile.png`

## 4. 커밋 해시

- `6920662` (`refactor: 학습 워크스페이스 문구를 콘텐츠 데이터 기반으로 일반화`), 7개 파일 변경, 257 insertions(+), 6 deletions(-)
- 본 결과서와 스크린샷은 별도 `docs:` 커밋으로 반영한다.

## 5. 남은 이슈

- 구간 h2("필요한 구간만 바로 보기")와 실습 h2("안전한 환경을 직접 설계하기")는 대응 스키마 필드가 없어 컴포넌트 기본값으로 유지된다. 콘텐츠별 h2 변경이 필요해지면 `segmentsTitle`, `practiceTitle` 필드 추가가 필요하다.
- `keyPoints` 3개 문장은 여전히 컴포넌트 상수다. 콘텐츠별 핵심 목록을 JSON으로 넣으려면 별도 필드 추가가 필요하다(지시서가 이번 범위에서 필드 추가 대신 파생을 선택한 부분).
- `value-copy` 폴백 문장은 지시서 지정대로 조사 "을"이 고정돼 있다("…방법을 이해합니다"). 제목이 "를"을 요구하면 문장이 부자연스러워질 수 있다.
- 헤더 내비게이션("핵심/구간/실습"), `context-label`("오늘의 바이브코딩 학습"), 히어로 버튼("필수 구간부터 보기", "3줄 핵심 먼저 읽기"), 사이드 노트 요약 문구, 푸터 문구는 지시서 9곳 범위 밖이라 하드코딩으로 남아 있다.
