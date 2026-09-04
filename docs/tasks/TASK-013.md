# TASK-013: 검수 콘텐츠 페이지 연결

## 목표

`content/first-video.json`과 `content/reviewed/first-video.mdx`로 구성된 검수 완료 학습 콘텐츠를 실제 페이지에서 접근 가능하게 연결한다. 현재 `LearningWorkspace` 컴포넌트와 로더, 스키마는 모두 구현돼 있으나 어떤 라우트에서도 사용되지 않는다(`docs/01_프로젝트개요.md:53`에 미완성으로 기록됨).

다음 3가지를 구현한다:
1. **검수 콘텐츠 전용 라우트** `/learn/[slug]` 신규 생성 — `LearningWorkspace`로 렌더링
2. **홈 페이지 연결** — "추천 학습 콘텐츠" 섹션 추가해 진입 링크 제공
3. **콘텐츠 로더 확장** — 슬러그 기반으로 `content/` 디렉터리에서 JSON/MDX 동시 로드

## 배경

- `content/first-video.json`: 구조화된 학습 데이터 (세그먼트, 실습, 프롬프트, 개념, 주의사항, 출처 등)
- `content/reviewed/first-video.mdx`: 마크다운 본문 (이 영상을 볼 가치, 핵심 요약)
- `lib/content/first-video.ts`: JSON 로드 및 zod 검증 (`videoContentSchema.parse`)
- `lib/content/schema.ts`: `VideoContent` 타입과 스키마 정의
- `components/LearningWorkspace.tsx`: 검수 콘텐츠 전용 UI (영상 플레이어, 3단계 학습 플로우, 사이드 노트)
- `components/LearningVideoDetail.tsx`: 사용자 등록 영상용 상세 (별도 컴포넌트)

두 콘텐츠 타입(사용자 등록 vs 검수 완료)은 데이터 구조와 UI가 다르므로 라우트도 분리한다.

## 요구사항

### 1. 검수 콘텐츠 라우트 `/learn/[slug]`

- **파일**: `app/learn/[slug]/page.tsx` 신규 생성
- **동작**:
  1. `params.slug`로 `content/{slug}.json` 로드 시도
  2. 없으면 404 (`notFound()`)
  3. `content/reviewed/{slug}.mdx`도 로드 시도 (선택적, 없으면 빈 문자열)
  4. 두 데이터를 합쳐 `LearningWorkspace`에 전달
- **데이터 병합**: JSON의 `video`, `segments`, `practiceSteps` 등 + MDX의 본문(`content` 필드에 추가)
- **메타데이터**: `generateMetadata`로 제목, 설명, OG 태그 설정
- **정적 생성**: `export const dynamic = 'force-static'` (빌드 시 미리 렌더링)

### 2. 홈 페이지 "추천 학습 콘텐츠" 섹션

- **위치**: `app/page.tsx`의 `LearningLibrary` 위 또는 아래
- **내용**: `content/` 디렉터리의 `verificationStatus === "reviewed"`인 파일들 나열
- **표시**: 썸네일, 제목, 채널, 길이, "학습 시작" 버튼 → `/learn/{slug}`
- **빈 상태**: 검수 콘텐츠 없으면 섹션 숨김

### 3. 콘텐츠 로더 유틸리티

- **파일**: `lib/content/loadReviewedContent.ts` 신규 생성
- **함수**: `loadReviewedContent(slug: string): Promise<VideoContent & { mdxContent: string } | null>`
- **동작**:
  - `content/{slug}.json` 읽기 → zod 검증
  - `content/reviewed/{slug}.mdx` 읽기 (실패 시 빈 문자열)
  - 병합 반환
- **캐시**: 빌드 타임에만 실행되므로 별도 캐시 불필요

### 4. MDX 렌더링 (선택적)

- `content/reviewed/{slug}.mdx`를 `LearningWorkspace`에서 렌더링하려면 `@mdx-js/react` 사용
- `LearningWorkspace`에 `mdxContent?: string` prop 추가
- 본문 영역(예: "이 영상을 볼 가치" 섹션)에 렌더링

## 작업 범위

### 포함

| 파일 | 작업 |
|---|---|
| `app/learn/[slug]/page.tsx` | 신규 생성 — 검수 콘텐츠 상세 페이지 |
| `lib/content/loadReviewedContent.ts` | 신규 생성 — 슬러그 기반 로더 |
| `components/LearningWorkspace.tsx` | 수정 — `mdxContent` prop 추가 및 렌더링 |
| `app/page.tsx` | 수정 — 추천 학습 콘텐츠 섹션 추가 |
| `lib/content/schema.ts` | (필요 시) `mdxContent` 필드 추가 또는 별도 타입 |
| `content/first-video.json` | (참고용) 기존 데이터 확인 |

### 제외

- 사용자 등록 영상 라우트(`/videos/[id]`) 변경
- `LearningVideoDetail` 컴포넌트 변경
- 백업/복원, 제목 조회 등 기존 기능 변경
- 새 콘텐츠 추가 (기존 `first-video`만 대상)

## 작업 절차

### 1. 사전 확인

- `content/first-video.json`, `content/reviewed/first-video.mdx` 구조 재확인
- `LearningWorkspace` prop 인터페이스 확인
- `lib/content/first-video.ts` 로더 패턴 확인

### 2. 로더 유틸리티 생성

`lib/content/loadReviewedContent.ts` 작성:
- `fs/promises`로 파일 읽기 (Node.js 환경이므로 `import fs from 'fs/promises'`)
- 경로: `process.cwd() + '/content/{slug}.json'`
- JSON 파싱 → `videoContentSchema.parse()`
- MDX 읽기 → `try/catch`로 선택적 처리
- 병합 객체 반환

### 3. 라우트 페이지 생성

`app/learn/[slug]/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { loadReviewedContent } from '@/lib/content/loadReviewedContent';
import { LearningWorkspace } from '@/components/LearningWorkspace';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  // content/ 디렉터리 스캔해 reviewed 슬러그 반환
  const slugs = ['first-video']; // 향후 glob으로 동적화 가능
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = await loadReviewedContent(slug);
  if (!content) return { title: 'Not Found' };
  return {
    title: `${content.video.title} | Vibe Learning`,
    description: content.video.title,
    openGraph: { title: content.video.title, description: content.video.title },
  };
}

export default async function LearnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = await loadReviewedContent(slug);
  if (!content) notFound();
  return <LearningWorkspace content={content} mdxContent={content.mdxContent} />;
}
```

### 4. LearningWorkspace MDX 지원 추가

- `mdxContent?: string` prop 추가
- `@mdx-js/react`의 `MDXRemote` 또는 `{@html}`로 렌더링 (보안: 신뢰된 콘텐츠만)
- 적절한 위치(예: `intro-grid` 아래 또는 별도 섹션)에 배치

### 5. 홈 페이지 섹션 추가

`app/page.tsx`:
- `loadReviewedContent`를 `generateStaticParams` 패턴으로 미리 로드하거나, 클라이언트에서 `fetch`로 가져오기
- 서버 컴포넌트에서 `content/` 디렉터리 스캔 → reviewed만 필터링 → 링크 렌더링
- 썸네일: `https://i.ytimg.com/vi/{youtubeId}/hqdefault.jpg`

### 5. 검증

| 검증 | 명령 |
|---|---|
| 린트 | `npm run lint` |
| 타입체크 | `npm run typecheck` |
| 단위 테스트 | `npm test` |
| 빌드 | `npm run build -- --webpack` |
| E2E | `npm run test:e2e -- --reporter=line` |
| 수동 확인 | `npm run dev` → `/learn/first-video` 접속, 홈에서 링크 클릭 |

## 완료조건

- [ ] `/learn/first-video` 접속 시 `LearningWorkspace`로 렌더링됨
- [ ] 영상 플레이어, 3단계 플로우(핵심/구간/실습), 사이드 노트 모두 표시
- [ ] MDX 본문("이 영상을 볼 가치", "핵심 요약") 렌더링됨
- [ ] 홈 페이지에 "추천 학습 콘텐츠" 섹션 표시, 링크 클릭 시 `/learn/first-video` 이동
- [ ] 검수 콘텐츠 없으면 홈 섹션 숨김
- [ ] `npm run lint`, `typecheck`, `test`, `build`, `test:e2e` 모두 통과
- [ ] `git diff --check` 통과

## 예상 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `app/learn/[slug]/page.tsx` | 신규 생성 — 검수 콘텐츠 라우트 |
| `lib/content/loadReviewedContent.ts` | 신규 생성 — 슬러그 기반 로더 |
| `components/LearningWorkspace.tsx` | `mdxContent` prop 추가, MDX 렌더링 |
| `app/page.tsx` | 추천 학습 콘텐츠 섹션 추가 |
| `lib/content/schema.ts` | (필요 시) 타입 확장 |

## 결과 보고 형식

1. 구현한 라우트 및 컴포넌트 변경 요약
2. 홈 페이지 섹션 스크린샷 (모바일 360px 포함)
3. `/learn/first-video` 렌더링 확인 스크린샷
4. 검증 명령 실행 결과 표
5. 커밋 해시
6. 남은 이슈