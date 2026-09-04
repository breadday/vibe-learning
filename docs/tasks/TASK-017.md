# TASK-017: 두 번째 영상 추가로 아키텍처 검증 (난이도 상)

## 목표
TASK-014~016 일반화가 진짜 동작하는지 second-video 추가로 증명

## 할 일
1. lib/content/second-video.json 생성
   - first-video와 완전히 다른 내용 (예: "커서로 10분만에 블로그 만들기")
   - segments 4개, practiceSteps 3개, keyPoints 4개 (first-video는 3개) 로 개수 다르게
   - segmentsTitle, practiceTitle, navItems, hero CTA 등 TASK-015/016 필드 전부 채우기
   - title, subtitle, duration 다르게

2. lib/content/index.ts (또는 loader)에 second-video 등록

3. /learn/second-video 라우트 동작 확인 (first-video 라우트 복제)

4. 핵심 규칙: components/LearningWorkspace.tsx 수정 금지 (0줄)
   - 만약 수정이 필요하면 schema.ts에 필드 추가가 빠진거임 -> schema에 추가

5. 메모리 체크
   - second-video 추가 후 npm run build 번들 크기 10% 이상 증가 금지
   - localStorage 사용량 체크 로직 추가 (용량 초과시 경고)

## 완료 조건
- [ ] second-video.json 생성, 모든 필드 채움
- [ ] /learn/first-video 와 /learn/second-video 둘 다 정상 렌더링
- [ ] LearningWorkspace.tsx diff 0줄
- [ ] 테스트: second-video 로드 테스트 2개 추가

## 검증
lint, typecheck, test, build -- --webpack, test:e2e, git diff --check (LearningWorkspace 0줄 확인)

## 커밋
feat: 두 번째 영상 추가로 학습 워크스페이스 일반화 검증

실패하면 TASK-014~016 재작업 필요
