"""Runtime configuration.

backend-spec.md §2 specifies these as environment variables loaded via
pydantic-settings once the real infra (DB/Redis/JWT) is wired up. For this
in-memory slice we read the same env var names with plain defaults so behaviour
matches the spec without pulling in pydantic-settings yet.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    run_token_ttl_seconds: int = int(os.getenv("RUN_TOKEN_TTL_SECONDS", "600"))
    max_keystrokes_per_sec: int = int(os.getenv("MAX_KEYSTROKES_PER_SEC", "20"))
    version: str = os.getenv("API_VERSION", "0.0.1")


settings = Settings()
