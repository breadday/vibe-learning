# TASK-015 결과서: 잔여 하드코딩 제거

## 1. 대체한 하드코딩 위치와 방식 요약

`components/LearningWorkspace.tsx`의 잔여 하드코딩을 데이터/상수 기반으로 대체했다.

| 위치 | 이전 | 이후 |
|---|---|---|
| 구간 섹션 h2 | "필요한 구간만 바로 보기" (인라인) | `video.segmentsTitle ?? "필요한 구간만 바로 보기"` |
| 실습 섹션 h2 | "안전한 환경을 직접 설계하기" (인라인) | `video.practiceTitle ?? "안전한 환경을 직접 설계하기"` |
| 핵심 목록(`key-points` ul) | 컴포넌트 상수 `keyPoints` 3문장 직접 렌더링 | `video.keyPoints ?? defaultKeyPoints` — 요약 h2 폴백(`핵심 ${keyPoints.length}줄`)과 라우트 카드 small도 같은 파생값 사용 |
| 인트로 `context-label` | "오늘의 바이브코딩 학습" (인라인) | `video.contextLabel ?? "오늘의 바이브코딩 학습"` |
| 헤더 내비게이션 | "핵심/구간/실습" 고정 a 3개 | `video.navItems ?? defaultNavItems` map 렌더링 |
| 히어로 기본 버튼 | "필수 구간부터 보기" (인라인) | `video.heroPrimaryCta ?? "필수 구간부터 보기"` (동작 유지) |
| 히어로 보조 링크 | "3줄 핵심 먼저 읽기" (인라인) | `video.heroSecondaryCta ?? "3줄 핵심 먼저 읽기"` (동작 유지) |
| `value-copy` 폴백 | `"${분}분 안에 ${video.title}을 이해합니다."` | `"${분}분 안에 ${video.title} 이해하기"` (조사 제거) |

기존 상수는 `defaultKeyPoints`, `defaultNavItems`로 이름을 붙여 폴백으로 유지했다. JSON 값이 없는 콘텐츠에서도 렌더링이 깨지지 않는다.

## 2. 스키마에 추가된 필드 목록과 first-video.json 값

`lib/content/schema.ts`의 `videoSchema`에 7개 필드 추가. `keyPoints`는 `z.array(nonEmptyText).nullable().optional()`, `navItems`는 `z.array(z.object({ label, href }).strict()).nullable().optional()`, 나머지 5개는 `nonEmptyText.nullable().optional()`.

| 필드 | first-video.json 값 |
|---|---|
| `segmentsTitle` | "필요한 구간만 바로 보기" |
| `practiceTitle` | "안전한 환경을 직접 설계하기" |
| `keyPoints` | 기존 핵심 3문장 그대로 |
| `contextLabel` | "오늘의 바이브코딩 학습" |
| `navItems` | [핵심→#summary, 구간→#segments, 실습→#practice] |
| `heroPrimaryCta` | "필수 구간부터 보기" |
| `heroSecondaryCta` | "3줄 핵심 먼저 읽기" |

모든 값이 기존 렌더링 문구와 동일하므로 first-video 화면은 변화가 없다.

## 3. 검증 명령 실행 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| 린트 | `npm run lint` | 통과, 종료 코드 0 |
| 타입체크 | `npm run typecheck` | 통과, `next typegen` 후 `tsc --noEmit`, 종료 코드 0 |
| 단위 테스트 | `npm test` | 17개 파일 133개 테스트 통과, 종료 코드 0 |
| 프로덕션 빌드 | `npm run build -- --webpack` | 성공, `/learn/first-video` SSG 프리렌더 유지, 종료 코드 0 |
| E2E | `npm run test:e2e -- --reporter=line` | 14개 통과, 종료 코드 0 |
| diff 형식 | `git diff --check` | 통과, 종료 코드 0 (LF→CRLF 안내 경고만 출력) |
| 시각적 회귀 | `/learn/first-video` 스크린샷 SHA256 비교 (TASK-014 결과 대비) | 데스크톱·모바일 모두 해시 완전 일치(`63FD011E…`, `B7C1490C…`) — 픽셀 단위 동일, 회귀 없음 |

스크린샷: `docs/tasks/screenshots/task-015-learn-desktop.png`, `task-015-learn-mobile.png` (TASK-014 스크린샷과 해시 동일)

테스트 보강 내용:
- `lib/content/schema.test.ts`: 신규 7개 필드 수용 케이스 확장, 공백 `subtitle` 거부에 더해 공백 `navItems.label` 거부와 `href` 누락 항목 거부 추가
- `components/LearningWorkspace.test.tsx`: 폴백 문구 변경 반영("10분 안에 테스트 영상 이해하기"), 폴백 시 기본 h2·contextLabel·내비·히어로 CTA·기본 keyPoints 렌더링 단언 추가, 데이터 제공 시 JSON 문구 사용과 기본 keyPoints 미사용(`queryByText` null) 단언 추가

## 4. 커밋 해시

- `1c2f89b` (`refactor: 학습 워크스페이스 잔여 문구 및 keyPoints 콘텐츠화`), 6개 파일 변경, 235 insertions(+), 10 deletions(-)
- 본 결과서와 스크린샷은 별도 `docs:` 커밋으로 반영한다.

## 5. 남은 이슈

- 여전히 컴포넌트에 하드코딩으로 남은 문구(지시서의 범위 밖 항목): 푸터, 사이드 노트 요약 4종, `learning-stats` 라벨 3종, 라우트 카드 제목 "오늘의 학습 순서", 세그먼트 카드 "이 구간 보기 →", 실습 프롬프트 라벨, 검수 기준 문구, 세그먼트 유형 라벨(필수/선택/참고). 콘텐츠별 변경이 필요해지면 별도 필드 추가로 확장할 수 있다.
- `value-copy` 폴백의 "N분 안에" 접두는 유지했다. 폴백 문구 전체를 데이터로 바꾸려면 별도 필드가 필요하다.
- 내비게이션 `href`는 고정 섹션 앵커를 전제로 한다. 섹션 구조가 바뀌면 `navItems` 기본값과 앵커를 함께 갱신해야 한다.
