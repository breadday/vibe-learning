# YouTube 학습 URL 추가 기능 설계

## 목적

사용자가 YouTube 주소 하나를 붙여넣고 공식 API로 제목을 자동 입력해 학습 목록에 등록한 뒤, 영상·타임스탬프·개인 메모를 한 화면에서 관리하도록 한다.

## 사용자 흐름

### 홈

1. `YouTube 주소를 붙여 넣으세요` 입력창을 표시한다.
2. 사용자가 URL을 붙여넣으면 즉시 형식을 검사한다.
3. 정상 URL이면 영상 썸네일과 영상 ID를 미리 보여준다.
4. 서버 Route Handler가 공식 YouTube Data API에서 제목만 조회해 입력한다.
5. 사용자는 자동 제목을 수정하거나 조회 실패 시 직접 입력한다.
6. `학습에 추가` 버튼을 누르면 브라우저에 저장한다.
7. 저장된 영상의 학습 상세 화면으로 이동한다.

홈에는 URL 입력 아래에 다음 항목만 둔다.

- 이어서 학습할 영상 1개
- 최근 등록 영상
- 전체 학습 목록
- JSON 백업·복원

### 학습 상세

- 상단: 제목, 상태, 영상 플레이어
- 본문: 핵심 3줄, 타임스탬프 구간, 직접 해보기
- 보조 영역: 개인 메모, 개념, 주의사항, 출처
- 타임스탬프를 누르면 같은 플레이어가 해당 시점으로 이동

## 지원 URL

```text
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://youtu.be/dQw4w9WgXcQ
https://www.youtube.com/shorts/dQw4w9WgXcQ
https://www.youtube.com/embed/dQw4w9WgXcQ
```

허용 호스트는 `youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`로 제한한다. 영상 ID는 영문 대소문자, 숫자, `_`, `-`로 구성된 11자리인지 검사한다.

## 권장 파일 구조

```text
app/
  page.tsx
  api/youtube-title/route.ts
  videos/[id]/page.tsx
components/
  AddVideoForm.tsx
  LearningVideoCard.tsx
  LearningWorkspace.tsx
lib/
  youtube/parseYouTubeUrl.ts
  storage/learningStore.ts
  content/schema.ts
```

## 구현 단계

### 1단계 — URL 파서

- 순수 TypeScript 함수로 작성한다.
- 네트워크와 AI를 호출하지 않는다.
- 성공 시 영상 ID와 정규화된 URL을 반환한다.
- 실패 시 사용자가 이해할 수 있는 오류 코드를 반환한다.

```ts
type ParseYouTubeUrlResult =
  | { ok: true; videoId: string; normalizedUrl: string }
  | { ok: false; reason: "invalid-url" | "unsupported-host" | "invalid-video-id" };
```

### 2단계 — 브라우저 저장소

- 저장 키: `vibe-learning:v1`
- 값: `schemaVersion`, `videos`, `lastOpenedVideoId`
- 읽기와 쓰기를 하나의 모듈에서만 수행한다.
- 서버 렌더링 중에는 `window`에 접근하지 않는다.
- 저장 용량 오류와 손상된 JSON을 처리한다.

### 3단계 — URL 등록 화면

- 빈 값에서는 등록 버튼 비활성화
- 붙여넣기 후 즉시 검사
- 오류 문구를 입력창 가까이에 표시
- 중복이면 기존 영상으로 이동하는 버튼 표시
- 저장 전에 썸네일과 제목 입력란 표시

썸네일은 다음 공개 주소를 이용할 수 있다.

```text
https://i.ytimg.com/vi/{videoId}/hqdefault.jpg
```

제목 자동 조회가 실패해도 수동 입력으로 등록 가능해야 한다. 자동 제목은 사용자 입력을 덮어쓰지 않으며 URL 변경 뒤 도착한 이전 응답은 무시한다.

### 4단계 — 제목 조회 Route Handler

- `GET /api/youtube-title?videoId={11자리 ID}`에서 영상 ID를 다시 검사한다.
- 서버 전용 `YOUTUBE_API_KEY`로 고정된 공식 `videos.list` 엔드포인트를 호출한다.
- `part=snippet`, `fields=items(snippet(title))`를 사용하고 클라이언트에는 검증한 제목만 반환한다.
- 키 미설정, 영상 없음, 외부 API 오류를 안전한 상태 코드와 일반화된 오류로 변환한다.
- 클라이언트는 300ms 디바운스, 요청 취소와 응답 식별로 경합을 방지한다.

### 5단계 — 목록과 상태

- 상태: 학습 전, 학습 중, 완료
- 최근 수정 순으로 정렬
- 삭제 전 확인
- 중복 영상 생성 금지
- 새로고침 후 유지 확인

### 6단계 — JSON 백업·복원

- 백업 파일명: `vibe-learning-backup-YYYY-MM-DD.json`
- 내보낼 때 스키마 검증
- 가져올 때 미리보기 제공
- 덮어쓰기 또는 병합 선택
- 동일 `youtubeId` 병합 시 최신 `updatedAt` 우선

## AI 및 자막 기능 경계

MVP에서는 URL 등록과 동시에 자막 또는 요약을 생성하지 않는다.

향후 자막 기능을 추가할 때도 다음 규칙을 지킨다.

1. 자막 원문과 해시를 한 번 저장한다.
2. 사용자가 자막을 검색하고 구간을 선택한다.
3. AI 버튼 옆에 처리 범위와 예상 비용을 표시한다.
4. 선택 구간만 AI에 전달한다.
5. 캐시 키를 `videoId + transcriptHash + promptVersion + model`로 구성한다.
6. 같은 캐시 키의 결과는 다시 생성하지 않는다.

## 테스트 항목

### 단위 테스트

- 일반 YouTube URL
- 단축 URL
- Shorts URL
- embed URL
- 추가 쿼리 문자열이 있는 URL
- YouTube가 아닌 호스트
- 11자리가 아닌 영상 ID
- 공백 입력
- 동일 영상 중복
- 손상된 IndexedDB 데이터와 기존 localStorage 마이그레이션

### 화면 테스트

- URL 입력에서 저장까지 완료
- 중복 등록 시 기존 영상 안내
- 목록에서 상세 화면 이동
- 삭제 확인
- JSON 내보내기·가져오기
- 360px에서 가로 스크롤 없음

## 무료 Git 검증

기준 원격 저장소:

```text
origin  https://github.com/breadday/vibe-learning.git (fetch)
origin  https://github.com/breadday/vibe-learning.git (push)
```

작업 시작 전에 `git remote -v`로 확인하고, 주소가 다르면 임의로 push하지 않는다. 기존 `origin` 주소를 고쳐야 할 때는 다음 명령을 사용한다.

```bash
git remote set-url origin https://github.com/breadday/vibe-learning.git
```

Pull Request마다 한 Ubuntu 작업에서 다음을 순서대로 실행한다.

```text
npm ci → lint → typecheck → test → build
```

- `pull_request`와 `main` push만 실행한다.
- `concurrency.cancel-in-progress`로 이전 실행을 취소한다.
- 운영체제 matrix를 만들지 않는다.
- 실패 스크린샷은 실패했을 때만 짧게 보관한다.

## 이번 단계에서 하지 않을 일

- 로그인
- 데이터베이스
- 자동 자막 수집
- 전체 영상 AI 요약
- 퀴즈와 마인드맵
- 플레이리스트 일괄 처리
- 제목 이외의 외부 메타데이터 수집

위 기능은 URL 등록·로컬 저장·백업 기능이 안정된 뒤 별도 요구사항으로 검토한다.
