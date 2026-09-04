# TASK-016 결과서: 마지막 하드코딩 제거 및 저장소 경량화 준비

## 1. 대체한 하드코딩 위치와 방식 요약

`components/LearningWorkspace.tsx`의 잔여 하드코딩 6곳을 `video.* ?? fallback` 형태로 대체했다. 기존 상수/문구는 폴백으로 유지하므로 JSON 값이 없는 콘텐츠에서도 렌더링이 깨지지 않는다.

| 위치 | 이전 (하드코딩) | 이후 |
|---|---|---|
| 푸터 | "AI 호출 없이 저장된 검수 자료로 학습합니다." (인라인) | `video.footerText ?? "AI 호출 없이 저장된 검수 자료로 학습합니다."` |
| 라우트 카드 제목 | "오늘의 학습 순서" (인라인) | `video.routeCardTitle ?? "오늘의 학습 순서"` |
| 세그먼트 카드 CTA | "이 구간 보기 →" (인라인) | `video.segmentCtaLabel ?? "이 구간 보기 →"` |
| `learning-stats` 라벨 3종 | "전체 영상" / "필수 구간" / "학습 과정" (인라인) | `video.statsLabels ?? { duration: "전체 영상", required: "필수 구간", steps: "학습 과정" }` |
| `value-copy` 폴백 접두 | `${분}분 안에 …`의 "분 안에" 고정 | `video.valueCopyPrefix ?? "분 안에"` → `${분}${valueCopyPrefix} ${title} 이해하기` |
| 사이드 노트 첫 요약 | "학습 전 꼭 확인" (인라인) | `video.sideNoteSummary ?? "학습 전 꼭 확인"` |

### 지시서 대비 보정한 부분

1. **`statsLabels` 폴백 키/값 보정**: 지시서의 폴백 예시 `{steps:"단계", duration:"분", practice:"실습"}`를 그대로 쓰면 기존 템플릿(`{수}분</strong>{라벨}`)에서 "14분분"처럼 단위가 겹쳐 렌더링이 깨지고, "필수 구간" 라벨을 `practice` 키에 담아야 하는 의미 불일치가 생긴다. 또한 지시서의 다른 조항("first-video.json에 기존 문구 그대로 채우기")과도 충돌한다. 따라서 키를 `{ duration, required, steps }`로 하고 폴백도 기존 문구("전체 영상" / "필수 구간" / "학습 과정")로 통일했다. first-video 렌더링은 픽셀 단위로 동일하다.
2. **`valueCopyPrefix`는 분수 뒤 텍스트로 정의**: 숫자(`Math.ceil(durationSeconds/60)`)는 동적 값이므로 필드에는 "분 안에"를 넣고 `${분}${valueCopyPrefix} ${title} 이해하기`로 조합했다. first-video.json 값 "분 안에"로 기존 렌더링("14분 안에 …")과 동일하다.
3. **`sideNoteSummary`는 첫 번째 요약만 데이터화**: 사이드 노트 요약 4종 중 "학습 전 꼭 확인"만 필드로 추출했다. "핵심 개념 N개"는 동적 카운트가 포함되고, 나머지 2종("주의사항 더 보기", "공식자료와 원본")은 이번 지시서 6개 필드 목록에 없어 범위 밖으로 남겼다.

## 2. 스키마에 추가된 필드 목록과 first-video.json 값

`lib/content/schema.ts`의 `videoSchema`에 추가. 문자열 5개는 `nonEmptyText.nullable().optional()`, `statsLabels`는 `z.object({ duration, required, steps }).strict().nullable().optional()`로 정의했다.

| 필드 | first-video.json 값 |
|---|---|
| `footerText` | "AI 호출 없이 저장된 검수 자료로 학습합니다." |
| `routeCardTitle` | "오늘의 학습 순서" |
| `segmentCtaLabel` | "이 구간 보기 →" |
| `valueCopyPrefix` | "분 안에" |
| `sideNoteSummary` | "학습 전 꼭 확인" |
| `statsLabels` | `{ "duration": "전체 영상", "required": "필수 구간", "steps": "학습 과정" }` |

모든 값이 기존 렌더링 문구와 동일하므로 first-video 화면은 변화가 없다. 푸터·통계·라우트 카드·세그먼트 CTA·사이드 노트 요약이 모두 JSON 기반이 되어, 검수 콘텐츠 전체를 JSON만으로 렌더링할 수 있는 범위가 넓어졌다(TASK-017 IndexedDB 저장 대비).

## 3. 검증 명령 실행 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| 린트 | `npm run lint` | 통과, 종료 코드 0 |
| 타입체크 | `npm run typecheck` | 통과, `next typegen` 후 `tsc --noEmit`, 종료 코드 0 |
| 단위 테스트 | `npm test` | 17개 파일 134개 테스트 통과(신규 1개 포함), 종료 코드 0 |
| 프로덕션 빌드 | `npm run build -- --webpack` | 성공, `/learn/first-video` SSG 프리렌더 유지, 종료 코드 0 |
| E2E | `npm run test:e2e -- --reporter=line` | 14개 통과, 종료 코드 0 |
| diff 형식 | `git diff --check` | 통과, 종료 코드 0 (LF→CRLF 안내 경고만 출력) |
| 시각적 회귀 | JSON 값이 기존 문구 그대로이므로 렌더링 불변 — 컴포넌트 테스트로 검증 | 지시서 검증 목록에 없어 스크린샷 비교는 생략 |

테스트 보강 내용:
- `lib/content/schema.test.ts`: 신규 6개 필드 수용 케이스 확장, 공백 `footerText` 거부, 공백 `statsLabels.required` 거부, `statsLabels` 미정의 키(`unit`) 거부 추가
- `components/LearningWorkspace.test.tsx`: 폴백 시 stats 라벨·라우트 카드 제목·세그먼트 CTA·사이드 노트 요약·푸터 기본 문구 렌더링 단언 추가, 데이터 제공 시 JSON 문구 사용과 기본 문구 미사용(`queryByText` null) 단언 추가, `valueCopyPrefix` 조합 렌더링 테스트 신규 추가

## 4. 커밋 해시

- `98c9040` (`refactor: 마지막 하드코딩 제거 및 저장소 경량화 준비`), 6개 파일 변경, 114 insertions(+), 9 deletions(-)
- 본 결과서는 별도 `docs:` 커밋으로 반영한다.

## 5. 남은 이슈

- 여전히 컴포넌트에 하드코딩으로 남은 문구: 사이드 노트 요약 3종("핵심 개념 N개" — 동적 카운트 포함, "주의사항 더 보기", "공식자료와 원본"), 실습 프롬프트 라벨("실습에 바로 쓰는 프롬프트"), 검수 기준 문구("영상 내용 검수 완료 · 기능 정보는 … 기준"), 세그먼트 유형 라벨(필수/선택/참고), 영상 미연결 문구("영상 연결 대기"). 이번 지시서 6개 필드 목록 밖이다.
- `STEP_COUNT = 3`은 여전히 모듈 상수다. 콘텐츠별 학습 단계 수를 데이터로 바꾸려면 별도 필드가 필요하다.
- IndexedDB 마이그레이션은 지시서대로 TASK-017에서 진행한다.
