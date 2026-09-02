# TASK-006 결과서: YouTube 학습 제목 자동 입력

## 구현 결과

유효한 YouTube 주소에서 얻은 11자리 영상 ID를 내부 Route Handler로 전달하고, 서버가 공식 YouTube Data API `videos.list`에서 제목만 조회하도록 구현했다. 제목 조회는 300ms 디바운스 후 영상 ID당 한 번 실행되며, 사용자가 직접 입력한 제목과 URL 변경 뒤 도착한 오래된 응답을 덮어쓰지 않는다.

조회 실패는 저장 오류와 분리된 안내 상태로 표시한다. API 키가 없거나 영상이 없거나 외부 API가 실패해도 사용자는 제목을 직접 입력해 기존 저장·중복 처리·상세 이동 흐름을 계속 사용할 수 있다. 저장 스키마와 백업 형식은 변경하지 않았다.

## 주요 구현 내용

- `GET /api/youtube-title?videoId={videoId}` Route Handler 추가
  - 서버에서 `/^[A-Za-z0-9_-]{11}$/` 재검증
  - 고정된 `https://www.googleapis.com/youtube/v3/videos`만 호출
  - `part=snippet`, `fields=items(snippet(title))`, 서버 전용 `YOUTUBE_API_KEY` 사용
  - 정상 응답을 `{ "title": "..." }`로 축소
  - 잘못된 ID `400`, 영상 없음 `404`, 외부 오류·잘못된 응답 `502`, 키 미설정 `503`
  - 빈 제목과 100자를 초과한 제목 거부
- `AddVideoForm` 자동 제목 상태 추가
  - `idle`, `loading`, `success`, `error` 상태와 화면 읽기 도구용 상태 안내
  - 300ms 디바운스와 영상 ID별 단일 시도
  - `AbortController`와 요청 순번으로 URL 변경·컴포넌트 해제 뒤 응답 무시
  - 자동 제목과 사용자 제목 출처를 구분해 사용자 입력 우선
  - 영상 변경 시 자동 제목만 삭제하고 직접 입력한 제목은 보존
  - 서버 응답도 문자열·공백·100자 제한을 다시 검사
- 360px에서 상태 문구와 긴 제목이 가로 오버플로를 만들지 않도록 폼 자식의 최소 너비와 줄바꿈 보강
- 설정, 아키텍처, 기능 및 URL 학습 설계 문서를 공식 API 사용 상태에 맞게 갱신

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `app/api/youtube-title/route.ts` | 서버 제목 조회 경계와 안전한 오류 응답 |
| `app/api/youtube-title/route.test.ts` | Route Handler 상태 코드, 요청 제한, 비밀값 비노출 테스트 |
| `components/AddVideoForm.tsx` | 자동 조회, 경합 방지, 수동 폴백 UI |
| `components/AddVideoForm.test.tsx` | 자동 입력·사용자 우선·오래된 응답·실패·해제·저장 회귀 테스트 |
| `app/globals.css` | 모바일 폼 오버플로 방지 |
| `e2e/youtube-title.spec.ts` | 자동 등록, 수정 후 영속성, 실패 후 수동 등록 |
| `e2e/mobile.spec.ts` | 360px 로딩·실패·긴 제목 오버플로 검사 |
| `docs/01_프로젝트개요.md` | 현재 기능과 기술 구성 갱신 |
| `docs/02_주요기능.md` | 자동 제목과 수동 폴백 설명 |
| `docs/03_아키텍처.md` | Route Handler와 외부 연결 데이터 흐름 |
| `docs/04_설치및실행.md` | `YOUTUBE_API_KEY` 설정 및 공개 배포 주의사항 |
| `docs/13_youtube_url_learning_design.md` | 자동 조회 단계와 보안 경계 반영 |

## 완료조건별 결과

| 완료조건 | 결과 | 근거 |
|---|---|---|
| 유효한 주소에서 제목 자동 입력 | 완료 | 컴포넌트 및 E2E 자동 등록 테스트 |
| 자동 제목 수정 및 수정값 등록 | 완료 | 상세·목록·새로고침 영속성 E2E 테스트 |
| 늦은 응답이 사용자 제목을 덮어쓰지 않음 | 완료 | 지연 응답 컴포넌트 테스트 |
| 빠른 URL 변경에서 이전 응답 무시 | 완료 | 요청 취소·순번 비교 및 A/B 응답 테스트 |
| API 실패·영상 없음·키 미설정 시 수동 입력 | 완료 | Route Handler 상태 테스트와 수동 폴백 E2E |
| 빈 URL·잘못된 URL에서 API 미호출 | 완료 | 컴포넌트 fetch 미호출 테스트 |
| API 키와 원문 응답 비노출 | 완료 | 서버 전용 환경변수, 축소 응답 및 비노출 테스트 |
| 정의된 Route Handler 상태 코드 | 완료 | `400`, `404`, `502`, `503` 단위 테스트 |
| 저장·백업·중복·수동 등록 회귀 없음 | 완료 | 전체 Vitest 및 Playwright 회귀 테스트 |
| 조회 상태 접근성 | 완료 | 제목 입력 레이블 유지, `role="status"`, `aria-describedby` |
| 360px 가로 오버플로 없음 | 완료 | 로딩·실패·120자 제목 Playwright 검사 |
| 기능·설정 문서 갱신 | 완료 | 관련 문서 5개 수정 |
| 필수 검증 성공 | 완료 | 아래 최종 실행 결과 |

## 검증 결과

저장소 루트에서 실제 API 키 없이 실행했다. 외부 YouTube API는 단위 테스트에서 `fetch`를 모킹하고 E2E에서 내부 제목 API를 가로채 네트워크와 할당량에 의존하지 않게 했다.

| 명령 | 최종 결과 |
|---|---|
| `npm run lint` | 성공, ESLint 오류 0개 |
| `npm run typecheck` | 성공, TypeScript 오류 0개 |
| `npm test` | 성공, 13개 테스트 파일의 115개 테스트 통과 |
| `npm run build -- --webpack` | 성공, Next.js 16.3.2 프로덕션 빌드 및 동적 `/api/youtube-title` 경로 생성 |
| `npm run test:e2e` | 성공, Chromium 9개 테스트 통과 |

개발 중 첫 전체 린트는 effect 본문의 동기 상태 변경 규칙 1건으로 실패해 URL 변경 핸들러로 초기화 로직을 옮겼다. 첫 E2E 실행의 신규 테스트 2건은 화면 전환 전 상세 제목 locator를 평가해 모호해졌으며 URL 전환을 먼저 기다리도록 수정했다. 수정 후 위 필수 명령은 모두 성공했다.

## 실패 항목

최종 검증 실패 항목은 없다.

## 남은 위험과 운영 참고

- 실제 제목 조회에는 Google Cloud에서 YouTube Data API v3를 활성화하고 서버 환경에 `YOUTUBE_API_KEY`를 설정해야 한다. 실제 키를 저장소에 추가하지 않았다.
- 자동화 검증은 실제 Google API를 호출하지 않으므로 실제 키 제한, 프로젝트 할당량, Google 측 운영 상태는 검증 범위 밖이다.
- 공개 배포 시 인증 없는 Route Handler가 할당량 남용 경로가 될 수 있다. 배포 전에 요청 제한과 배포 환경에 맞는 키 제한을 별도로 검토해야 한다.
- 자동 제목은 등록 편의를 위한 값이며 검수된 학습 콘텐츠 메타데이터로 간주하지 않는다.
