"""FastAPI entrypoint.

Mounts the runs / rankings / auth / health routers under `/api/v1` (backend-spec.md
§1, api-spec.md versioning). DB/Redis are not connected yet — the routers run
against an in-memory `Store` (app/store.py) so the slice is fully testable now and
a real Postgres/Redis backend can be swapped in later without router changes.

Deferred (kickoff-prompt.md §"미해결 항목"): device_id hijack protection, nickname
uniqueness, and the JWT-vs-cookie auth-token decision. See app/routers/auth.py.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from app.routers import auth, health, rankings, runs

app = FastAPI(title="metro-typing-api")

API_V1 = "/api/v1"
app.include_router(health.router, prefix=API_V1)
app.include_router(auth.router, prefix=API_V1)
app.include_router(runs.router, prefix=API_V1)
app.include_router(rankings.router, prefix=API_V1)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Render `{code, message}` details in the api-spec.md common error envelope."""
    detail: Any = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        body = {"error": {"code": detail["code"], "message": detail.get("message", "")}}
    else:
        body = {"error": {"code": "http_error", "message": str(detail)}}
    return JSONResponse(status_code=exc.status_code, content=body, headers=exc.headers)
