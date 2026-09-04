# TASK-019: 다중 탭 동기화 BroadcastChannel

## 목표
A탭 저장 -> B탭 0.1초 내 자동 갱신

## 할 일
1. lib/storage/sync.ts 신규
   - new BroadcastChannel('vibe-learning:v1')
   - SSR 대응 noop

2. idb.ts: save 성공 후 postMessage({type: 'learning-store-updated'})

3. 컴포넌트 3곳: useEffect로 구독 -> reload()

## 테스트
sync.test.ts 신규 (mock)

## 검증
lint, typecheck, test, build, e2e

## 커밋
feat: BroadcastChannel 다중 탭 동기화
