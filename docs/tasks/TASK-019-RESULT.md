# TASK-019 결과서: BroadcastChannel 다중 탭 동기화

## 1. 구현 내용

`lib/storage/sync.ts`를 추가해 IndexedDB 저장 변경을 다중 탭에 전달하도록 구현했다.

- 채널명: `vibe-learning:v1`
- 메시지: `{ type: "learning-store-updated" }`
- 브라우저 환경에서만 `BroadcastChannel`을 생성한다.
- SSR 또는 BroadcastChannel 미지원 환경에서는 noop 구독·발행으로 동작한다.
- 구독 해제 시 이벤트 리스너 제거 및 채널 `close()`를 수행한다.

`lib/storage/idb.ts`의 저장 성공 직후 `publishLearningStoreUpdated()`를 호출하도록 연결했다. 저장 실패 시에는 메시지를 발행하지 않는다.

다음 세 컴포넌트가 채널을 구독하고 메시지를 받으면 IndexedDB에서 스토어를 다시 읽는다.

- `LearningLibrary.tsx`
- `BackupRestore.tsx`
- `LearningVideoDetail.tsx`

## 2. 테스트

`lib/storage/sync.test.ts`에 mock BroadcastChannel 테스트를 추가했다.

- 업데이트 메시지 발행 및 수신 검증
- 알 수 없는 메시지 무시 검증
- unsubscribe 시 채널 종료 검증
- SSR 환경 noop 동작 검증

## 3. 검증 명령 실행 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| 린트 | `npm run lint` | 통과 |
| 타입체크 | `npm run typecheck` | 통과 |
| 단위 테스트 | `npm test` | 18개 파일, 142개 테스트 통과 |
| 프로덕션 빌드 | `npm run build -- --webpack` | 성공 |
| E2E | `npm run test:e2e` | 15개 통과 |
| diff 형식 | `git diff --check` | 통과 |

## 4. 완료 조건

- [x] `lib/storage/sync.ts` 신규 생성
- [x] SSR noop 대응
- [x] IndexedDB 저장 성공 후 BroadcastChannel 메시지 발행
- [x] 3개 컴포넌트에서 구독 후 reload
- [x] `sync.test.ts` mock 테스트 추가
- [x] lint, typecheck, test, build, e2e 통과

## 5. 커밋

- 구현 및 결과서: `feat: BroadcastChannel 다중 탭 동기화`

## 6. 남은 이슈

- 실제 브라우저 두 탭 간 100ms 이내 갱신 시간은 자동화 테스트에서 측정하지 않았다. BroadcastChannel 전달 후 각 탭의 IndexedDB 조회는 비동기이며 일반적인 브라우저 환경에서 동작하도록 구성했다.
