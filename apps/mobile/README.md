# apps/mobile

Phase 2 대상 (도쿄 근교 JR·주요 사철 확장 시점, kickoff-prompt.md §시작 지점 로드맵 참고).
Phase 0 범위는 `apps/web`의 긴자선 게임 루프 검증까지다. 여기는 `devops-deployment.md`의
모노레포 폴더 구조를 그대로 맞추기 위한 자리 표시자이며, 아직 Expo 프로젝트가
초기화되지 않았다.

착수 시 `mobile-spec.md`의 `useComposedInput`(텍스트 diff 기반, `packages/core-engine`에
이미 구현되어 있는 웹 버전과는 다른 RN 전용 구현 필요)과 AsyncStorage 저장소 절을 먼저
참고할 것.
