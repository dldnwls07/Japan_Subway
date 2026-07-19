"""Storage abstraction for the ranking/score backend.

`Store` is the repository interface the routers depend on. `InMemoryStore` is the
only implementation today; a Postgres/Redis-backed implementation (SQLModel +
Redis ZSET per backend-spec.md §3/§7) can be dropped in later without touching
the routers, because they only ever see the `Store` protocol.

Domain records mirror backend-spec.md §3 (Device / Line / RunToken / Run) but use
plain dataclasses instead of SQLModel tables so the slice stays dependency-light
and fully testable now.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Protocol
from uuid import UUID, uuid4


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class Device:
    nickname: str
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=_utcnow)
    is_banned: bool = False


@dataclass
class Line:
    id: str
    name_ko: str
    station_count: int
    total_chars: int  # sum of Korean-spelled station-name characters (anti-cheat basis)


@dataclass
class RunToken:
    device_id: UUID
    line_id: str
    mode: str
    token: UUID = field(default_factory=uuid4)
    issued_at: datetime = field(default_factory=_utcnow)
    consumed: bool = False


@dataclass
class Run:
    device_id: UUID
    line_id: str
    mode: str
    duration_ms: int
    keystrokes: int
    accuracy: float
    wpm: float
    cpm: float
    id: UUID = field(default_factory=uuid4)
    is_flagged: bool = False
    created_at: datetime = field(default_factory=_utcnow)


@dataclass
class LeaderboardEntry:
    rank: int
    nickname: str
    wpm: float
    accuracy: float
    created_at: datetime


class Store(Protocol):
    """Repository interface the routers depend on."""

    def add_device(self, nickname: str) -> Device: ...
    def get_device(self, device_id: UUID) -> Device | None: ...
    def issue_access_token(self, device_id: UUID) -> str: ...
    def device_id_for_token(self, token: str) -> UUID | None: ...

    def get_line(self, line_id: str) -> Line | None: ...
    def add_line(self, line: Line) -> Line: ...

    def add_run_token(self, device_id: UUID, line_id: str, mode: str) -> RunToken: ...
    def get_run_token(self, token: UUID) -> RunToken | None: ...
    def consume_run_token(self, token: UUID) -> None: ...

    def add_run(self, run: Run) -> Run: ...
    def top_wpm(self, line_id: str, mode: str) -> float | None: ...
    def leaderboard(self, line_id: str, mode: str) -> list[tuple[Device, Run]]: ...
    def rank_of(self, device_id: UUID, line_id: str, mode: str) -> int | None: ...
    def personal_bests(self, device_id: UUID) -> list[tuple[Run, int]]: ...


class InMemoryStore:
    """In-memory `Store` implementation. Not thread-safe; fine for tests/dev."""

    def __init__(self) -> None:
        self._devices: dict[UUID, Device] = {}
        self._lines: dict[str, Line] = {}
        self._run_tokens: dict[UUID, RunToken] = {}
        self._runs: list[Run] = []
        self._access_tokens: dict[str, UUID] = {}

    # devices -----------------------------------------------------------------
    def add_device(self, nickname: str) -> Device:
        device = Device(nickname=nickname)
        self._devices[device.id] = device
        return device

    def get_device(self, device_id: UUID) -> Device | None:
        return self._devices.get(device_id)

    def issue_access_token(self, device_id: UUID) -> str:
        # DEFERRED: JWT-vs-cookie is undecided (kickoff-prompt.md). We issue an
        # opaque random token now; a stateless JWT can replace this later.
        token = uuid4().hex
        self._access_tokens[token] = device_id
        return token

    def device_id_for_token(self, token: str) -> UUID | None:
        return self._access_tokens.get(token)

    # lines -------------------------------------------------------------------
    def get_line(self, line_id: str) -> Line | None:
        return self._lines.get(line_id)

    def add_line(self, line: Line) -> Line:
        self._lines[line.id] = line
        return line

    # run tokens --------------------------------------------------------------
    def add_run_token(self, device_id: UUID, line_id: str, mode: str) -> RunToken:
        token = RunToken(device_id=device_id, line_id=line_id, mode=mode)
        self._run_tokens[token.token] = token
        return token

    def get_run_token(self, token: UUID) -> RunToken | None:
        return self._run_tokens.get(token)

    def consume_run_token(self, token: UUID) -> None:
        row = self._run_tokens.get(token)
        if row is not None:
            row.consumed = True

    # runs / ranking ----------------------------------------------------------
    def add_run(self, run: Run) -> Run:
        self._runs.append(run)
        return run

    def _best_per_device(self, line_id: str, mode: str) -> dict[UUID, Run]:
        best: dict[UUID, Run] = {}
        for run in self._runs:
            if run.line_id != line_id or run.mode != mode:
                continue
            current = best.get(run.device_id)
            if current is None or run.wpm > current.wpm:
                best[run.device_id] = run
        return best

    def top_wpm(self, line_id: str, mode: str) -> float | None:
        best = self._best_per_device(line_id, mode)
        if not best:
            return None
        return max(run.wpm for run in best.values())

    def _ordered_best(self, line_id: str, mode: str) -> list[Run]:
        best = self._best_per_device(line_id, mode)
        # Highest wpm first; earlier submission wins ties.
        return sorted(best.values(), key=lambda r: (-r.wpm, r.created_at))

    def leaderboard(self, line_id: str, mode: str) -> list[tuple[Device, Run]]:
        result: list[tuple[Device, Run]] = []
        for run in self._ordered_best(line_id, mode):
            device = self._devices.get(run.device_id)
            if device is not None:
                result.append((device, run))
        return result

    def rank_of(self, device_id: UUID, line_id: str, mode: str) -> int | None:
        ordered = self._ordered_best(line_id, mode)
        for index, run in enumerate(ordered, start=1):
            if run.device_id == device_id:
                return index
        return None

    def personal_bests(self, device_id: UUID) -> list[tuple[Run, int]]:
        seen: set[tuple[str, str]] = set()
        result: list[tuple[Run, int]] = []
        for run in self._runs:
            if run.device_id != device_id:
                continue
            key = (run.line_id, run.mode)
            if key in seen:
                continue
            seen.add(key)
            best = self._best_per_device(run.line_id, run.mode)[device_id]
            rank = self.rank_of(device_id, run.line_id, run.mode)
            assert rank is not None
            result.append((best, rank))
        return result


def seed_default_lines(store: Store) -> None:
    """Seed the Phase-0 line (Tokyo Metro Ginza, 19 stations) used for validation.

    The authoritative line/total_chars data comes from the `data/` pipeline
    (owned by another agent). This is a stand-in so the anti-cheat validator and
    ranking flow are exercisable today.
    """
    store.add_line(
        Line(id="tokyo-metro-ginza", name_ko="도쿄메트로 긴자선", station_count=19, total_chars=120)
    )
