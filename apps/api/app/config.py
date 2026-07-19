"""Runtime configuration.

backend-spec.md §2 specifies these as environment variables loaded via
pydantic-settings once the real infra (DB/Redis/JWT) is wired up. For this
in-memory slice we read the same env var names with plain defaults so behaviour
matches the spec without pulling in pydantic-settings yet.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field


def _csv_tuple(raw: str) -> tuple[str, ...]:
    """Parse a comma-separated env value into a tuple, dropping blanks."""
    return tuple(part.strip() for part in raw.split(",") if part.strip())


def _cors_origins_from_env() -> tuple[str, ...]:
    # backend-spec.md §2 `CORS_ORIGINS`: comma-separated origin allowlist.
    # Default covers the Vite dev server; production origins come via env.
    return _csv_tuple(os.getenv("CORS_ORIGINS", "http://localhost:5173"))


@dataclass(frozen=True)
class Settings:
    run_token_ttl_seconds: int = int(os.getenv("RUN_TOKEN_TTL_SECONDS", "600"))
    max_keystrokes_per_sec: int = int(os.getenv("MAX_KEYSTROKES_PER_SEC", "20"))
    # Grace (ms) allowed between the client-claimed duration_ms and the
    # server-observed elapsed time since /runs/start (clock skew + latency).
    run_duration_tolerance_ms: int = int(os.getenv("RUN_DURATION_TOLERANCE_MS", "5000"))
    version: str = os.getenv("API_VERSION", "0.0.1")
    cors_origins: tuple[str, ...] = field(default_factory=_cors_origins_from_env)


settings = Settings()
