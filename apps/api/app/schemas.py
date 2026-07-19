"""Request/response Pydantic schemas (api-spec.md §4).

These are the authoritative wire shapes: api-spec.md explicitly says the code's
Pydantic schemas win over the prose doc when they disagree.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

Mode = Literal["rapid_30s", "speed_run", "marathon"]
Period = Literal["all", "daily", "weekly"]


# --- auth --------------------------------------------------------------------
class CreateSessionRequest(BaseModel):
    device_id: UUID | None = None  # null => issue a new device
    nickname: str = Field(min_length=1, max_length=20)


class CreateSessionResponse(BaseModel):
    device_id: UUID
    nickname: str
    access_token: str
    token_type: Literal["bearer"] = "bearer"


# --- runs --------------------------------------------------------------------
class StartRunRequest(BaseModel):
    line_id: str
    mode: Mode


class StartRunResponse(BaseModel):
    run_token: UUID
    expires_in: int


class CompleteRunRequest(BaseModel):
    run_token: UUID
    duration_ms: int = Field(gt=0)
    keystrokes: int = Field(ge=0)
    accuracy: float = Field(ge=0.0, le=1.0)


class CompleteRunResponse(BaseModel):
    run_id: UUID
    wpm: float
    cpm: float
    rank: int
    verified: bool


# --- rankings ----------------------------------------------------------------
class LeaderboardItem(BaseModel):
    rank: int
    nickname: str
    wpm: float
    accuracy: float
    created_at: datetime


class LeaderboardResponse(BaseModel):
    line_id: str
    mode: Mode
    period: Period
    total: int
    items: list[LeaderboardItem]


class PersonalBest(BaseModel):
    line_id: str
    mode: Mode
    wpm: float
    rank: int


class RankingsMeResponse(BaseModel):
    device_id: UUID
    personal_bests: list[PersonalBest]


# --- errors ------------------------------------------------------------------
class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail
