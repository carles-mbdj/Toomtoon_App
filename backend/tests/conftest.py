import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

import config
import server as server_module

# Every router/helper module does `import config` and reads `config.db` at
# call time (never `from config import db`), so patching it in this one
# place is enough to isolate every test from a real MongoDB.


@pytest_asyncio.fixture(autouse=True)
async def fresh_db(monkeypatch):
    """Give every test an isolated in-memory MongoDB so tests never touch
    a real database and never leak state between each other."""
    mock_client = AsyncMongoMockClient()
    mock_db = mock_client["toomtoon_test"]
    monkeypatch.setattr(config, "db", mock_db)
    yield mock_db


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=server_module.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def admin_token(client):
    response = await client.post(
        "/api/admin/login",
        json={"email": config.ADMIN_EMAIL, "password": config.ADMIN_PASSWORD},
    )
    assert response.status_code == 200, response.text
    return response.json()["token"]


@pytest_asyncio.fixture
async def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest_asyncio.fixture
async def user_token(client):
    response = await client.post(
        "/api/auth/register",
        json={"email": "reader@example.com", "password": "SuperSecret123", "username": "reader"},
    )
    assert response.status_code == 200, response.text
    return response.json()["token"]


@pytest_asyncio.fixture
async def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}"}
