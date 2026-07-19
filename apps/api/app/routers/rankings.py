"""Leaderboard reads (backend-spec.md §4.4/§4.5)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query

from app.deps import CurrentDevice, StoreDep
from app.schemas import (
    LeaderboardItem,
    LeaderboardResponse,
    Mode,
    PersonalBest,
    Period,
    RankingsMeResponse,
)

router = APIRouter(prefix="/rankings", tags=["rankings"])


@router.get("", response_model=LeaderboardResponse)
async def get_rankings(
    store: StoreDep,
    line_id: str,
    mode: Mode,
    period: Period = "all",
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> LeaderboardResponse:
    # NOTE: `period` filtering is a no-op stub for now — daily/weekly windowing
    # lands with the Redis ZSET period keys (backend-spec.md §7). The parameter is
    # accepted and echoed so the wire contract is stable.
    entries = store.leaderboard(line_id, mode)
    page = entries[offset : offset + limit]
    items = [
        LeaderboardItem(
            rank=offset + i + 1,
            nickname=device.nickname,
            wpm=run.wpm,
            accuracy=run.accuracy,
            created_at=run.created_at,
        )
        for i, (device, run) in enumerate(page)
    ]
    return LeaderboardResponse(
        line_id=line_id, mode=mode, period=period, total=len(entries), items=items
    )


@router.get("/me", response_model=RankingsMeResponse)
async def get_my_rankings(store: StoreDep, device: CurrentDevice) -> RankingsMeResponse:
    bests = [
        PersonalBest(line_id=run.line_id, mode=run.mode, wpm=run.wpm, rank=rank)  # type: ignore[arg-type]
        for run, rank in store.personal_bests(device.id)
    ]
    return RankingsMeResponse(device_id=device.id, personal_bests=bests)
