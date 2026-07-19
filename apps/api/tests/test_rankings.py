"""Leaderboard read + personal-best read."""

from datetime import timedelta
from typing import Any, cast
from uuid import UUID

from fastapi.testclient import TestClient

from app.store import InMemoryStore


def _submit(
    client: TestClient,
    store: InMemoryStore,
    headers: dict[str, str],
    keystrokes: int,
    duration_ms: int = 45230,
) -> dict[str, Any]:
    start = client.post(
        "/api/v1/runs/start",
        headers=headers,
        json={"line_id": "tokyo-metro-ginza", "mode": "speed_run"},
    )
    run_token = start.json()["run_token"]
    token_row = store.get_run_token(UUID(run_token))
    assert token_row is not None
    token_row.issued_at -= timedelta(milliseconds=60_000)
    resp = client.post(
        "/api/v1/runs/complete",
        headers=headers,
        json={"run_token": run_token, "duration_ms": duration_ms, "keystrokes": keystrokes, "accuracy": 0.97},
    )
    assert resp.status_code == 201, resp.text
    return cast(dict[str, Any], resp.json())


def _headers_for(client: TestClient, nickname: str) -> dict[str, str]:
    resp = client.post("/api/v1/auth/session", json={"device_id": None, "nickname": nickname})
    body = cast(dict[str, Any], resp.json())
    return {"Authorization": f"Bearer {body['access_token']}"}


def test_empty_leaderboard(client: TestClient) -> None:
    resp = client.get("/api/v1/rankings", params={"line_id": "tokyo-metro-ginza", "mode": "speed_run"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 0
    assert body["items"] == []


def test_leaderboard_orders_by_wpm_desc(client: TestClient, store: InMemoryStore) -> None:
    fast = _headers_for(client, "빠른손")
    slow = _headers_for(client, "느린손")
    _submit(client, store, slow, keystrokes=200)
    _submit(client, store, fast, keystrokes=312)

    resp = client.get("/api/v1/rankings", params={"line_id": "tokyo-metro-ginza", "mode": "speed_run"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    assert [item["nickname"] for item in body["items"]] == ["빠른손", "느린손"]
    assert body["items"][0]["rank"] == 1
    assert body["items"][1]["rank"] == 2
    assert body["items"][0]["wpm"] >= body["items"][1]["wpm"]


def test_leaderboard_pagination_limit_bounds(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/rankings",
        params={"line_id": "tokyo-metro-ginza", "mode": "speed_run", "limit": 101},
    )
    # limit max is 100 per api-spec.md pagination rules.
    assert resp.status_code == 422


def test_rankings_me_returns_personal_bests(
    client: TestClient, store: InMemoryStore, auth_headers: dict[str, str]
) -> None:
    _submit(client, store, auth_headers, keystrokes=312)
    resp = client.get("/api/v1/rankings/me", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["device_id"]
    assert len(body["personal_bests"]) == 1
    pb = body["personal_bests"][0]
    assert pb["line_id"] == "tokyo-metro-ginza"
    assert pb["mode"] == "speed_run"
    assert pb["rank"] == 1


def test_rankings_me_requires_auth(client: TestClient) -> None:
    resp = client.get("/api/v1/rankings/me")
    assert resp.status_code == 401
