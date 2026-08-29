---
description: 현재 프로젝트의 Git 저장소만 대상으로 원격 저장소에 push한다
---

# Git Push

현재 프로젝트의 Git 저장소만 대상으로 원격 저장소에 push한다.

작업 순서:

1. 현재 저장소 루트를 확인한다.
   git rev-parse --show-toplevel

2. 현재 브랜치를 확인한다.
   git branch --show-current

3. git status를 확인한다.

4. 아직 커밋되지 않은 변경사항이 있으면
   push하지 말고 사용자에게 알려준다.

5. 원격 저장소를 확인한다.
   git remote -v

6. 현재 브랜치에 upstream이 있는지 확인한다.

7. upstream이 있으면:
   git push

8. upstream이 없으면:
   git push -u origin <현재브랜치>

주의:

- force push는 절대 사용하지 않는다.
- git push --force를 실행하지 않는다.
- 다른 브랜치로 push하지 않는다.
- 다른 repository를 건드리지 않는다.
- 오류가 발생하면 임의로 해결하지 말고 원인을 한국어로 설명한다.
