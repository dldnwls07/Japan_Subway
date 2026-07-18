# Fable 5 (Max 모드) 킥오프 프롬프트

> 아래 내용을 그대로 복사해서 첫 메시지로 붙여넣으세요. `일본_지하철역_타자게임_개발계획서_개정판.docx`와 `docs/` 폴더 전체(README.md, backend-spec.md, mobile-spec.md, translation-engine-spec.md, devops-deployment.md, api-spec.md)를 함께 업로드/연결해야 합니다.

---

일본 지하철역 이름 타자 게임 애플리케이션을 실제로 개발한다. 시작하기 전에 첨부된 문서를 전부 읽어라.

## 무엇을 만드는가

일본 전역의 지하철·철도 노선도를 기반으로, 사용자가 실제 지리 데이터(GeoJSON/TopoJSON) 위에 투영된 노선을 따라 열차를 이동시키며 일본어 역명을 한글로 타이핑하는 웹+모바일 게임이다. 국립국어원 외래어 표기법 기반의 정교한 일본어→한글 변환이 핵심 차별점이며, 랭킹 시스템을 갖춘 실제 서비스 출시가 목표다. (경쟁 서비스로 metrotyping.kr, K지하철, 열차타자가 이미 존재하며 그중 K지하철은 이미 도쿄·오사카를 다국어로 서비스 중이니 참고할 것.)

## 참고 문서 (읽는 순서)

1. `일본_지하철역_타자게임_개발계획서_개정판.docx` — 전체 아키텍처, 일정(1장), 리스크(11장), 벤치마킹(8장), 예산(12장), 백엔드 개요(14장)
2. `docs/README.md` — 아래 문서들의 인덱스
3. `docs/translation-engine-spec.md` — 번역 엔진 (최우선 착수 대상)
4. `docs/mobile-spec.md` — 웹/RN 한글 IME 입력 처리
5. `docs/backend-spec.md` — FastAPI 랭킹/스코어 백엔드
6. `docs/devops-deployment.md` — CI/CD, Docker, 배포
7. `docs/api-spec.md` — API 레퍼런스

## 확정된 의사결정 — 재검토 없이 그대로 따를 것

- 코어: TypeScript 모노레포 (pnpm + Turborepo)
- 웹: React 18 + Vite 5 / 모바일: React Native(Expo). Swift·Kotlin 완전 네이티브로 재작성하지 않는다 (계획서 2.3절에서 이미 트레이드오프 검토 완료).
- 지도: d3-geo + topojson-client. 데이터는 빌드타임에 정적 GeoJSON→TopoJSON으로 변환, 런타임 API 호출 없음.
- 번역: kuroshiro(한자→가나, 빌드타임 전용 devDependency) + 자체 구현 가나→한글 변환기. **kanabarum은 사용하지 않는다(존재하지 않는 패키지로 확인됨)**. hangulize는 런타임 의존성으로 쓰지 않고 QA 골든 데이터셋 출처로만 참고한다.
- 백엔드: Python FastAPI + PostgreSQL + Redis(ZSET 랭킹 캐시), Fly.io 배포.
- 한글 입력 검증: **keydown 이벤트로 정오답을 판정하지 않는다.** 웹은 compositionend/input 이벤트, React Native는 텍스트 diff 기반으로 완성된 음절만 채점한다 (mobile-spec.md 참고).
- 브랜치 전략: GitHub Flow(main + feature/*). iOS/Android/Web을 나눈 영구 브랜치는 만들지 않는다 — 모노레포 공유 패키지가 브랜치 간에 계속 어긋나기 때문.

## 시작 지점: Phase 0 (전국 데이터를 한꺼번에 다루지 않는다)

도쿄메트로 긴자선(19개 역) 하나로 다음 두 가지를 먼저 검증한다. 검증 전에는 다른 노선이나 플랫폼으로 확장하지 않는다.

1. `docs/translation-engine-spec.md` 기준 가나→한글 변환기를 구현하고, 국립국어원 용례 기반 골든 데이터셋 테스트를 통과시킨다.
2. 긴자선 19개 역 데이터로 게임 루프(지도 렌더링 → 타이핑 입력 → 채점 → 열차 이동 애니메이션)를 최소 동작 수준까지 만든다.

## 미해결 항목 — 만나면 추측하지 말고 먼저 물어볼 것

- 어두/어중 파열음 매핑, 촉음 동화 규칙의 실제 대응표 값 (국어학 자료 대조 필요 — 확신 없이 임의로 채우지 말 것)
- 백엔드 device_id 기반 인증에서 계정 공유·탈취로 인한 리더보드 오염 방지책 최종안
- 닉네임 유니크 정책, 소셜 로그인 도입 여부와 도입 시점

## 도구 사용

연결된 skills/plugin이 있다면 적극 활용해라. 특히 코드 스캐폴딩, GitHub 연동, 패키지 관리, 문서 생성과 관련된 것이 있으면 먼저 무엇이 사용 가능한지 확인하고 시작해라.

## 지금 바로 해줬으면 하는 것

1. 첨부 문서를 읽고 이해한 내용을 3~5줄로 요약해서 먼저 보여줘라 (내가 컨텍스트가 맞는지 확인한 뒤 진행 승인한다).
2. 승인 후: `devops-deployment.md`의 폴더 구조 그대로 모노레포를 스캐폴딩한다 (apps/web, apps/mobile, apps/api, packages/core-engine, packages/geo-render, packages/translation-pipeline, packages/ui-kit).
3. 이어서 Phase 0 — 번역 엔진부터 착수한다.
