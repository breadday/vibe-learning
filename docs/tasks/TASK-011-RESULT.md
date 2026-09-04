# TASK-011 결과서: Playwright E2E 서버 격리 및 생성 파일 오염 방지

## 1. 확인한 근본 원인

로컬 성공 결과가 현재 작업 트리를 검증했다는 보장이 약해진 원인과 `next-env.d.ts` 오염 원인을 각각 분리해 확인했다.

### 1-1. 기존 서버 재사용으로 인한 결과 오염

기존 `playwright.config.ts`는 아래처럼 설정되어 있었다.

```ts
reuseExistingServer: !process.env.CI,
```

- 로컬에서는 `reuseExistingServer`가 `true`가 된다.
- 따라서 `localhost:3100`에 이미 서버가 있으면 Playwright는 그 서버가 현재 코드·환경으로 실행됐는지 확인하지 않고 재사용한다.
- 이전 실행에서 종료되지 않고 남은 서버라면 전혀 다른 코드 상태를 검증하게 되고, 로컬 성공 결과가 현재 작업 트리를 검증했다는 보장이 약해진다.

### 1-2. `NEXT_DIST_DIR`로 인한 `next-env.d.ts` 오염

`playwright.config.ts`의 webServer env가 `NEXT_DIST_DIR: ".next-e2e"`를 설정하고 있고, `next.config.mjs`는 `distDir: process.env.NEXT_DIST_DIR ?? ".next"`를 사용한다.

Next.js의 `node_modules/next/dist/lib/typescript/writeAppTypeDeclarations.js`는 `next-env.d.ts`에 distDir 기반 typed-routes import를 무조건 쓴다.

```js
const routeTypesPath = path.posix.join(distDir, 'types/routes.d.ts');
lines.push(`import "./${routeTypesPath}";`);
const rootParamsTypesPath = path.posix.join(distDir, 'types/root-params.d.ts');
lines.push(`import "./${rootParamsTypesPath}";`);
```

따라서 E2E 서버를 `next dev`가 아닌 `.next-e2e`로 돌리면 `next-env.d.ts`의 참조가 `.next/dev`에서 `.next-e2e/dev`로 바뀌어 추적 파일에 diff가 생긴다. 이 동작을 설정으로 끌 수 있는 옵션은 없다.

### 1-3. `next-env.d.ts`는 원래 명령에 따라 달라지는 생성 파일

설치된 Next.js 16.3.2에서 확인한 결과 `next-env.d.ts`는 실행 명령에 따라 내용이 달라진다.

- `next dev`: `./.next/dev/types/routes.d.ts` 참조
- `next build`: `./.next/types/routes.d.ts` 참조

즉 distDir 오버라이드뿐 아니라 dev/build 구분만으로도 내용이 조금씩 바뀐다. Next.js 공식 문서도 `next-env.d.ts`를 생성 파일로 간주하고 `.gitignore`에 추가하고 Git에서 제거하라고 명시한다.

### 1-4. 재현

변경 전 설정 그대로 `npm run test:e2e -- --reporter=line`을 실행했다.

- Chromium 12개 테스트 통과, 종료 코드 0, 프로세스 정상 종료
- `git diff -- next-env.d.ts`: `.next/dev` → `.next-e2e/dev`로 변경됨 (오염 확인)

## 2. 적용한 서버 격리 방식과 선택 이유

`playwright.config.ts`를 아래처럼 수정했다.

```ts
import { defineConfig, devices } from "@playwright/test";

const e2ePort = 3300;
const baseURL = `http://localhost:${e2ePort}`;

export default defineConfig({
  // ... (기존 use/projects 설정 유지)
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname localhost --port ${e2ePort}`,
    env: {
      ...process.env,
      NEXT_DIST_DIR: ".next-e2e",
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
```

적용 항목과 이유는 다음과 같다.

1. `reuseExistingServer: false`로 통일
   - 로컬과 CI 모두 Playwright가 매번 새 서버를 시작하도록 했다.
   - 기존 서버를 재사용하지 않으므로 현재 작업 트리 검증 보장이 단단해진다.

2. E2E 전용 포트 `3300` 사용
   - 기존 E2E 포트(`3100`)와 분리해 이전 실행 세션의 서버가 있어도 E2E가 자체 서버를 띄울 수 있게 했다.
   - `e2ePort` 상수 하나로 `baseURL`과 `webServer.url`을 동일하게 맞춰 프록시·E2E 기대값 기준을 하나로 통일했다. 동적 포트가 아니라 고정 포트이므로 일관성 요건을 만족한다.

3. `NEXT_DIST_DIR: ".next-e2e"` 유지
   - 이 설정을 제거하면 E2E 서버가 개발 서버와 동일하게 `.next`를 공유하게 된다.
   - 실제로 이 설정을 잠시 제거했을 때, 이미 `.next`에서 실행 중인 `next dev`(포트 3000)가 있자 Next.js가 "Another next dev server is already running"으로 두 번째 서버 시작을 거부하며 E2E가 시작조차 못 했다.
   - 따라서 `.next-e2e`를 유지해 동시에 실행 중인 개발 서버와 빌드 출력을 완전히 격리한다.

4. `next-env.d.ts` 추적 해제 + `.gitignore` 추가
   - `docs/`의 공식 안내(생성 파일, `.gitignore` 추가·Git 제거 권장)와 위 소스 분석에 근거해 적용했다.
   - `git rm --cached next-env.d.ts`로 추적을 해제하고 `.gitignore`에 `next-env.d.ts`를 추가했다. 파일은 디스크에 그대로 남지만 Git에는 더 이상 오염되지 않는다.
   - 이로써 매번 수동복원(`git restore`)하던 방식을 영구적으로 없앴다. 테스트 뒤 자동 복원 명령은 사용하지 않았다.

5. 새 클론 타입 생성 경로 보완
   - 설치된 Next.js 문서는 타입 검사 전에 `next typegen`을 실행해 `next-env.d.ts`와 route types를 생성하라고 안내한다.
   - `npm run typecheck`를 `next typegen && tsc --noEmit`으로 변경해 로컬과 CI 모두 새 클론에서도 같은 순서로 타입을 검사하도록 했다.
   - CI 단계 이름도 `Generate Next.js types and type check`로 바꿔 생성 단계가 명시적으로 드러나게 했다.

## 3. 포트 충돌 시 동작

`reuseExistingServer: false`이므로 Playwright가 항상 webServer 명령을 새로 시작하고, 시작 실패 또는 포트 바인딩 실패 시 "Process from config.webServer was not able to start" 형태의 명확한 에러와 종료 코드 1로 실패한다. 사용자 프로세스를 종료하는 로직은 전혀 없다(`taskkill`, PID 강제 종료 등 없음).

실제로 위 `NEXT_DIST_DIR` 제거 시나리오에서 두 번째 `next dev`가 `.next` 공유로 거부되며 종료 코드 1로 시작 실패하는 것을 확인했고, 그 과정에서 기존 서버는 종료되지 않았다.

참고: Windows에서 `0.0.0.0:3300`을 임의로 점유시켜 충돌을 재현하려던 시도는, `next dev --hostname localhost`가 IPv6(`::1`)에 바인딩하는 바람에 IPv4 리스너와 실제로 충돌하지 않아 재현이 무산됐다. 이는 로컬에서 포트 충돌 자체가 잘 발생하지 않는다는 뜻이며, 충돌 시 실패 동작은 Playwright의 webServer 시작 실패 경로로 보장된다.

## 4. 반복·파일 단위·전체 E2E 결과와 종료 코드

모든 E2E 실행은 수정된 `playwright.config.ts`로 수행했다.

| 검증 | 명령 | 결과 |
|---|---|---|
| 지연 응답 10회 | `npx playwright test e2e/youtube-title.spec.ts -g "keeps a user-entered title when a delayed automatic response arrives" --repeat-each=10 --timeout=10000 --reporter=line` | 10 passed, 종료 코드 0 |
| 제목 E2E 전체 | `npx playwright test e2e/youtube-title.spec.ts --reporter=line` | 5 passed, 종료 코드 0 |
| E2E 전체 | `npm run test:e2e -- --reporter=line` | 12 passed, 종료 코드 0 |

각 명령 모두 Playwright 줄 단위 summary 출력과 종료 코드 0을 확인했다. 매 실행마다 종료 후 E2E 포트(`3300`)에 리스닝 프로세스가 남지 않았다.

## 5. 테스트 전후 `next-env.d.ts` 상태

`next-env.d.ts`는 추적 해제+`.gitignore` 처리되어 `git diff -- next-env.d.ts`는 이전/이후 모두 출력이 없다(추적 대상이 아니므로 diff가 생길 수 없음).

- 전: `git diff -- next-env.d.ts` → (출력 없음)
- 후(모든 E2E·빌드 실행 뒤): `git diff -- next-env.d.ts` → (출력 없음)

디스크의 파일은 Next.js가 명령에 맞게 재생성한 상태다. E2E 실행 후에는 `.next-e2e/dev` 참조로, 빌드 후에는 `.next/types` 참조로 각각 존재하지만 모두 Git에서 추적하지 않으므로 오염이 아니다.

## 6. 테스트 전후 관련 자식 프로세스 상태

- 전: E2E 포트 `3300`에 리스닝 프로세스 없음, `localhost:3100`도 비어 있음.
- 후: `npm run test:e2e` 종료 후 `3300`에 리스닝 프로세스 없음 → Playwright가 시작한 webServer와 브라우저 자식 프로세스가 정상 정리됨.
- 이전부터 실행 중이던 개발 서버(포트 3000, PID 25320)는 이번 작업에서 종료하지 않았고 그대로 유지됐다.

## 7. 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `playwright.config.ts` | E2E 전용 포트 3300, `reuseExistingServer: false`, `baseURL`·`webServer.url`·`command` 동일 포트로 통일, `.next-e2e` 유지 |
| `.gitignore` | `next-env.d.ts` 추가 |
| `next-env.d.ts` | `git rm --cached`로 추적 해제 (디스크에는 유지) |
| `package.json` | `typecheck`가 `next typegen` 후 `tsc --noEmit`을 실행하도록 변경 |
| `.github/workflows/ci.yml` | 새 클론 타입 생성을 포함하도록 타입 검사 단계 이름 명시 |
| `docs/tasks/TASK-011-RESULT.md` | 본 결과서 작성 |
| `docs/tasks/TASK-010-RESULT.md` | 후속 보정 참고 추가 |
| `docs/.obsidian/workspace.json` | TASK-011 커밋에 잘못 포함된 개인 작업 공간 상태 제거 |

제품 코드(`components/`, `lib/storage/`, `app/api/youtube-title/`), Route Handler, 저장 스키마는 변경하지 않았다.

## 8. 전체 회귀 검증 결과

| 검증 | 명령 | 최종 결과 |
|---|---|---|
| 린트 | `npm run lint` | 성공, 종료 코드 0 |
| 타입 | `npm run typecheck` | 성공, `next typegen` 후 TypeScript 검사, 종료 코드 0 |
| 새 클론 타입 | detached worktree에서 `npm ci && npm run typecheck` | `next-env.d.ts`가 없는 상태에서 타입 생성 후 성공, 종료 코드 0 |
| 단위·컴포넌트 | `npm test` | 15개 파일, 126개 테스트 통과, 종료 코드 0 |
| 프로덕션 빌드 | `npm run build -- --webpack` | 성공, Next.js 16.3.2, 종료 코드 0 |
| E2E | `npm run test:e2e -- --reporter=line` | 12개 통과, 종료 코드 0 |
| diff 형식 | `git diff --check` | 통과, 종료 코드 0 (playwright.config.ts의 LF→CRLF 안내 경고만 있음) |

정상 종료하지 않은 명령은 없으며 모든 결과는 실제 실행 결과만 기록했다.

## 9. 실패 항목과 남은 위험

- 실패 항목은 없다.
- `next-env.d.ts`는 Git에서 추적하지 않지만 `npm run typecheck`가 `next typegen`을 먼저 실행하므로 신규 클론과 CI에서도 필요한 생성형 타입을 준비한 뒤 검사한다.
- E2E는 고정 전용 포트 `3300`을 사용한다. 향후 3300이 다른 서비스에 점유되면 명확한 에러로 실패한다(사용자 프로세스는 종료하지 않음). 더 견고한 격리가 필요하면 실행별 동적 포트 방식을 고려할 수 있다.
- E2E는 여전히 별도 `.next-e2e` 빌드 디렉터리를 사용한다. `.next`를 사용하는 개발 서버와 동시에 돌려도 충돌하지 않도록 하기 위한 의도된 설정이며, `.next-e2e`는 `.gitignore`에 이미 포함돼 있다.

## 10. 커밋·배포 확인

TASK-011의 최초 변경은 커밋 `a39e581`(`chore: E2E 테스트 포트 분리 및 next-env.d.ts 추적 제외 설정`)로 커밋됐다. 이 결과서의 기존 "커밋을 수행하지 않았다" 기록은 실제 저장소 상태와 달라 정정했으며, 후속 검토 반영은 커밋 `0f357c4`(`build: typecheck 시 next typegen 자동 실행 설정`)에 포함돼 커밋 및 push까지 완료됐다. 현재 로컬 `main`과 `origin/main`은 모두 `0f357c4`를 가리킨다.

후속 검토에서 추가한 새 클론 타입 생성 경로, Obsidian 상태 제거와 본 기록 정정은 모두 커밋 `0f357c4`에 포함돼 있다. 저장소에는 `Verify` CI 워크플로만 있고 배포 워크플로는 없다. 외부 배포 플랫폼 상태는 현재 환경에 `gh` CLI가 없어 별도로 조회하지 못했으므로 배포 여부를 단정하지 않는다.

## 부록: `playwright.config.ts` 설정 변경 상세

섹션 7의 `playwright.config.ts` 행에 대응하는 변경 전/후 diff다. 포트 3100에서 E2E 전용 포트 3300으로 분리하고 `reuseExistingServer: false`로 통일한 내용을 보여준다.

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
