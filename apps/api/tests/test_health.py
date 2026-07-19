"""The health endpoint must keep working after the routers are mounted."""

from fastapi.testclient import TestClient


def test_health_ok(client: TestClient) -> None:
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    # DB/Redis are still not wired up in this slice.
    assert body["db"] == "not_connected"
    assert body["redis"] == "not_connected"
    assert "version" in body
