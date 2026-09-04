# TASK-016: 마지막 하드코딩 제거 및 저장소 경량화 준비

## 목표
LearningWorkspace 남은 하드코딩 제거 + 메모리 대비

## 할 일
1. schema.ts에 6개 필드 추가 (nullable().optional())
   - footerText, routeCardTitle, segmentCtaLabel, statsLabels, valueCopyPrefix, sideNoteSummary

2. first-video.json에 기존 문구 그대로 채우기

3. LearningWorkspace.tsx
   - 남은 인라인 문자열 전부 video.* ?? fallback 교체
   - stats: video.statsLabels ?? {steps:"단계", duration:"분", practice:"실습"}

4. 금지: IndexedDB 마이그레이션은 TASK-017에서

## 검증
lint, typecheck, test, build, test:e2e, diff --check

## 커밋
refactor: 마지막 하드코딩 제거 및 저장소 경량화 준비
