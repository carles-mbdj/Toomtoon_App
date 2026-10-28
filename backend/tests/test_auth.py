import config


async def test_health_check(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


async def test_register_and_login(client):
    register = await client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "password": "StrongPass1", "username": "alice"},
    )
    assert register.status_code == 200, register.text
    assert register.json()["token"]

    login = await client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "StrongPass1"},
    )
    assert login.status_code == 200, login.text
    assert login.json()["email"] == "alice@example.com"


async def test_register_duplicate_email_rejected(client):
    payload = {"email": "bob@example.com", "password": "StrongPass1", "username": "bob"}
    first = await client.post("/api/auth/register", json=payload)
    assert first.status_code == 200

    second = await client.post("/api/auth/register", json=payload)
    assert second.status_code == 400


async def test_login_wrong_password_rejected(client):
    await client.post(
        "/api/auth/register",
        json={"email": "carol@example.com", "password": "StrongPass1", "username": "carol"},
    )
    login = await client.post(
        "/api/auth/login",
        json={"email": "carol@example.com", "password": "WrongPassword"},
    )
    assert login.status_code == 401


async def test_get_me_requires_token(client):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


async def test_get_me_with_token(client, user_headers):
    response = await client.get("/api/auth/me", headers=user_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "reader@example.com"


async def test_legacy_sha256_password_is_migrated_to_bcrypt_on_login(client, fresh_db):
    """Users created before the bcrypt migration have a bare SHA256 hash.
    Login must still succeed for them, and the stored hash must be
    transparently upgraded to bcrypt so the weak hash doesn't linger."""
    import hashlib
    import uuid

    legacy_hash = hashlib.sha256("LegacyPass1".encode()).hexdigest()
    await fresh_db.users.insert_one(
        {
            "id": str(uuid.uuid4()),
            "email": "legacy@example.com",
            "username": "legacy",
            "is_admin": False,
            "password_hash": legacy_hash,
            "subscription_type": None,
            "subscription_end": None,
            "notifications_enabled": True,
            "language": "fr",
        }
    )

    login = await client.post(
        "/api/auth/login",
        json={"email": "legacy@example.com", "password": "LegacyPass1"},
    )
    assert login.status_code == 200, login.text

    updated = await fresh_db.users.find_one({"email": "legacy@example.com"})
    assert updated["password_hash"] != legacy_hash
    assert config.pwd_context.identify(updated["password_hash"]) == "bcrypt"


async def test_change_password_requires_correct_current_password(client, user_headers):
    response = await client.put(
        "/api/user/password",
        json={"current_password": "WrongPassword", "new_password": "NewStrongPass1"},
        headers=user_headers,
    )
    assert response.status_code == 400


async def test_change_password_success_allows_login_with_new_password(client, user_headers):
    response = await client.put(
        "/api/user/password",
        json={"current_password": "SuperSecret123", "new_password": "NewStrongPass1"},
        headers=user_headers,
    )
    assert response.status_code == 200, response.text

    old_login = await client.post(
        "/api/auth/login",
        json={"email": "reader@example.com", "password": "SuperSecret123"},
    )
    assert old_login.status_code == 401

    new_login = await client.post(
        "/api/auth/login",
        json={"email": "reader@example.com", "password": "NewStrongPass1"},
    )
    assert new_login.status_code == 200
