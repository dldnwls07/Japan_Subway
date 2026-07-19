"""Minimal device-session auth.

NOTE: nickname-uniqueness and the JWT-vs-cookie decision are UNRESOLVED in
kickoff-prompt.md, so this slice only exercises the smallest behaviour that does
not depend on those decisions: a device is created and an opaque bearer token is
issued. See app/routers/auth.py for the deferred-decision notes.
"""

from fastapi.testclient import TestClient


def test_create_session_issues_token(client: TestClient) -> None:
    resp = client.post("/api/v1/auth/session", json={"device_id": None, "nickname": "타자왕"})
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["nickname"] == "타자왕"
    assert body["device_id"]
    assert body["access_token"]
    assert body["token_type"] == "bearer"


def test_nickname_too_long_is_rejected(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/auth/session",
        json={"device_id": None, "nickname": "x" * 21},
    )
    assert resp.status_code == 422


def test_duplicate_nicknames_are_allowed_for_now(client: TestClient) -> None:
    # Uniqueness policy is deferred; two devices may share a nickname today.
    first = client.post("/api/v1/auth/session", json={"device_id": None, "nickname": "동명이인"})
    second = client.post("/api/v1/auth/session", json={"device_id": None, "nickname": "동명이인"})
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["device_id"] != second.json()["device_id"]
