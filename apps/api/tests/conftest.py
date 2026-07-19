"""Pytest fixtures for the API test suite.

Each test gets a fresh in-memory store so tests stay isolated. The store is
overridden via FastAPI's dependency-injection system, which mirrors how a real
DB session dependency would be swapped in later.
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.deps import get_store
from app.main import app
from app.store import InMemoryStore, seed_default_lines


@pytest.fixture
def store() -> InMemoryStore:
    s = InMemoryStore()
    seed_default_lines(s)
    return s


@pytest.fixture
def client(store: InMemoryStore) -> Iterator[TestClient]:
    app.dependency_overrides[get_store] = lambda: store
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    """Register a device and return an Authorization header for write endpoints."""
    resp = client.post("/api/v1/auth/session", json={"device_id": None, "nickname": "우진"})
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
