"""Dependency-injection wiring (backend-spec.md §1 `deps.py`).

`get_store` returns the process-wide store; tests override it with a fresh
`InMemoryStore` per test. `get_current_device` resolves the bearer token into a
`Device` and is the auth guard for write endpoints.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException

from app.store import Device, InMemoryStore, Store, seed_default_lines

_store: InMemoryStore | None = None


def get_store() -> Store:
    global _store
    if _store is None:
        _store = InMemoryStore()
        seed_default_lines(_store)
    return _store


def get_current_device(
    store: Annotated[Store, Depends(get_store)],
    authorization: Annotated[str | None, Header()] = None,
) -> Device:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail={"code": "missing_token", "message": "인증 토큰이 없습니다."})
    token = authorization.split(" ", 1)[1].strip()
    device_id = store.device_id_for_token(token)
    device = store.get_device(device_id) if device_id is not None else None
    if device is None:
        raise HTTPException(status_code=401, detail={"code": "invalid_token", "message": "유효하지 않은 토큰입니다."})
    return device


StoreDep = Annotated[Store, Depends(get_store)]
CurrentDevice = Annotated[Device, Depends(get_current_device)]
