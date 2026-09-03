# TASK-010 결과서: 지연된 자동 제목 응답 E2E 경합 제거

## 원인

`e2e/youtube-title.spec.ts`의 지연 응답 테스트에서 라우트 핸들러가 응답 해제 함수를 `releaseResponseRef.current`에 저장한 뒤 테스트가 이를 호출하는 구조였다. 그러나 `setTitleLookupStatus("loading")`은 `fetch` 호출 직전에 화면에 반영될 수 있어, 안내 문구가 보이더라도 Playwright 라우트 핸들러가 실행되어 해제 함수를 등록했음을 보장할 수 없었다.

다음 순서가 발생하면 응답 해제 호출이 `null`에 대해 아무 작업도 하지 않는다.

1. 테스트가 URL을 입력한다.
2. 컴포넌트가 `loading` 상태를 설정하고 안내 문구를 렌더링한다.
3. 테스트가 안내 문구를 보고 `releaseResponseRef.current?.()`를 호출한다.
4. 아직 라우트 핸들러가 실행되지 않았으므로 `current`는 `null`이다.
5. 이후 라우트 핸들러가 실행되어 새로운 Promise의 해제 함수를 등록하지만, 테스트는 다시 호출하지 않는다.
6. 라우트 핸들러의 Promise가 영원히 해제되지 않아 E2E 프로세스와 CI가 종료되지 않는다.

## 적용한 동기화 방식

세 개의 명시적 제어점을 사용해 라우트 준비, 응답 해제와 응답 완료를 동기화했다.

- `requestStarted`: 라우트 핸들러가 요청을 받은 시점에 resolve
- `releaseResponse`: 테스트가 사용자 제목 입력을 마친 뒤 resolve
- `responseCompleted`: `route.fulfill`이 완료된 시점에 resolve

테스트 본문은 `requestStarted`를 기다린 다음 사용자 제목을 입력하고, `releaseResponse`를 resolve하여 API 응답을 완료한다. 응답 해제 함수는 직접 호출하며 optional call은 사용하지 않는다. 해제 여부를 기록해 정상 경로에서는 한 번만 호출하고, 정상 해제 전에 테스트가 실패한 경우에만 `finally` 블록에서 해제한다.

또한 `responseCompleted` 신호로 `route.fulfill`의 완료를 명시적으로 기다린 뒤 로딩 안내 제거, 제목 보존과 성공 안내 미표시를 검증한다.

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `e2e/youtube-title.spec.ts` | 지연 응답 테스트의 요청 시작과 응답 해제를 명시적으로 동기화 |
| `docs/tasks/TASK-007-RESULT.md` | TASK-010에서 발견·수정한 E2E 경합 조건에 대한 참고 추가 |
| `docs/tasks/TASK-010-RESULT.md` | 본 결과서 작성 |

`components/AddVideoForm.tsx`, `app/api/youtube-title/route.ts`, `lib/storage/learningStore.ts`는 변경하지 않았다.

## 수정 테스트 반복 실행 결과

수정한 지연 응답 테스트를 10회 반복 실행했다.

```text
npx playwright test e2e/youtube-title.spec.ts -g "keeps a user-entered title when a delayed automatic response arrives" --repeat-each=10 --timeout=10000 --reporter=line
```

| 항목 | 결과 |
|---|---|
| 실행 횟수 | 10회 |
| 성공 횟수 | 10회 |
| 실패 횟수 | 0회 |
| 프로세스 종료 | 정상 |

## 전체 검증 결과

저장소 루트에서 다음 명령을 실제로 실행했다.

| 명령 | 최종 결과 |
|---|---|
| `npm run lint` | 성공, ESLint 오류 0개 |
| `npm run typecheck` | 성공, TypeScript 오류 0개 |
| `npm test` | 성공, 15개 테스트 파일의 126개 테스트 통과 |
| `npm run build -- --webpack` | 성공, Next.js 16.3.2 프로덕션 빌드 및 Proxy 생성 확인 |
| `npm run test:e2e -- --reporter=line` | 성공, Chromium 12개 테스트 통과, 프로세스 정상 종료 |

## `next-env.d.ts` 최종 상태

E2E 실행으로 인해 `next-env.d.ts`가 `.next-e2e/dev`를 참조하도록 변경되었으나, 이는 Next.js가 `playwright.config.ts`의 `NEXT_DIST_DIR: ".next-e2e"` 설정으로 임시 생성한 부수 변경이다. 검증 완료 후 기존 `.next/dev` 참조로 복원했다.

```text
git diff -- next-env.d.ts
(변경 없음)
```

## 실패 항목과 남은 위험

- 전체 검증에서 실패 항목은 없다.
- 자동 제목 캐시는 컴포넌트가 마운트된 동안에만 유효하며 페이지를 새로고침하면 초기화된다. 이는 의도된 동작이다.
- 수정한 테스트는 사용자 제목을 입력한 뒤 응답을 해제하지만, 실제 UI에서 로딩 상태와 `fetch` 호출 사이의 타이밍은 여전히 프레임워크에 의존한다. `requestStarted` 신호를 라우트 핸들러에서 직접 보내기 때문에 이 지점 이후에는 요청이 실제로 시작됨이 보장된다.

## 커밋·배포 확인

요청하지 않은 커밋과 배포는 수행하지 않았다.
