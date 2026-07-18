# API 레퍼런스 (v1)

> FastAPI는 `/docs`(Swagger UI)와 `/openapi.json`을 자동 생성한다. 이 문서는 사람이 빠르게 훑어보기 위한 요약 레퍼런스이며, **실제 스펙의 원천은 코드(라우터의 Pydantic 스키마)**다. 둘이 어긋나면 코드가 맞다 — 이 문서를 갱신할 것.

- Base URL (개발): `http://localhost:8000/api/v1`
- Base URL (프로덕션): `https://api.<도메인>/api/v1`
- 인증: `Authorization: Bearer <access_token>` (발급: `POST /auth/session`)
- 버전 정책: 경로에 `v1` 고정. 하위 호환이 깨지는 변경은 `v2`로 분리하고 `v1`은 최소 6개월 유지.

## 엔드포인트 목록

| 엔드포인트 | 메서드 | 인증 | 설명 | 상세 |
|---|---|---|---|---|
| `/auth/session` | POST | 불필요 | 닉네임 등록 및 토큰 발급 | backend-spec.md §4.1 |
| `/runs/start` | POST | 필요 | 게임 시작, run_token 발급 | backend-spec.md §4.2 |
| `/runs/complete` | POST | 필요 | 완주 기록 제출·검증 | backend-spec.md §4.3 |
| `/rankings` | GET | 불필요 | 리더보드 조회 | backend-spec.md §4.4 |
| `/rankings/me` | GET | 필요 | 내 기록/순위 조회 | backend-spec.md §4.5 |
| `/health` | GET | 불필요 | 헬스체크 | backend-spec.md §4.6 |

## 공통 에러 응답 포맷

```json
{ "error": { "code": "string_snake_case", "message": "사람이 읽을 수 있는 설명" } }
```

| HTTP 상태 | 사용 시점 |
|---|---|
| 400 | 요청 형식 오류 (Pydantic validation error) |
| 401 | 토큰 없음/만료 |
| 404 | 리소스 없음 (예: 존재하지 않는 line_id) |
| 422 | 의미적으로 유효하지 않은 요청 (부정 기록 의심 포함, 14.3절) |
| 429 | 레이트 리밋 초과 |
| 500 | 서버 오류 (Sentry로 자동 리포트) |

## 에러 코드 사전

| code | 발생 위치 | 의미 |
|---|---|---|
| `invalid_or_used_token` | POST /runs/complete | run_token이 없거나 이미 소비됨 |
| `token_expired` | POST /runs/complete | run_token TTL(기본 600초) 초과 |
| `keystroke_rate_exceeded` | POST /runs/complete | 초당 타수가 물리적 상한 초과 (14.3절) |
| `duration_below_theoretical_minimum` | POST /runs/complete | 이론적 최소 시간보다 짧은 기록 |
| `invalid_duration` / `invalid_accuracy` | POST /runs/complete | 값 범위 오류 |
| `nickname_taken` | POST /auth/session | 닉네임 중복(닉네임 유니크 정책 채택 시) |
| `line_not_found` | 여러 엔드포인트 | 존재하지 않는 line_id |

## 페이지네이션 규칙 (`/rankings`)

- `limit` 기본 50, 최대 100.
- `offset` 기반 페이지네이션(랭킹은 실시간 변동이 커서 cursor 방식보다 offset이 단순하고 충분).
- 응답의 `total`은 근사치일 수 있음(Redis ZSET 카운트 기준, 초 단위 지연 허용).

## 로컬 확인 방법

```bash
uv run uvicorn app.main:app --reload
open http://localhost:8000/docs        # Swagger UI — 실제 요청 테스트 가능
open http://localhost:8000/openapi.json # 머신 판독용 전체 스펙
```

프론트엔드(웹/모바일)에서는 `openapi.json`을 `openapi-typescript` 등으로 돌려 TypeScript 타입을 자동 생성하는 것을 권장한다(수동 동기화로 인한 스키마 드리프트 방지).

```bash
pnpm dlx openapi-typescript http://localhost:8000/openapi.json -o packages/core-engine/src/api-types.ts
```
