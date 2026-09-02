# TASK-008 결과서: 첫 화면 이전 데이터 표시 복구

## 구현 결과

로컬 개발 환경에서 `127.0.0.1`과 `localhost`를 번갈아 사용할 때 브라우저 저장소가 서로 분리되어 첫 화면에 이전 학습 데이터가 표시되지 않는 문제를 수정했다.

앱의 로컬 기준 주소를 `localhost`로 통일하고, `127.0.0.1`로 들어온 요청은 포트·경로·쿼리를 유지한 채 같은 포트의 `localhost`로 `307 Temporary Redirect`한다. 첫 화면은 정규화된 origin의 `vibe-learning:v1` 데이터를 읽어 기존 학습 목록을 표시한다.

## 원인

브라우저의 `localStorage`는 origin 단위로 분리된다. 따라서 아래 두 주소는 같은 개발 서버를 가리키더라도 서로 다른 저장소를 사용한다.

- `http://localhost:3000`
- `http://127.0.0.1:3000`

개발 실행과 E2E 테스트에서 두 주소가 혼용되면서 이전에 저장한 데이터가 없는 것처럼 보였다.

## 주요 구현 내용

- Next.js 16의 `proxy.ts` 요청 경계에서 실제 `Host`를 확인한다.
- `127.0.0.1` 요청만 `localhost`로 이동하며 외부 호스트는 변경하지 않는다.
- 포트, 경로, 쿼리를 유지한다.
- E2E 개발 서버와 기준 URL을 `localhost:3100`으로 통일한다.
- 정규화된 `localhost` origin에 저장한 학습 데이터가 새로고침 뒤 첫 화면에 표시되는지 검증한다.
- 로컬 실행 문서에 `localhost:3000` 사용과 origin별 브라우저 저장소 분리 이유를 기록한다.

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `proxy.ts` | `127.0.0.1` 요청을 같은 포트의 `localhost`로 리디렉션 |
| `proxy.test.ts` | 리디렉션과 정상 `localhost` 요청 통과 검증 |
| `lib/browser/canonicalLocalOrigin.ts` | 로컬 URL 정규화 함수 |
| `lib/browser/canonicalLocalOrigin.test.ts` | 포트·경로·쿼리·해시 보존 및 비대상 URL 검증 |
| `e2e/local-origin.spec.ts` | 정규 origin에서 이전 저장 데이터 표시 회귀 테스트 |
| `playwright.config.ts` | E2E 기준 주소와 서버 호스트를 `localhost`로 통일 |
| `docs/04_설치및실행.md` | 권장 로컬 주소와 저장소 분리 동작 안내 |

## 검증 결과

저장소 루트에서 다음 명령을 실제로 실행했다.

| 명령 | 결과 |
|---|---|
| `npm run lint` | 성공, ESLint 오류 0개 |
| `npm run typecheck` | 성공, TypeScript 오류 0개 |
| `npm test` | 성공, 15개 테스트 파일의 121개 테스트 통과 |
| `npm run build -- --webpack` | 성공, Next.js 16.3.2 프로덕션 빌드 및 Proxy 생성 확인 |
| `npm run test:e2e` | 성공, Chromium 10개 테스트 통과 |

## 남은 참고 사항

- 로컬 학습 데이터는 계속 브라우저 `localStorage`에만 저장된다.
- 같은 호스트라도 포트가 다르면 별도 origin이므로 기존 데이터가 자동 공유되지 않는다.
- 로컬 개발 시 `http://localhost:3000`을 기준 주소로 사용한다.
- 데이터 백업이 필요하면 첫 화면의 JSON 내보내기 기능을 사용한다.
