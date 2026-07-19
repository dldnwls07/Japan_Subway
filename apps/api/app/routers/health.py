"""Health check (backend-spec.md §4.6)."""

from __future__ import annotations

from fastapi import APIRouter

from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    # DB/Redis are not wired up in this slice yet.
    return {
        "status": "ok",
        "db": "not_connected",
        "redis": "not_connected",
        "version": settings.version,
    }
