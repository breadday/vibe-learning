# vibe-learning

YouTube 영상을 보고 끝내지 않고 개인 학습 자료로 남기기 위한 로컬 우선 웹 앱입니다.

로그인과 데이터베이스 없이 한 브라우저에서 사용합니다. YouTube 주소(일반 영상, 단축 URL, Shorts, embed 포함)를 입력하면 공식 YouTube Data API에서 제목을 가져오고, 조회 실패 시 직접 입력할 수 있습니다. 영상, 학습 상태, 메모는 브라우저 `localStorage`에만 저장되며 서버로 전송되지 않습니다. 자세한 설계와 개발 가이드는 `docs/`를 참고하세요.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| 언어 | TypeScript 5 |
| 검증 | Zod 4 |
| 저장 | 브라우저 `localStorage` |
| 테스트 | Vitest, Testing Library, Playwright |
| 콘텐츠 | MDX, JSON |

## Type Generation (신규 클론 시 필수)

`next-env.d.ts`는 Next.js가 생성하는 파일이므로 Git에서 제외되어 있습니다. 신규 클론 직후에는 이 파일이 디스크에 존재하지 않습니다.

`npm run typecheck`은 내부적으로 `next typegen && tsc --noEmit`을 실행하므로, 타입 검사 전에 생성 파일을 자동으로 준비합니다.

> **신규 클론 후에는 `npm ci` 다음에 반드시 `npm run typecheck`을 먼저 실행하세요.** 이 단계 없이 `tsc`를 직접 실행하면 생성 타입이 없어 오류가 발생합니다.

## 개발 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 (`http://localhost:3000`) |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint 검사 |
| `npm run typecheck` | `next typegen` 후 `tsc --noEmit` 타입 검사 |
| `npm test` | Vitest 단위·컴포넌트 테스트 |
| `npm run test:e2e` | Playwright E2E 테스트 (Chromium) |

## 환경변수

제목 자동 조회에는 `YOUTUBE_API_KEY`가 필요합니다. 루트의 `.env.example`을 참고해 프로젝트 루트의 `.env.local`에 설정하세요. 실제 키는 Git에 커밋하지 마세요.

- API 키 발급 절차와 키 제한 권장 설정은 `docs/04_설치및실행.md`를 참고하세요.
- 키가 없거나 조회가 실패해도 제목을 직접 입력해 영상을 등록할 수 있습니다.
- 테스트와 빌드는 실제 키와 외부 API 없이 동작합니다.
