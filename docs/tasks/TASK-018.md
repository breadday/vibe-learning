# TASK-018: IndexedDB 마이그레이션 + STEP_COUNT 데이터화 (난이도 최상)

## 목표
localStorage 블로킹 제거 + 마지막 하드코딩 제거

## 할 일
1. schema.ts 2개 필드 추가 (nullable().optional())
   - totalSteps: number 1~10
   - stepLabels: string[] 3~10개

2. first/second json
   - first totalSteps=3, second totalSteps=4 (다르게)
   - stepLabels 각 영상에 맞게

3. IndexedDB 마이그레이션 (핵심)
   - lib/storage/idb.ts 신규: idb-keyval 사용
   - learningStore.ts: get/set 비동기로 교체
   - 첫 실행 시 localStorage -> IndexedDB 자동 마이그레이션 후 localStorage 삭제

4. LearningWorkspace.tsx
   - STEP_COUNT=3 제거 -> video.totalSteps ?? 3
   - 참조 4곳 전부 교체

5. 금지: UI 변경 금지, localStorage 동시 사용 금지

## 완료 조건
- [ ] idb.ts 생성, learningStore 비동기화
- [ ] 마이그레이션 로직 + 테스트 2개
- [ ] STEP_COUNT 하드코딩 0개
- [ ] first/second 둘 다 정상

## 검증
lint, typecheck, test, build, test:e2e, Lighthouse 90+

## 커밋
feat: IndexedDB 마이그레이션 및 학습 단계 수 데이터화
