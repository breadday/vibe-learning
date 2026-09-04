# TASK-020: 배포 및 모니터링 (최종)

## 목표
Vercel 배포 + Web Vitals 모니터링

## 할 일
1. 배포 준비
   - next.config.mjs output 제거
   - engines node >=20
   - build -- --webpack 최종 확인

2. Vercel 배포
   - New Project → GitHub import
   - Build: npm run build -- --webpack
   - / , /learn/first-video , /learn/second-video 200 OK 확인
   - first 3단계 vs second 4단계 다르게 보이는지 확인

3. Web Vitals 모니터링
   - lib/analytics/vitals.ts 신규: reportWebVitals
   - app/layout.tsx에 연결
   - Vercel Analytics 활성화

4. 다중 탭 실측
   - 배포 URL 2탭 열고 A탭 저장 -> B탭 100ms 이내 갱신 수동 테스트

## 완료 조건
- [x] Vercel URL 접근 가능
- [ ] Lighthouse 90+ (기존 99점 유지)
- [ ] 2탭 동기화 검증
- [x] vitals.ts 생성 및 `app/layout.tsx` 연결

## 검증
lint, typecheck, test 142개, build, e2e 15개

## 커밋
feat: Vercel 배포 및 Web Vitals 모니터링
