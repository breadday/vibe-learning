# TASK-017 결과서: 두 번째 영상 추가로 아키텍처 검증 (난이도 상)

## 1. second-video 콘텐츠와 검증된 메타데이터 출처

AGENTS.md의 콘텐츠 무결성 규칙(메타데이터·타임스탬프 지어내기 금지)에 따라, 실제 존재하는 YouTube 영상을 선택하고 메타데이터를 소스에서 직접 확인했다.

| 항목 | 값 | 확인 방법 |
|---|---|---|
| youtubeId | `Q_oL9yY-ZTM` | watch 페이지 URL |
| title | 코딩 왕초보가 커서 AI로 돈 버는 블로그 만들기 풀코스 전편 몰아보기 | YouTube oEmbed API 응답 |
| channel | 콜잇 AI \| Cole IT AI | YouTube oEmbed API 응답 |
| publishedAt | 2025-10-13 | watch 페이지 `publishDate` 메타데이터 |
| durationSeconds | 3283 (54:43) | watch 페이지 `lengthSeconds` |
| 구간 타임스탬프 | 제작자가 영상 설명에 남긴 챕터 목록(00:00~50:45) | watch 페이지 `shortDescription` |

- 구간 4개는 제작자 제공 챕터 경계(08:15, 19:40, 35:10, 50:45)를 그대로 사용해 required 2 / optional 1 / reference 1로 구성했다. 스키마 제한(필수 ≤5, 선택 ≤3, 비겹침, 길이 이내)을 모두 만족한다.
- keyPoints 4개, practiceSteps 3개, concepts 6개, copyBlocks 2개, warnings 3개는 영상 설명의 챕터 소개 문구에 근거해 작성했고, 확인 범위의 한계는 `warnings[0]`("구간과 요약은 제작자 챕터 정보 기준…")과 `freshness.reason`(status `review-needed`)에 명시했다.
- sources는 원본 영상 + Cursor/Vercel/Supabase 공식 문서 URL이다.

### 지시서 대비 보정한 부분

1. **JSON 위치**: 지시서의 `lib/content/second-video.json` 대신 저장소 컨벤션(`loadReviewedContent.ts`가 `content/*.json`을 자동 탐색)에 따라 `content/second-video.json`에 두었다. `lib/content/first-video.ts`는 어디에서도 import되지 않는 미사용 모듈이므로 second-video용 직접 import 모듈은 만들지 않았다(번들 경량화 목적과도 일치).
2. **등록 방식**: `lib/content/index.ts`는 존재하지 않고 로더(`loadReviewedContent.ts`)가 콘텐츠 디렉터리를 자동 탐색하므로 별도 등록이 불필요했다. 라우트 등록은 `app/learn/[slug]/page.tsx`의 `reviewedMdx` 맵에 `second-video` MDX를 추가하는 것으로 충분했고, `/learn/[slug]` 동적 라우트 + `generateStaticParams` 덕분에 라우트 복제 없이 `/learn/second-video`가 SSG 프리렌더된다.
3. **로더 정렬 추가**: `listReviewedContent()`가 slug를 정렬하도록 보강했다(홈 추천 카드·SSG 파라미터 순서를 결정적으로 만들기 위함, 기존 e2e가 첫 카드 → first-video를 단언하므로 필요).

## 2. LearningWorkspace.tsx 수정 0줄 검증 (핵심 규칙)

`git diff -- components/LearningWorkspace.tsx` 결과 **0줄**(파일 자체가 변경 목록에 없음). TASK-014~016에서 `video.* ?? fallback` 형태로 일반화한 덕분에 second-video 추가에 컴포넌트 수정이 전혀 필요하지 않았고, 스키마 필드 추가도 불필요했다(6개 신규 필드 + 이전 필드로 모든 문구 커버).

## 3. localStorage 사용량 체크 로직 (`lib/storage/learningStore.ts`)

- 상수: `learningStorageQuotaBytes` (5MB 근사), `learningStorageWarningRatio` (0.8)
- `measureLearningStorageUsage()`: 저장된 스토어 원문을 `Blob` 크기로 측정해 `{ bytes, quotaBytes, usedRatio, overThreshold }` 반환 (SSR/접근 실패 시 null)
- `checkLearningStorageUsage()`: 임계치(80%) 초과 시 `console.warn` + `learningStoreWarningEvent` 커스텀 이벤트 발행(참조용 `LearningStorageUsage` detail)
- `saveLearningStore()` 저장 성공 직후 체크를 호출해 용량 초과 경고가 자동 발생한다. UI 배너 연결은 이벤트를 구독하는 방식으로 후속 과제에서 붙일 수 있다.
- 스토리지 테스트 3개 추가: 빈 스토어 0바이트 + 정상 저장 시 미경고, 임계치 초과 플래그, 대형 스토어 저장 시 이벤트+콘솔 경고 1회.

## 4. 검증 명령 실행 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| 린트 | `npm run lint` | 통과, 종료 코드 0 |
| 타입체크 | `npm run typecheck` | 통과, 종료 코드 0 |
| 단위 테스트 | `npm test` | 17개 파일 139개 테스트 통과(신규 5개 포함), 종료 코드 0 |
| 프로덕션 빌드 | `npm run build -- --webpack` | 성공, `/learn/second-video` SSG 프리렌더 확인, 종료 코드 0 |
| E2E | `npm run test:e2e -- --reporter=line` | 15개 통과(신규 1개 포함), 종료 코드 0 |
| diff 형식 | `git diff --check` | 통과, 종료 코드 0 (LF→CRLF 안내 경고만 출력) |
| LearningWorkspace | `git diff -- components/LearningWorkspace.tsx` | 0줄 |

## 5. 메모리 체크 (번들 크기 10% 이상 증가 금지)

| 측정 대상 | 이전 (first-video만) | 이후 (second-video 추가) | 증가율 |
|---|---|---|---|
| 클라이언트 정적 청크 (`.next/static`) | 1,049,088B | 1,049,916B | **+0.08%** |
| 서버 출력 (`.next/server`) | 1,418,081B | 1,501,146B | **+5.86%** |

- 클라이언트 번들은 사실상 불변: 콘텐츠는 빌드 시 fs로 읽어 SSG HTML에 포함되므로 JS 번들에 들어가지 않는다.
- 서버 출력 증가분은 `/learn/second-video` 프리렌더 HTML·RSC 페이로드 1페이지 분량이다.
- 두 지표 모두 10% 이내로, 메모리/번들 조건을 충족한다.

## 6. 완료 조건

- [x] second-video.json 생성, 모든 필드 채움 (TASK-015/016 필드 19종 전부 non-null)
- [x] /learn/first-video 와 /learn/second-video 둘 다 정상 렌더링 (E2E 신규 테스트로 확인)
- [x] LearningWorkspace.tsx diff 0줄
- [x] 테스트: second-video 로드 테스트 2개 추가 (`loadReviewedContent.test.ts` — 메타데이터·개수 차이 단언, 두 슬러그 동시 서빙·고유 문구 단언)

## 7. 커밋

- 구현: `feat: 두 번째 영상 추가로 학습 워크스페이스 일반화 검증`
- 결과서: 별도 `docs:` 커밋으로 반영

## 8. 남은 이슈

- second-video의 구간·요약은 제작자 제공 챕터 정보 기반이므로, 본문 대조(자막/본편 시청)에 의한 2차 검수가 필요하면 `freshness`를 갱신해야 한다.
- localStorage 경고는 로직+이벤트까지만 구현했다. 사용자에게 보이는 UI 배너 연결은 별도 과제로 남긴다.
- `LearningWorkspace.tsx`의 `STEP_COUNT = 3` 모듈 상수는 여전히 콘텐츠별 단계 수를 반영하지 않는다(TASK-016 결과서에서 지적된 사항 유지).
