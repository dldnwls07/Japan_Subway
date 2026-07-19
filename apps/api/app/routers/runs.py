"""Run lifecycle: start (issue run_token) + complete (submit & validate).

backend-spec.md §4.2/§4.3/§5. The run_token is issued server-side and consumed
exactly once so the client can't fabricate start/stop timing.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.deps import CurrentDevice, StoreDep
from app.schemas import CompleteRunRequest, CompleteRunResponse, StartRunRequest, StartRunResponse
from app.services.anti_cheat import should_flag_for_review, validate_run, validate_timing
from app.store import Run

router = APIRouter(prefix="/runs", tags=["runs"])


def _compute_metrics(duration_ms: int, keystrokes: int) -> tuple[float, float]:
    """cpm = keystrokes per minute; wpm approximated as cpm / 5 (5 chars ≈ 1 word)."""
    duration_min = duration_ms / 60_000
    cpm = keystrokes / duration_min
    wpm = cpm / 5.0
    return round(wpm, 1), round(cpm, 1)


@router.post("/start", response_model=StartRunResponse, status_code=status.HTTP_201_CREATED)
async def start_run(payload: StartRunRequest, store: StoreDep, device: CurrentDevice) -> StartRunResponse:
    if store.get_line(payload.line_id) is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "line_not_found", "message": "존재하지 않는 노선입니다."},
        )
    token = store.add_run_token(device_id=device.id, line_id=payload.line_id, mode=payload.mode)
    return StartRunResponse(run_token=token.token, expires_in=settings.run_token_ttl_seconds)


@router.post("/complete", response_model=CompleteRunResponse, status_code=status.HTTP_201_CREATED)
async def complete_run(
    payload: CompleteRunRequest, store: StoreDep, device: CurrentDevice
) -> CompleteRunResponse:
    token_row = store.get_run_token(payload.run_token)
    if token_row is not None and token_row.consumed and token_row.device_id == device.id:
        run = store.run_for_token(token_row.token)
        if run is not None:
            rank = store.rank_of(device.id, run.line_id, run.mode)
            assert rank is not None
            return CompleteRunResponse(
                run_id=run.id,
                wpm=run.wpm,
                cpm=run.cpm,
                rank=rank,
                verified=not run.is_flagged,
            )

    if token_row is None or token_row.consumed or token_row.device_id != device.id:
        raise HTTPException(
            status_code=422,
            detail={"code": "invalid_or_used_token", "message": "run_token이 없거나 이미 사용되었습니다."},
        )

    elapsed = datetime.now(timezone.utc) - token_row.issued_at
    age_sec = elapsed.total_seconds()
    if age_sec > settings.run_token_ttl_seconds:
        raise HTTPException(
            status_code=422,
            detail={"code": "token_expired", "message": "run_token 유효시간이 초과되었습니다."},
        )

    line = store.get_line(token_row.line_id)
    if line is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "line_not_found", "message": "존재하지 않는 노선입니다."},
        )

    result = validate_run(line, payload.duration_ms, payload.keystrokes, payload.accuracy)
    if not result.ok:
        assert result.error_code is not None
        raise HTTPException(
            status_code=422,
            detail={"code": result.error_code, "message": "기록 검증에 실패했습니다."},
        )

    timing_result = validate_timing(payload.duration_ms, elapsed.total_seconds() * 1000)
    if not timing_result.ok:
        assert timing_result.error_code is not None
        raise HTTPException(
            status_code=422,
            detail={"code": timing_result.error_code, "message": "기록 검증에 실패했습니다."},
        )

    wpm, cpm = _compute_metrics(payload.duration_ms, payload.keystrokes)

    top_wpm = store.top_wpm(token_row.line_id, token_row.mode)
    is_flagged = top_wpm is not None and should_flag_for_review(wpm, top_wpm)

    run = store.add_run(
        Run(
            device_id=device.id,
            line_id=token_row.line_id,
            mode=token_row.mode,
            duration_ms=payload.duration_ms,
            keystrokes=payload.keystrokes,
            accuracy=payload.accuracy,
            wpm=wpm,
            cpm=cpm,
            is_flagged=is_flagged,
        )
    )
    store.consume_run_token(token_row.token, run.id)
    rank = store.rank_of(device.id, token_row.line_id, token_row.mode)
    assert rank is not None
    return CompleteRunResponse(run_id=run.id, wpm=wpm, cpm=cpm, rank=rank, verified=not is_flagged)
