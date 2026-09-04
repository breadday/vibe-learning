# TASK-013 결과서: 검수 콘텐츠 페이지 연결

## 1. 구현한 라우트 및 컴포넌트 변경 요약

- **`app/learn/[slug]/page.tsx` 신규 생성**: `loadReviewedContent(slug)`로 JSON을 로드하고 없으면 `notFound()`로 404 처리한다. `generateStaticParams`는 `content/` 디렉터리를 스캔해 검수 완료 슬러그를 반환하고, `generateMetadata`로 제목·설명·OG 태그를 설정한다. `export const dynamic = "force-static"`으로 빌드 시 미리 렌더링된다(빌드 결과에서 `/learn/first-video`가 SSG로 프리렌더링됨을 확인).
- **`lib/content/loadReviewedContent.ts` 신규 생성**: `fs/promises`로 `content/{slug}.json`을 읽고 `videoContentSchema.parse()`로 검증한다. `content/reviewed/{slug}.mdx`는 try/catch로 선택적으로 읽어 `mdxContent` 문자열로 병합 반환한다. 슬러그 패턴 검사로 경로 탈출을 차단하고, `verificationStatus !== "reviewed"`인 콘텐츠는 `null`을 반환해 미검수 콘텐츠가 페이지로 노출되지 않게 했다. 같은 파일에 홈 섹션용 `listReviewedContent()`를 함께 제공한다.
- **`components/LearningWorkspace.tsx` 수정**: `mdxContent?: ReactNode` prop을 추가하고 영상 플레이어 섹션 뒤에 `<section className="mdx-section">`으로 렌더링한다.
- **`app/page.tsx` 수정**: 서버 컴포넌트에서 `listReviewedContent()`로 검수 콘텐츠를 나열해 `LearningLibrary` 위에 "추천 학습 콘텐츠" 섹션을 추가했다. 썸네일(`i.ytimg.com/vi/{youtubeId}/hqdefault.jpg`), 제목, 채널·길이, "학습 시작 →" 링크(`/learn/{slug}`)를 표시하고, 검수 콘텐츠가 없으면 섹션 자체를 렌더링하지 않는다.
- **`app/globals.css` 수정**: `mdx-components.tsx`가 매핑하는 `section-title`, `body-copy`, `summary-list` 클래스와 `mdx-section` 레이아웃 스타일을 추가했다(기존에 스타일이 없어 MDX 렌더링 시 스타일 미적용 상태였음). 800px 이하 반응형 포함.
- **`mdx.d.ts` 신규 생성**: `.mdx` 모듈의 타입 선언(지시서 예상 파일에 없으나 TS 컴파일에 필요).
- **`lib/content/loadReviewedContent.test.ts` 신규**: 알려진 슬러그 로드+MDX 병합, 미지 슬러그 `null`, 경로 탈출 슬러그 `null`, 목록 필터링을 검증한다.
- **`e2e/learn-page.spec.ts` 신규**: 홈 링크 클릭 → `/learn/first-video` 이동 → MDX 본문·3단계 플로우 표시 검증과 미지 슬러그 404를 자동화했다(지시서의 "수동 확인" 항목).

### 지시서 대비 기술 선택을 보정한 부분

1. **MDX 렌더링 방식**: 지시서는 `@mdx-js/react`의 `MDXRemote` 또는 `{@html}`을 언급했지만, `MDXRemote`는 미설치 의존성이고 `{@html}`은 React 문법이 아니다. 설치된 `@next/mdx` 파이프라인을 그대로 사용해, 페이지에서 `.mdx` 파일을 **정적 import로 빌드 타임 컴파일**한 뒤 렌더링된 ReactNode를 `LearningWorkspace`에 전달하는 방식으로 구현했다. 슬러그→MDX 컴포넌트 매핑은 페이지의 `reviewedMdx` 레지스트리에서 관리한다. 이 방식은 런타임 컴파일·`dangerouslySetInnerHTML`이 없어 "콘텐츠를 inert 텍스트로 취급"하는 보안 원칙에도 부합한다.
2. **`mdxContent` prop 타입**: 지시서는 `string`을 명시했지만 위 렌더링 방식에 맞춰 `ReactNode`로 정의했다. 로더는 지시서대로 `mdxContent: string`을 반환하며(단위 테스트가 문자열 병합을 검증), 렌더링 경로와 데이터 경로를 분리했다.
3. **`generateStaticParams`**: 지시서 예시의 하드코딩(`['first-video']`) 대신 `listReviewedContent()` 동적 스캔으로 구현했다. 지시서가 "향후 glob으로 동적화 가능"으로 남긴 부분이다.
4. **`PageProps<'/learn/[slug]'>` 사용**: 설치된 Next.js 16 문서 기준으로 `params`는 Promise이며, 전역 `PageProps` 헬퍼로 타이핑했다.

## 2. 홈 페이지 섹션 스크린샷

- 데스크톱(1280px): `docs/tasks/screenshots/task-013-home-desktop.png`
- 모바일(360px): `docs/tasks/screenshots/task-013-home-mobile.png` — 히어로 아래 "추천 학습 콘텐츠" 섹션에 썸네일, 검수 완료 배지, 제목, "코드깎는노인 · 14분", "학습 시작 →" 링크가 세로 1단 카드로 표시되고 가로 오버플로 없음

## 3. `/learn/first-video` 렌더링 확인 스크린샷

- 데스크톱(1280px): `docs/tasks/screenshots/task-013-learn-desktop.png` — 영상 플레이어, MDX 본문("이 영상을 볼 가치", "핵심 요약" 체크 리스트), 3단계 플로우(핵심/구간/실습), 사이드 노트가 모두 표시됨
- 모바일(360px): `docs/tasks/screenshots/task-013-learn-mobile.png`

## 4. 검증 명령 실행 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| 린트 | `npm run lint` | 통과, 종료 코드 0 |
| 타입체크 | `npm run typecheck` | 통과, `next typegen` 후 `tsc --noEmit`, 종료 코드 0 |
| 단위 테스트 | `npm test` | 16개 파일 130개 테스트 통과(신규 4개 포함), 종료 코드 0 |
| 프로덕션 빌드 | `npm run build -- --webpack` | 성공, `/learn/first-video`가 `generateStaticParams` 기반 SSG로 프리렌더링, 종료 코드 0 |
| E2E | `npm run test:e2e -- --reporter=line` | 14개 통과(신규 2개 포함), 종료 코드 0 |
| diff 형식 | `git diff --check` | 통과, 종료 코드 0 (LF→CRLF 안내 경고만 출력) |
| 수동 확인 | `npm run dev` → `/learn/first-video` 접속, 홈 링크 클릭 | E2E `learn-page.spec.ts`로 자동 검증 + 스크린샷 4장으로 육안 확인 |

## 5. 커밋 해시

- `f1da7a7` (`feat: 검수 학습 콘텐츠 페이지 연결`), 9개 파일 변경, 379 insertions(+), 3 deletions(-)
- 본 결과서와 스크린샷은 별도 `docs:` 커밋으로 반영한다.

## 6. 남은 이슈

- `LearningWorkspace`의 "이 영상의 핵심 3줄", "필수 구간 4개", "안전 점검 실습" 등 일부 카피와 `route-card` 학습 순서는 `first-video`에 맞춘 하드코딩이다. 새 검수 콘텐츠를 추가하면 JSON 기반 일반화가 필요하다. 기존 컴포넌트 카피 변경은 지시서 제외 범위라 이번 작업에서 손대지 않았다.
- MDX 본문은 슬러그→컴포넌트 수동 레지스트리(`reviewedMdx`) 방식이라, 콘텐츠 추가 시 `app/learn/[slug]/page.tsx`에 import와 매핑 한 줄을 추가해야 한다.
- 홈 "추천 학습 콘텐츠" 섹션 위치는 지시서가 허용한 선택지 중 `LearningLibrary` 위로 정했다. 순서 변경이 필요하면 `app/page.tsx`에서 섹션 위치만 옮기면 된다.
