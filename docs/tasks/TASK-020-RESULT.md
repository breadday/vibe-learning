# TASK-020 결과서: 배포 및 모니터링

## 1. 구현 내용

- `next.config.mjs`에 배포를 제한하는 `output` 설정이 없음을 확인했다.
- `package.json`의 Node.js 엔진은 `>=20`으로 설정되어 있다.
- `lib/analytics/vitals.ts`에 `reportWebVitals`를 추가했다.
- `components/WebVitals.tsx`에서 Next.js `useReportWebVitals`와 리포터를 연결했다.
- 루트 레이아웃에 Vercel Analytics의 `<Analytics />`를 연결했다.
- `@vercel/analytics`를 의존성으로 추가했다.

## 2. 검증 명령 실행 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| 린트 | `npm run lint` | 통과 |
| 타입체크 | `npm run typecheck` | 통과 |
| 단위 테스트 | `npm test` | 18개 파일, 142개 테스트 통과 |
| 프로덕션 빌드 | `npm run build -- --webpack` | 성공 |
| E2E | `npm run test:e2e` | 15개 통과 |
| diff 형식 | `git diff --check` | 통과 |

## 3. 배포 확인

- [x] Vercel 배포 URL 접근: https://vibe-learning-blush.vercel.app/
- [x] 배포 URL의 `/`, `/learn/first-video`, `/learn/second-video` 콘텐츠 응답 확인
- [x] first-video 3단계와 second-video 4단계가 다르게 렌더링되는지 확인
- [ ] Lighthouse 90+ 확인
- [ ] 실제 배포 환경의 Vercel Analytics 데이터 수집 확인
- [ ] 배포 URL의 두 탭에서 저장 후 100ms 이내 동기화 확인

## 4. 커밋

- 미커밋 상태
