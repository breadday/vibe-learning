# TASK-011: Playwright E2E 서버 격리 및 생성 파일 오염 방지

## 목표

Playwright E2E 실행이 이전에 남은 개발 서버나 다른 실행 세션의 영향을 받지 않도록 테스트 서버 수명주기를 격리한다. E2E 전용 Next.js 출력 경로 때문에 `next-env.d.ts`가 변경되는 부수 효과도 원인 단계에서 제거한다.

다음을 보장한다.

- E2E 실행마다 현재 작업 트리의 서버를 사용한다.
- 테스트 완료 또는 실패 후 runner와 이 실행이 시작한 서버가 정상 종료된다.
- 기존 서버가 있어도 검증 결과가 오염되지 않는다.
- E2E 실행 전후 추적 파일에 새 diff가 생기지 않는다.

## 배경

TASK-010에서 지연된 자동 제목 응답 테스트의 Promise 경합을 수정했다. 하지만 독립 검토 환경에서는 반복 테스트가 마지막 실행까지 진입한 뒤 프로세스가 종료되지 않는 현상이 관찰됐다. 당시 이전부터 실행 중인 Node 개발 서버가 여러 개 있었고 `playwright.config.ts`는 `reuseExistingServer: !process.env.CI`를 사용했다.

로컬의 `localhost:3100`에 서버가 이미 있으면 Playwright는 그 서버가 현재 코드와 환경으로 실행됐는지 확인하지 않고 재사용할 수 있다. 따라서 로컬 성공 결과가 현재 작업 트리를 검증했다는 보장이 약하다.

E2E 서버의 `NEXT_DIST_DIR: ".next-e2e"` 설정은 Next.js 실행 중 `next-env.d.ts` 참조를 `.next/dev`에서 `.next-e2e/dev`로 바꾼다. 매번 수동 복원하는 방식은 기존 사용자 변경을 제거할 위험이 있어 지속 가능한 해결책이 아니다.

## 요구사항

### 1. E2E 서버 격리

- 로컬과 CI 모두 현재 Playwright 실행이 관리하는 서버를 사용한다.
- 기존 `localhost:3100` 서버를 무조건 재사용하지 않는다.
- 우선 `reuseExistingServer: false`로 통일하는 최소 변경을 검토한다.
- 포트가 이미 사용 중이면 사용자 프로세스를 종료하지 않고 명확한 오류로 실패하거나 안전한 실행별 포트를 사용한다.
- 동적 포트를 사용한다면 `baseURL`, web server URL, 프록시와 E2E 기대값이 하나의 설정에서 같은 값을 사용해야 한다.
- 실제 `YOUTUBE_API_KEY` 없이 라우트 가로채기 테스트가 계속 동작해야 한다.

### 2. 프로세스 정상 종료

- 단일, 반복, 전체 E2E가 모두 유한 시간 안에 끝나야 한다.
- 테스트 개수 출력뿐 아니라 Playwright 최종 summary와 종료 코드 0을 확인한다.
- 실패 시에도 Playwright가 시작한 서버와 브라우저 자식 프로세스가 정리되어야 한다.
- 광범위한 `node.exe` 종료, 임의 PID 종료, 사용자 개발 서버 종료를 자동화하지 않는다.

### 3. `next-env.d.ts` 오염 방지

- E2E 전후 `git diff -- next-env.d.ts` 결과가 같아야 한다.
- 테스트 뒤 `git restore`를 자동 실행하는 해결책은 사용하지 않는다.
- 현재 설치된 Next.js 문서와 실제 동작으로 갱신 조건을 확인한다.
- 가능한 경우 E2E 출력 디렉터리와 타입 생성 경로를 추적 파일에 영향을 주지 않도록 구성한다.
- 추적 해제나 `.gitignore` 추가는 영향을 검토하고 근거 없이 적용하지 않는다.

### 4. 기존 검증 유지

- TASK-010의 요청 시작, 응답 해제, 응답 완료 동기화를 유지한다.
- 자동 제목 정상 입력, A → B → A 캐시, 사용자 제목 우선, 실패 후 수동 폴백 테스트를 약화하지 않는다.
- 홈, 상세, 개인 메모, 학습 구간, 백업·복원과 로컬 origin 테스트를 유지한다.
- 제품 컴포넌트, Route Handler와 저장 스키마는 변경하지 않는다.

## 작업 범위

### 포함

- `playwright.config.ts`의 서버 재사용, 포트와 출력 경로 설정 검토 및 수정
- 반드시 필요한 경우에만 E2E 전용 설정 또는 안전한 보조 스크립트 추가
- 포트 충돌 동작 검증
- 단일·반복·전체 E2E 정상 종료 검증
- E2E 전후 `next-env.d.ts` 무변경 검증
- 관련 결과 문서 작성

### 제외

- 제품 UI와 비즈니스 로직 변경
- YouTube 제목 API 계약 변경
- 저장 스키마와 백업 형식 변경
- 새 테스트 프레임워크 도입
- 사용자 또는 시스템 Node 프로세스 일괄 종료
- `git reset`, 광범위한 `git restore`, 작업 트리 자동 정리
- 커밋, push, 배포

## 작업 절차

### 1. 사전 확인

`AGENTS.md`, TASK-010 지시서와 결과서, `playwright.config.ts`, `package.json`, `next.config.mjs`, `next-env.d.ts`, `proxy.ts`, `e2e/youtube-title.spec.ts`, `e2e/local-origin.spec.ts`를 읽는다.

Next.js 설정을 바꾸기 전에 `node_modules/next/dist/docs/`에서 현재 설치 버전의 개발 출력 디렉터리, 타입 생성과 `next-env.d.ts` 규칙을 확인한다. 시작 시 `git status --short`를 기록하고 기존 변경을 보존한다.

### 2. 원인 분리

다음 조건을 구분해 조사한다.

1. 포트 3100이 비어 있는 상태에서 실행
2. 현재 프로젝트 서버가 포트 3100에 이미 있는 상태
3. 환경 또는 코드가 다른 서버가 포트 3100에 있는 상태
4. E2E 실패나 중단 직후 재실행

사용자 프로세스는 종료하지 않는다. 각 조건에서 실제 사용 서버, 서버 시작·종료 여부, Playwright summary, 종료 코드, `next-env.d.ts` diff와 남은 자식 프로세스를 기록한다.

### 3. 최소 변경

확인된 원인을 다음 우선순위로 해결한다.

1. 기존 서버 재사용 제거
2. 포트 충돌을 명시적 실패로 전환
3. Playwright가 시작한 서버의 정상 종료 보장
4. E2E 출력 경로가 추적 파일을 바꾸지 않도록 조정

설정만으로 해결할 수 있다면 패키지나 별도 프로세스 관리 스크립트를 추가하지 않는다.

### 4. 집중 검증

| 목적 | 명령 |
|---|---|
| 지연 응답 10회 | `npx playwright test e2e/youtube-title.spec.ts -g "keeps a user-entered title when a delayed automatic response arrives" --repeat-each=10 --timeout=10000 --reporter=line` |
| 제목 E2E 전체 | `npx playwright test e2e/youtube-title.spec.ts --reporter=line` |
| E2E 전체 | `npm run test:e2e -- --reporter=line` |

각 명령의 summary와 종료 코드 0을 확인한다.

### 5. 전체 회귀 검증

| 검증 | 명령 |
|---|---|
| 린트 | `npm run lint` |
| 타입 | `npm run typecheck` |
| 단위·컴포넌트 | `npm test` |
| 프로덕션 빌드 | `npm run build -- --webpack` |
| E2E | `npm run test:e2e -- --reporter=line` |
| diff 형식 | `git diff --check` |

검증 전후에 `git status --short`와 `git diff -- next-env.d.ts`를 비교한다. 실행하지 못했거나 정상 종료하지 않은 명령은 통과로 기록하지 않는다.

### 6. 결과 기록

`docs/tasks/TASK-011-RESULT.md`에 근본 원인, 재현 조건, 선택한 설정과 대안, 포트 충돌 동작, E2E summary와 종료 코드, 전후 `next-env.d.ts` 및 자식 프로세스 상태, 전체 회귀 결과와 남은 위험을 기록한다.

TASK-010 결과서 보정이 필요하면 사실과 이유를 추가하되 기존 기록을 임의로 삭제하지 않는다.

## 완료조건

- [ ] 로컬과 CI의 E2E 서버 재사용 정책이 동일하고 명시적이다.
- [ ] 기존 포트의 다른 서버를 현재 작업 트리 서버로 오인하지 않는다.
- [ ] 포트 충돌 시 사용자 프로세스를 종료하지 않고 명확히 실패하거나 안전한 격리 포트를 사용한다.
- [ ] 지연 응답 테스트 10회가 통과하고 종료 코드 0으로 끝난다.
- [ ] `youtube-title.spec.ts` 전체가 통과하고 종료 코드 0으로 끝난다.
- [ ] 전체 E2E가 통과하고 종료 코드 0으로 끝난다.
- [ ] 성공·실패 후 이 실행이 시작한 서버와 브라우저 자식 프로세스가 남지 않는다.
- [ ] E2E 전후 `next-env.d.ts`에 새 diff가 생기지 않는다.
- [ ] 기존 사용자 변경을 자동 복원 명령으로 제거하지 않는다.
- [ ] 제품 컴포넌트, Route Handler와 저장 스키마를 변경하지 않는다.
- [ ] lint, typecheck, 단위·컴포넌트 테스트와 webpack 빌드가 통과한다.
- [ ] `git diff --check`가 통과한다.
- [ ] 정상 종료하지 않은 검증을 성공으로 기록하지 않는다.
- [ ] 요청하지 않은 커밋과 배포를 수행하지 않는다.

## 예상 변경 파일

| 파일 | 예상 변경 내용 |
|---|---|
| `playwright.config.ts` | 서버 재사용, 포트와 E2E 출력 경로 격리 |
| `package.json` | 안전 실행 명령이 반드시 필요한 경우에만 수정 |
| `next.config.mjs` | 출력 경로 분리가 필요한 경우에만 최소 수정 |
| `docs/tasks/TASK-011-RESULT.md` | 원인, 변경과 검증 결과 기록 |
| `docs/tasks/TASK-010-RESULT.md` | 후속 검증 사실 보충이 필요할 때만 수정 |

`components/`, `lib/storage/`, `app/api/youtube-title/` 아래 제품 코드는 변경하지 않는다.

## 결과 보고 형식

1. 확인한 근본 원인
2. 적용한 서버 격리 방식과 선택 이유
3. 포트 충돌 시 동작
4. 반복·파일 단위·전체 E2E 결과와 종료 코드
5. 테스트 전후 `next-env.d.ts` 상태
6. 테스트 전후 관련 자식 프로세스 상태
7. 변경 파일 목록
8. 전체 회귀 검증 결과
9. 실패 항목과 남은 위험
10. 커밋·배포를 수행하지 않았다는 확인

