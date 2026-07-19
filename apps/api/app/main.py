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
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, health, rankings, runs

app = FastAPI(title="metro-typing-api")

# CORS (backend-spec.md §2 `CORS_ORIGINS`): allow browser fetches from the Vite
# dev server (and any origins added via env). Registered before routing so
# preflight OPTIONS and CORS headers on error responses are handled uniformly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Wrap Pydantic request-validation errors in the api-spec.md common envelope.

    FastAPI's default body is `{"detail": [...]}`, which breaks the documented
    `{"error": {code, message}}` contract. The HTTP status stays 422 (FastAPI's
    default) so existing clients keyed on status codes are unaffected; `details`
    is an additive field carrying the per-field errors for debugging.
    """
    details = [
        {
            "loc": [str(part) for part in err.get("loc", ())],
            "msg": str(err.get("msg", "")),
            "type": str(err.get("type", "")),
        }
        for err in exc.errors()
    ]
    body = {
        "error": {
            "code": "validation_error",
            "message": "요청 형식이 올바르지 않습니다.",
            "details": details,
        }
    }
    return JSONResponse(status_code=422, content=body)
