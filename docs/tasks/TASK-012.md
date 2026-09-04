# TASK-012: 문서 정리 및 타입 생성 안내 추가

## 목표

TASK-011 리뷰에서 도출된 즉시 처리 가능한 정리 작업 4가지를 한 커밋으로 완료한다.

1. `.gitignore`에 `docs/.obsidian/` 추가 (개인 설정 파일 제외)
2. `README.md` 신규 생성: 프로젝트 개요, 기술 스택, **타입 생성 필수 실행 안내** 포함
3. `TASK-011-RESULT.md`에 `playwright.config.ts` 변경 diff 보완
4. 커밋: `chore: docs/.obsidian 무시 및 타입 생성 안내 추가`

## 배경

TASK-011 완료 후 리뷰에서 다음 개선 사항이 도출됐다:

- `docs/.obsidian/workspace.json`이 커밋에 포함됨 → `.gitignore`에 추가 필요
- `next-env.d.ts`가 Git에서 제외됐으나 신규 클론 시 `next typegen` 필수 실행임을 문서화 필요
- TASK-011 결과서에 실제 설정 변경 diff가 없어 리뷰 시 참고 어려움
- README 파일이 없어 프로젝트 진입점 부재

## 요구사항

### 1. `.gitignore` 수정

- `docs/.obsidian/` 라인 추가
- 기존 항목과 알파벳 순서 유지 권장

### 2. `README.md` 신규 생성

다음 섹션 포함:

- **프로젝트 개요**: YouTube 학습 관리 로컬 웹앱 (한 줄 + 2-3줄 설명)
- **기술 스택**: 표 형태 (Next.js 16, React 19, TypeScript, Tailwind 4, Vitest, Playwright, Zod, localStorage)
- **Type Generation** (핵심):
  - `next-env.d.ts`가 생성 파일로 Git 제외됨 설명
  - `npm run typecheck` 실행 시 내부적으로 `next typegen && tsc --noEmit` 수행됨 안내
  - 신규 클론 시 반드시 `npm run typecheck` 먼저 실행할 것 강조
- **개발 명령어**: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e` 표 또는 리스트
- **환경변수**: `YOUTUBE_API_KEY` 설정 안내 (`.env.example` 참조)

### 3. `TASK-011-RESULT.md` diff 보완

섹션 7(변경 파일 목록) 아래 또는 별도 섹션(예: "부록: 설정 변경 상세")에 `playwright.config.ts` 변경 전/후 diff 추가:

```diff
 import { defineConfig, devices } from "@playwright/test";

+const e2ePort = 3300;
+const baseURL = `http://localhost:${e2ePort}`;
+
 export default defineConfig({
   testDir: "./e2e",
   expect: { timeout: 15_000 },
   fullyParallel: false,
   forbidOnly: Boolean(process.env.CI),
   retries: process.env.CI ? 2 : 0,
   reporter: "html",
   workers: 1,
   use: {
-    baseURL: "http://localhost:3100",
+    baseURL,
     screenshot: "only-on-failure",
     trace: "retain-on-failure",
   },
   projects: [
     {
       name: "chromium",
       use: { ...devices["Desktop Chrome"] },
     },
   ],
   webServer: {
-    command: "npm run dev -- --hostname localhost --port 3100",
+    command: `npm run dev -- --hostname localhost --port ${e2ePort}`,
     env: {
       ...process.env,
       NEXT_DIST_DIR: ".next-e2e",
     },
-    url: "http://localhost:3100",
+    url: baseURL,
-    reuseExistingServer: !process.env.CI,
+    reuseExistingServer: false,
     timeout: 120_000,
   },
 });
```

### 4. 커밋

- 메시지: `chore: docs/.obsidian 무시 및 타입 생성 안내 추가`
- 변경 파일 3개: `.gitignore`, `README.md`, `docs/tasks/TASK-011-RESULT.md`

## 작업 범위

### 포함

- `.gitignore` 수정
- `README.md` 신규 생성
- `docs/tasks/TASK-011-RESULT.md` 수정 (diff 추가)
- 커밋 수행

### 제외

- 제품 코드 변경 (`components/`, `lib/`, `app/` 등)
- 테스트 코드 변경
- CI 워크플로 변경
- 기타 문서 변경

## 작업 절차

### 1. 사전 확인

- `git status --short`로 현재 상태 확인
- 기존 `TASK-011-RESULT.md` 읽어 diff 추가 위치 확인

### 2. 구현

순서대로 수행:

1. `.gitignore`에 `docs/.obsidian/` 추가
2. `README.md` 작성
3. `TASK-011-RESULT.md`에 diff 섹션 추가
4. `git add . && git commit -m "chore: docs/.obsidian 무시 및 타입 생성 안내 추가"`

### 3. 검증

| 검증 | 명령 | 기대 결과 |
|---|---|---|
| 변경 파일 확인 | `git status --short` | 변경 파일 3개 + 결과서 |
| 린트 | `npm run lint` | 통과, 종료 코드 0 |
| 타입체크 | `npm run typecheck` | 통과, 종료 코드 0 |
| diff 형식 | `git diff --check` | 통과, 종료 코드 0 |

### 4. 결과 기록

`docs/tasks/TASK-012-RESULT.md`에 다음 형식으로 기록:

1. 수행한 작업 요약 (불릿 3-4개)
2. 변경 파일별 diff 요약
3. 검증 명령 실행 결과 (표 형태)
4. 커밋 해시
5. 남은 작업/이슈 (없으면 "없음" 명시)

## 완료조건

- [ ] `.gitignore`에 `docs/.obsidian/` 추가됨
- [ ] `README.md` 생성됨 (필수 섹션 모두 포함)
- [ ] `TASK-011-RESULT.md`에 `playwright.config.ts` diff 추가됨
- [ ] 커밋 완료 (`chore: docs/.obsidian 무시 및 타입 생성 안내 추가`)
- [ ] `npm run lint` 통과
- [ ] `npm run typecheck` 통과
- [ ] `git diff --check` 통과
- [ ] `TASK-012-RESULT.md` 작성 완료

## 예상 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `.gitignore` | `docs/.obsidian/` 라인 추가 |
| `README.md` | 신규 생성 (프로젝트 개요, 기술 스택, Type Generation, 개발 명령어, 환경변수) |
| `docs/tasks/TASK-011-RESULT.md` | playwright.config.ts 변경 diff 추가 |
| `docs/tasks/TASK-012-RESULT.md` | 본 작업 결과서 신규 생성 |

## 결과 보고 형식

1. 수행한 작업 요약 (불릿 3-4개)
2. 변경 파일별 diff 요약
3. 검증 명령 실행 결과 표
4. 커밋 해시
5. 남은 작업/이슈
