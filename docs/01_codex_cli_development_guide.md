# Codex CLI 개발 실행 가이드

## 1. 목적

Codex CLI를 사용해 개인용 바이브코딩 YouTube 학습 사이트 v0.1을 단계적으로 개발한다.

전체 사이트를 한 번에 구현하지 않고 다음 순서로 진행한다.

```text
계획 확인
→ 첫 영상 학습 페이지 구현
→ 테스트
→ 코드 검토
→ 문제 수정
→ Git 커밋
```

## 2. v0.1 개발 범위

### 포함 기능

- 영상 제목, 채널, 게시일, 최신성 상태
- 이 영상을 볼 가치
- 10줄 이내 핵심 요약
- 필수·선택·참고 영상 구간
- 직접 해보기
- 복사 가능한 프롬프트와 코드
- 핵심 개념
- 주의사항
- 공식자료와 원본 링크
- 모바일 우선 반응형 화면

### 제외 기능

- 로그인
- 퀴즈
- 진도 체크
- 반복 복습
- 오답노트
- 사용자 통계
- 데이터베이스
- OpenAI API
- YouTube API
- 자동 수집
- 자동 배포

## 3. Windows 준비

PowerShell에서 Git과 Node.js를 설치한다.

```powershell
winget install --id Git.Git
winget install --id OpenJS.NodeJS.LTS
```

Codex CLI를 설치한다.

```powershell
npm install -g @openai/codex
codex --version
```

## 4. 프로젝트 준비

```powershell
cd C:\workspace
mkdir bive-learning
cd bive-learning

git init
git branch -M main
git commit --allow-empty -m "chore: initialize repository"
```

이미 프로젝트가 만들어져 있다면 다음처럼 이동한다.

```powershell
cd C:\workspace\bive-learning
```

## 5. Codex CLI 실행

프로젝트 루트에서 실행한다.

```powershell
codex
```

Codex CLI 안에서 현재 상태와 권한을 확인한다.

```text
/status
/permissions
```

권장 권한:

- 현재 프로젝트 폴더 읽기·쓰기 허용
- 외부 명령이나 네트워크는 필요할 때 승인
- 프로젝트 외부 파일 수정 금지
- 승인 및 샌드박스 우회 옵션 사용 금지

프로젝트 작업 규칙을 생성한다.

```text
/init
```

## 6. 1차 작업: 구현 계획만 작성

다음 프롬프트를 Codex CLI에 입력한다.

```text
이 저장소에 개인용 바이브코딩 YouTube 학습 사이트 v0.1을 개발하려 한다.

이번 작업에서는 아직 코드를 작성하거나 파일을 수정하지 마라.
저장소 상태를 확인하고 구현 계획만 작성하라.

프로젝트 목적:
- 최신 바이브코딩 자료와 YouTube 영상을 모은다.
- 좋은 영상을 빠르게 찾는다.
- 영상의 핵심만 이해한다.
- 중요한 구간만 시청한다.
- 프롬프트와 코드를 복사해 직접 실행한다.

기술 방향:
- Next.js App Router
- TypeScript
- Tailwind CSS
- GitHub MDX는 검수된 정식 콘텐츠에만 사용
- 자동 생성 콘텐츠는 Markdown + 구조화 JSON 사용
- 모바일 우선 반응형 화면

v0.1 포함 기능:
1. 영상 제목, 채널, 게시일, 최신성 상태
2. 이 영상을 볼 가치
3. 10줄 이내 핵심 요약
4. 필수·선택·참고 영상 구간
5. 직접 해보기
6. 복사 가능한 프롬프트와 코드
7. 핵심 개념
8. 주의사항
9. 공식자료와 원본 링크

v0.1 제외 기능:
- 로그인
- 퀴즈
- 진도 체크
- 반복 복습
- 오답노트
- 사용자 통계
- DB
- OpenAI API
- YouTube API
- 자동 수집
- 자동 배포

필요한 컴포넌트:
- YouTubePlayer
- VideoSegment
- CopyBlock
- PracticeSteps
- WarningBox
- SourceList

반드시 보고할 내용:
1. 권장 폴더 구조
2. 필요한 패키지
3. 콘텐츠 JSON 구조
4. MDX frontmatter 구조
5. 모바일 화면 구성
6. 구현 순서
7. 테스트 방법
8. 확인이 필요한 결정
9. 예상 위험

모르는 정보는 추측하지 말고 확인 필요로 표시하라.
```

### 계획 검토 기준

- 첫 영상 학습 페이지만 구현하는가?
- 로그인·퀴즈·진도 기능이 제외됐는가?
- 데이터베이스와 자동 수집이 제외됐는가?
- 자동 생성 MDX 실행을 전제로 하지 않는가?
- 모바일 화면을 우선하는가?
- 영상 내용을 추측하지 않도록 설계됐는가?

## 7. 2차 작업: 첫 영상 학습 페이지 구현

아래 값은 실제 영상 정보로 교체한다.

```text
첫_영상_URL
첫_영상_제목
첫_영상_채널
확인된_게시일
ko 또는 en
```

계획이 적절하면 다음 프롬프트를 입력한다.

```text
계획을 승인한다.

이번 작업에서는 Phase 1만 구현하라.

목표:
실제 영상 1개를 대상으로 모바일 우선 학습 페이지를 완성한다.

영상 정보:
- URL: 첫_영상_URL
- 제목: 첫_영상_제목
- 채널: 첫_영상_채널
- 게시일: 확인된_게시일
- 원본 언어: ko 또는 en

구현 범위:
1. Next.js App Router + TypeScript + Tailwind CSS 프로젝트 구성
2. MDX 설정
3. 첫 영상용 정적 MDX 콘텐츠 1개
4. 다음 컴포넌트 구현
   - YouTubePlayer
   - VideoSegment
   - CopyBlock
   - PracticeSteps
   - WarningBox
   - SourceList
5. 휴대폰 화면 우선 디자인
6. 프롬프트와 코드는 일반 문자열로만 처리
7. 임의 HTML, JSX, 외부 스크립트 실행 금지
8. API 키와 환경변수는 사용하지 않음

화면 순서:
1. 이 영상을 볼 가치
2. 10줄 이내 핵심 요약
3. 꼭 볼 구간
4. 직접 해보기
5. 복사할 프롬프트와 코드
6. 핵심 개념
7. 주의사항
8. 공식자료와 관련 영상

영상 구간 규칙:
- start와 end를 모두 사용
- required 최대 5개
- optional 최대 3개
- 구간 중복 금지
- 영상 길이 초과 금지

중요:
- 영상 내용과 자막이 제공되지 않았다면 내용을 추측하지 마라.
- 확인되지 않은 요약·구간·프롬프트를 만들지 마라.
- 확인되지 않은 부분은 TODO 데이터로 명확히 표시하라.
- 요구하지 않은 DB, 로그인, API, 자동 수집은 구현하지 마라.

검증:
- lint 실행
- TypeScript 검사
- production build 실행
- 테스트 결과 보고
- 변경 파일 목록 보고
- 남은 TODO와 위험 보고

작업이 끝날 때까지 필요한 파일 작성과 검증을 진행하라.
```

## 8. 변경사항 검토

구현이 끝나면 다음 명령을 실행한다.

```text
/review
```

추가로 다음 검토 프롬프트를 입력한다.

```text
방금 구현한 변경사항을 검토해라.

확인 항목:
1. 요구하지 않은 기능이 추가됐는가?
2. 모바일 360px 화면에서 가로 스크롤이 발생하는가?
3. 영상 구간의 start/end 값이 유효한가?
4. CopyBlock이 텍스트를 실행하지 않고 복사만 하는가?
5. 임의 HTML 또는 JSX 실행 위험이 있는가?
6. 확인되지 않은 영상 내용이 사실처럼 작성됐는가?
7. lint, TypeScript 검사, production build가 모두 통과하는가?

문제가 있으면 심각도와 파일 위치를 보고하라.
아직 수정하지 말고 검토 결과만 알려라.
```

## 9. 검토 결과 수정

```text
검토 결과 중 심각도 높은 문제와 중간 문제를 수정해라.

범위:
- 검토에서 발견된 문제만 수정
- 새로운 기능 추가 금지
- DB, 로그인, API, 자동 수집 추가 금지

수정 후:
1. lint 실행
2. TypeScript 검사
3. production build 실행
4. 변경 파일과 테스트 결과 보고
```

## 10. Git 저장

Codex CLI를 종료한 뒤 변경사항을 확인한다.

```powershell
git status
git diff
```

문제가 없다면 커밋한다.

```powershell
git add .
git commit -m "feat: add first video learning page"
```

GitHub 저장소가 연결되어 있으면 push한다.

```powershell
git push origin main
```

## 11. GitHub 저장소 연결

GitHub에서 비공개 저장소를 만든 후 다음 명령을 실행한다.

```powershell
git remote add origin https://github.com/사용자명/bive-learning.git
git push -u origin main
```

API 키와 환경변수는 GitHub에 올리지 않는다.

```gitignore
.env
.env.local
.env.production
```

## 12. 이후 개발 순서

첫 영상 페이지가 만족스러울 때만 다음 작업을 한 단계씩 요청한다.

1. 콘텐츠 JSON Schema 확정
2. 영어 자막을 이용한 한국어 학습자료 작성
3. 영상 5개로 확대
4. 승인·숨김·재생성 기능
5. YouTube 메타데이터 수집
6. OpenAI 분석 연결
7. 최신 웹 자료 검색
8. 자동 수집 작업

각 단계는 다음 작업 흐름을 반복한다.

```text
작업 지시
→ 구현
→ 테스트
→ /review
→ 수정
→ Git 커밋
```

## 13. 첫 영상 선정 기준

- 최근에 게시된 영상
- 15~40분 길이
- 학습 목표가 한 가지로 명확함
- 직접 따라 할 작업이 있음
- 한국어 또는 영어 자막을 합법적으로 사용할 수 있음
- 공식 문서로 내용을 교차 확인할 수 있음
- 코드·설정·프롬프트를 실제로 검증할 수 있음

