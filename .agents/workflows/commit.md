---
description: 빠른 한국어 Git 커밋
---

# 빠른 한국어 Git 커밋

현재 Git 변경사항을 확인하고 커밋한다.

작업 순서:

1. git status 확인
2. git diff --cached 확인
3. staged 변경사항만 분석
4. Conventional Commits 형식으로 한국어 커밋 메시지 작성
5. git commit 실행

형식:

<type>: <한국어 설명>

예:
feat: localStorage 저장 기능 추가
fix: 유튜브 URL 파싱 오류 수정
test: 저장소 테스트 추가

규칙:

- type은 영어
- 설명은 반드시 한국어
- staged 파일만 확인
- 프로젝트 전체 탐색 금지
- lint 실행하지 않음
- typecheck 실행하지 않음
- test 실행하지 않음
- build 실행하지 않음
