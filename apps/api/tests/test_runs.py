"""Score submission flow: /runs/start -> /runs/complete."""

from typing import cast

from fastapi.testclient import TestClient


def _start_run(client: TestClient, headers: dict[str, str], line_id: str = "tokyo-metro-ginza") -> str:
    resp = client.post(
        "/api/v1/runs/start",
        headers=headers,
        json={"line_id": line_id, "mode": "speed_run"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["expires_in"] == 600
    return cast(str, body["run_token"])


def test_runs_start_requires_auth(client: TestClient) -> None:
    resp = client.post("/api/v1/runs/start", json={"line_id": "tokyo-metro-ginza", "mode": "speed_run"})
    assert resp.status_code == 401


def test_runs_start_unknown_line(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.post(
        "/api/v1/runs/start",
        headers=auth_headers,
        json={"line_id": "does-not-exist", "mode": "speed_run"},
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "line_not_found"


def test_complete_run_happy_path(client: TestClient, auth_headers: dict[str, str]) -> None:
    run_token = _start_run(client, auth_headers)
    resp = client.post(
        "/api/v1/runs/complete",
        headers=auth_headers,
        json={
            "run_token": run_token,
            "duration_ms": 45230,
            "keystrokes": 312,
            "accuracy": 0.97,
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["run_id"]
    assert body["wpm"] > 0
    assert body["cpm"] > 0
    assert body["rank"] == 1
    assert body["verified"] is True


def test_run_token_is_single_use(client: TestClient, auth_headers: dict[str, str]) -> None:
    run_token = _start_run(client, auth_headers)
    payload = {"run_token": run_token, "duration_ms": 45230, "keystrokes": 312, "accuracy": 0.97}
    first = client.post("/api/v1/runs/complete", headers=auth_headers, json=payload)
    assert first.status_code == 201
    second = client.post("/api/v1/runs/complete", headers=auth_headers, json=payload)
    assert second.status_code == 422
    assert second.json()["error"]["code"] == "invalid_or_used_token"


def test_unknown_run_token_rejected(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.post(
        "/api/v1/runs/complete",
        headers=auth_headers,
        json={
            "run_token": "00000000-0000-0000-0000-000000000000",
            "duration_ms": 45230,
            "keystrokes": 312,
            "accuracy": 0.97,
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "invalid_or_used_token"


def test_impossible_keystroke_rate_rejected(client: TestClient, auth_headers: dict[str, str]) -> None:
    run_token = _start_run(client, auth_headers)
    resp = client.post(
        "/api/v1/runs/complete",
        headers=auth_headers,
        json={
            "run_token": run_token,
            "duration_ms": 1000,
            "keystrokes": 500,
            "accuracy": 1.0,
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "keystroke_rate_exceeded"


def test_bad_payload_returns_422(client: TestClient, auth_headers: dict[str, str]) -> None:
    run_token = _start_run(client, auth_headers)
    # accuracy out of [0,1] is rejected by the request schema before anti-cheat runs.
    resp = client.post(
        "/api/v1/runs/complete",
        headers=auth_headers,
        json={"run_token": run_token, "duration_ms": 45230, "keystrokes": 312, "accuracy": 1.5},
    )
    assert resp.status_code == 422


def test_missing_fields_returns_422(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.post("/api/v1/runs/complete", headers=auth_headers, json={"run_token": "x"})
    assert resp.status_code == 422
