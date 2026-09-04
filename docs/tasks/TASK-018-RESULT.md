# TASK-018 결과서: IndexedDB 마이그레이션 및 학습 단계 수 데이터화

## 1. 콘텐츠 스키마 및 데이터

`lib/content/schema.ts`의 `video` 스키마에 다음 선택 필드를 추가했다.

| 필드 | 검증 규칙 |
|---|---|
| `totalSteps` | 정수 1~10, `nullable().optional()` |
| `stepLabels` | 비어 있지 않은 문자열 배열 3~10개, `nullable().optional()` |

- `content/first-video.json`: `totalSteps: 3`, `stepLabels: ["이해하기", "골라 보기", "직접 해보기"]`
- `content/second-video.json`: `totalSteps: 4`, `stepLabels: ["핵심 파악", "구간 선택", "따라하기", "디자인 마무리"]`
- `LearningWorkspace.tsx`의 고정 상수 `STEP_COUNT`를 제거하고 `video.totalSteps ?? 3`을 사용한다.
- 소스 및 콘텐츠 파일의 `STEP_COUNT` 참조는 0개다.

## 2. IndexedDB 저장소 및 마이그레이션

`idb-keyval` 기반의 `lib/storage/idb.ts`를 추가했다.

- IndexedDB 데이터베이스: `vibe-learning`
- object store: `learning`
- 레코드 키: `vibe-learning:v1`
- `loadLearningStore()`와 `saveLearningStore()`를 Promise 기반 API로 변경했다.
- 첫 로드 시 IndexedDB에 데이터가 없고 기존 localStorage 키가 있으면 데이터를 검증한 뒤 IndexedDB에 기록한다.
- IndexedDB 기록 성공 후에만 기존 localStorage 키를 삭제한다.
- IndexedDB 기록 실패 시 기존 localStorage 데이터를 보존해 다음 실행에서 재시도할 수 있다.
- 마이그레이션 이후 일반 저장·조회 경로는 IndexedDB만 사용한다.
- 저장 작업은 Promise 체인으로 직렬화해 비동기 read/write 경합을 줄였다.
- 기존 저장 용량 경고는 `navigator.storage.estimate()` 기반으로 변경했다.

## 3. 컴포넌트 변경

스토어 비동기화에 맞춰 다음 컴포넌트를 내부 동작만 변경했다. 화면 구조와 사용자 문구는 유지했다.

- `LearningLibrary.tsx`: 초기 로드 및 저장소 변경 이벤트 기반 상태 갱신
- `AddVideoForm.tsx`: 등록 제출을 비동기 처리
- `BackupRestore.tsx`: 내보내기·복원·중복 계산을 비동기 스토어에 연결
- `LearningVideoDetail.tsx`: 초기 영상 로드와 상태·메모·구간 저장을 비동기 처리
- `LearningSegments.tsx`: 비동기 저장 결과를 기다리도록 수정

## 4. 테스트

- `fake-indexeddb`를 Vitest setup에 추가했다.
- 스토어 테스트를 IndexedDB 기준으로 전환했다.
- 마이그레이션 성공 후 localStorage 삭제 테스트를 추가했다.
- IndexedDB 기록 실패 시 localStorage 보존 테스트를 추가했다.
- 컴포넌트 테스트의 저장·조회 검증을 비동기 API 기준으로 변경했다.
- 콘텐츠 스키마의 `totalSteps` 범위와 `stepLabels` 개수·공백 검증을 추가했다.
- E2E external playback 저장 검증을 localStorage 대신 IndexedDB 직접 조회로 변경했다.

## 5. 검증 명령 실행 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| 린트 | `npm run lint` | 통과, 종료 코드 0 |
| 타입체크 | `npm run typecheck` | 통과, 종료 코드 0 |
| 단위 테스트 | `npm test` | 17개 파일, 140개 테스트 통과 |
| 프로덕션 빌드 | `npm run build -- --webpack` | 성공 |
| E2E | `npm run test:e2e` | 15개 통과 |
| diff 형식 | `git diff --check` | 통과 |
| STEP_COUNT 검색 | `rg -n "STEP_COUNT" --glob "*.{ts,tsx,json}" .` | 소스·콘텐츠 참조 0개 |

## 6. Lighthouse

프로덕션 서버(`next start`)에서 홈 페이지를 측정했다.

| 항목 | 점수 |
|---|---:|
| Performance | 99 |
| Accessibility | 100 |
| Best Practices | 96 |
| SEO | 100 |

Performance 점수는 완료 조건인 90 이상을 충족한다.

## 7. 커밋

- 구현: `1f74aad feat: IndexedDB 마이그레이션 및 학습 단계 수 데이터화`
- 결과서: `docs/tasks/TASK-018-RESULT.md`

## 8. 남은 이슈

- IndexedDB는 브라우저별 저장 공간 정책과 private browsing 제한의 영향을 받으므로 실제 배포 브라우저에서 저장 실패 UI를 추가 확인할 필요가 있다.
- 현재 저장소 변경 이벤트는 같은 탭의 갱신을 담당한다. 다중 탭 간 IndexedDB 변경 실시간 동기화는 별도 BroadcastChannel 과제로 남긴다.
