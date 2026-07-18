# 백엔드 상세 명세 (Python FastAPI)

> 상위 문서: `일본_지하철역_타자게임_개발계획서_개정판.docx` 14장(백엔드 아키텍처)의 구현 상세를 정의한다.
> 위치: `apps/api/`

## 1. 프로젝트 구조

```
apps/api/
├── app/
│   ├── main.py              # FastAPI 앱 엔트리포인트
│   ├── config.py            # 환경변수 로딩 (pydantic-settings)
│   ├── db.py                 # DB 세션/엔진 설정
│   ├── models.py             # SQLModel 테이블 정의
│   ├── schemas.py            # 요청/응답 Pydantic 스키마
│   ├── deps.py                # 의존성 주입 (DB 세션, rate limiter 등)
│   ├── routers/
│   │   ├── runs.py           # /api/v1/runs/*
│   │   ├── rankings.py       # /api/v1/rankings/*
│   │   ├── auth.py           # /api/v1/auth/*
│   │   └── health.py         # /api/v1/health
│   ├── services/
│   │   ├── anti_cheat.py     # 부정 기록 검증 로직
│   │   └── ranking_cache.py  # Redis ZSET 랭킹 캐시
│   └── migrations/            # Alembic 마이그레이션
├── tests/
│   ├── conftest.py
│   ├── test_runs.py
│   └── test_anti_cheat.py
├── pyproject.toml
├── uv.lock
├── Dockerfile
└── .env.example
```

## 2. 환경 변수 (`.env.example`)

```env
ENV=development
DATABASE_URL=postgresql+asyncpg://metrotyping:metrotyping@localhost:5432/metrotyping
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=change-me-in-production
JWT_EXPIRE_MINUTES=43200
CORS_ORIGINS=http://localhost:5173,https://your-web-domain.com,exp://localhost:19000
RUN_TOKEN_TTL_SECONDS=600
RATE_LIMIT_RUNS_PER_MINUTE=10
MAX_KEYSTROKES_PER_SEC=20
SENTRY_DSN=
```

## 3. DB 스키마 (SQLModel)

```python
# app/models.py
from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field


class Device(SQLModel, table=True):
    """닉네임 + 기기 식별자 기반의 경량 계정. 1차 출시는 소셜 로그인 없이 시작."""
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    nickname: str = Field(index=True, max_length=20)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_banned: bool = Field(default=False)


class Line(SQLModel, table=True):
    """3장 정적 데이터 파이프라인에서 빌드 시점에 시드(seed)되는 참조 테이블.
    total_chars는 서버 측 최소 소요시간 계산(부정 기록 방지)에 사용된다."""
    id: str = Field(primary_key=True)          # 예: "tokyo-metro-ginza"
    name_ko: str
    station_count: int
    total_chars: int                            # 전체 역명 한글 표기 글자 수 합


class RunToken(SQLModel, table=True):
    """게임 시작 시 발급, 완료 시 1회 소비. 클라이언트가 시작/종료 시각을
    조작하지 못하도록 서버가 직접 타이밍을 통제하기 위한 장치."""
    token: UUID = Field(default_factory=uuid4, primary_key=True)
    device_id: UUID = Field(foreign_key="device.id", index=True)
    line_id: str = Field(foreign_key="line.id")
    mode: str                                    # "rapid_30s" | "speed_run" | "marathon"
    issued_at: datetime = Field(default_factory=datetime.utcnow)
    consumed: bool = Field(default=False)


class Run(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    device_id: UUID = Field(foreign_key="device.id", index=True)
    line_id: str = Field(foreign_key="line.id", index=True)
    mode: str = Field(index=True)
    duration_ms: int
    keystrokes: int
    accuracy: float                              # 0.0 ~ 1.0
    wpm: float
    cpm: float
    is_flagged: bool = Field(default=False)      # 이상치 모니터링 큐 대상
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
```

관계 요약: `Device 1—N Run`, `Line 1—N Run`, `Device 1—N RunToken`(소비 후에도 이력 보존).

## 4. API 엔드포인트 상세

인증: 모든 쓰기(POST) 요청은 `Authorization: Bearer <device_jwt>` 헤더 필요. `device_jwt`는 `/auth/session`에서 발급.

### 4.1 `POST /api/v1/auth/session` — 닉네임 등록/기기 세션 발급

```jsonc
// Request
{ "device_id": null, "nickname": "우진" }   // device_id가 null이면 신규 발급

// Response 201
{
  "device_id": "b3f1...-uuid",
  "nickname": "우진",
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer"
}
```

### 4.2 `POST /api/v1/runs/start` — 게임 시작(run_token 발급)

```jsonc
// Request
{ "line_id": "tokyo-metro-ginza", "mode": "speed_run" }

// Response 201
{ "run_token": "7c2e...-uuid", "expires_in": 600 }
```

### 4.3 `POST /api/v1/runs/complete` — 완주 기록 제출

```jsonc
// Request
{
  "run_token": "7c2e...-uuid",
  "duration_ms": 45230,
  "keystrokes": 312,
  "accuracy": 0.97
}

// Response 201 (검증 통과)
{
  "run_id": "9a1d...-uuid",
  "wpm": 82.4,
  "cpm": 411.2,
  "rank": 128,
  "verified": true
}

// Response 422 (검증 실패)
{ "error": { "code": "keystroke_rate_exceeded", "message": "초당 입력 속도가 물리적 상한을 초과했습니다." } }
```

### 4.4 `GET /api/v1/rankings` — 리더보드 조회

```
GET /api/v1/rankings?line_id=tokyo-metro-ginza&mode=speed_run&period=weekly&limit=50&offset=0
```

```jsonc
// Response 200
{
  "line_id": "tokyo-metro-ginza",
  "mode": "speed_run",
  "period": "weekly",
  "total": 10234,
  "items": [
    { "rank": 1, "nickname": "타자왕", "wpm": 121.5, "accuracy": 0.99, "created_at": "2026-07-15T02:10:00Z" }
  ]
}
```

### 4.5 `GET /api/v1/rankings/me` — 내 기록/순위

```jsonc
// Response 200
{
  "device_id": "b3f1...-uuid",
  "personal_bests": [
    { "line_id": "tokyo-metro-ginza", "mode": "speed_run", "wpm": 95.2, "rank": 842 }
  ]
}
```

### 4.6 `GET /api/v1/health`

```jsonc
{ "status": "ok", "db": "ok", "redis": "ok", "version": "2026.07.1" }
```

## 5. 부정 기록(Cheating) 방지 — 실제 구현

```python
# app/services/anti_cheat.py
from dataclasses import dataclass
from app.models import Line
from app.config import settings


@dataclass
class ValidationResult:
    ok: bool
    error_code: str | None = None


def validate_run(line: Line, duration_ms: int, keystrokes: int, accuracy: float) -> ValidationResult:
    duration_sec = duration_ms / 1000
    if duration_sec <= 0:
        return ValidationResult(False, "invalid_duration")

    if not (0.0 <= accuracy <= 1.0):
        return ValidationResult(False, "invalid_accuracy")

    keystrokes_per_sec = keystrokes / duration_sec
    if keystrokes_per_sec > settings.MAX_KEYSTROKES_PER_SEC:
        return ValidationResult(False, "keystroke_rate_exceeded")

    # 노선 총 글자 수 대비 이론적 최소 시간(초). 10% 여유를 둔다.
    theoretical_min_sec = line.total_chars / settings.MAX_KEYSTROKES_PER_SEC
    if duration_sec < theoretical_min_sec * 0.9:
        return ValidationResult(False, "duration_below_theoretical_minimum")

    return ValidationResult(True)


def should_flag_for_review(wpm: float, line_top_wpm: float) -> bool:
    """상위 랭킹 진입 기록(예: 현재 1위 대비 110% 이상)은 자동으로 검수 큐에 올린다."""
    return wpm > line_top_wpm * 1.10
```

`run_token` 소비 로직(타이밍 조작 방지 핵심):

```python
# app/routers/runs.py (발췌)
@router.post("/complete")
async def complete_run(payload: CompleteRunRequest, session: AsyncSession = Depends(get_session)):
    token_row = await session.get(RunToken, payload.run_token)
    if token_row is None or token_row.consumed:
        raise HTTPException(422, detail={"code": "invalid_or_used_token"})
    if (datetime.utcnow() - token_row.issued_at).total_seconds() > settings.RUN_TOKEN_TTL_SECONDS:
        raise HTTPException(422, detail={"code": "token_expired"})

    line = await session.get(Line, token_row.line_id)
    result = validate_run(line, payload.duration_ms, payload.keystrokes, payload.accuracy)
    if not result.ok:
        raise HTTPException(422, detail={"code": result.error_code})

    token_row.consumed = True
    run = Run(device_id=token_row.device_id, line_id=line.id, mode=token_row.mode, ...)
    session.add_all([token_row, run])
    await session.commit()
    return build_run_response(run)
```

## 6. 레이트 리밋

```python
# app/main.py (발췌)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

```python
# app/routers/runs.py
@router.post("/complete")
@limiter.limit(f"{settings.RATE_LIMIT_RUNS_PER_MINUTE}/minute")
async def complete_run(...): ...
```

## 7. 랭킹 캐시 (Redis ZSET)

```python
# app/services/ranking_cache.py
async def push_score(redis, line_id: str, mode: str, period_key: str, device_id: str, wpm: float) -> None:
    zset_key = f"rank:{line_id}:{mode}:{period_key}"
    await redis.zadd(zset_key, {device_id: wpm})

async def top_n(redis, line_id: str, mode: str, period_key: str, n: int = 50) -> list[tuple[str, float]]:
    zset_key = f"rank:{line_id}:{mode}:{period_key}"
    return await redis.zrevrange(zset_key, 0, n - 1, withscores=True)
```

`period_key` 예: `daily:2026-07-19`, `weekly:2026-W29`, `all`. 일별/주별 키는 TTL을 걸어 자동 만료시킨다.

## 8. 로컬 개발 환경

```bash
cd apps/api
uv sync                       # 의존성 설치
docker compose up -d db redis # DB/Redis 컨테이너 기동 (devops-deployment.md 참고)
uv run alembic upgrade head   # 마이그레이션
uv run uvicorn app.main:app --reload --port 8000
# http://localhost:8000/docs 에서 Swagger UI 확인
```

## 9. 테스트 예시 (pytest)

```python
# tests/test_anti_cheat.py
import pytest
from app.models import Line
from app.services.anti_cheat import validate_run

def make_line(total_chars=120):
    return Line(id="test-line", name_ko="테스트선", station_count=10, total_chars=total_chars)

def test_rejects_impossible_keystroke_rate():
    line = make_line()
    result = validate_run(line, duration_ms=1000, keystrokes=500, accuracy=1.0)
    assert not result.ok
    assert result.error_code == "keystroke_rate_exceeded"

def test_accepts_realistic_run():
    line = make_line(total_chars=120)
    result = validate_run(line, duration_ms=15000, keystrokes=120, accuracy=0.95)
    assert result.ok
```

## 10. 미결 사항 (구현 착수 전 확정 필요)

- [ ] `device_id` 탈취/공유 시 리더보드 오염 방지책 (기기 지문 추가? 소셜 로그인 선행?)
- [ ] `Line.total_chars` 산출 스크립트를 `data/scripts`(3장) 파이프라인의 어느 단계에 넣을지
- [ ] 신고/검수 큐(`is_flagged`)를 처리할 관리자 화면 또는 CLI 도구 필요 여부
- [ ] JWT vs 단순 세션 쿠키 — 모바일(RN)에서의 토큰 저장 방식(SecureStore)과 맞춰 최종 결정
