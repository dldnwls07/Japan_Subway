"""Device session / nickname registration (backend-spec.md §4.1).

DEFERRED DECISIONS (kickoff-prompt.md §"미해결 항목") — intentionally NOT
implemented here so we don't silently pick a policy:
  * Nickname uniqueness: NOT enforced. `nickname_taken` (api-spec.md) is left
    unimplemented until the uniqueness policy is decided.
  * device_id hijack/sharing protection: not addressed (no device fingerprint).
  * Auth token: opaque random token (see store.issue_access_token), NOT a JWT.
    The JWT-vs-cookie choice is still open.
This router implements only the smallest behaviour that is decision-independent:
create a device and hand back a bearer token.
"""

from __future__ import annotations

from fastapi import APIRouter, status

from app.deps import StoreDep
from app.schemas import CreateSessionRequest, CreateSessionResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/session", response_model=CreateSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(payload: CreateSessionRequest, store: StoreDep) -> CreateSessionResponse:
    # A new device is always created for now (device_id reuse ties into the
    # deferred hijack-protection decision, so we don't branch on it yet).
    device = store.add_device(nickname=payload.nickname)
    token = store.issue_access_token(device.id)
    return CreateSessionResponse(
        device_id=device.id,
        nickname=device.nickname,
        access_token=token,
    )
