"""Regression tests for the vague-5 brute-force protection on the
auth endpoints most attractive to attackers."""


async def test_login_rate_limited_after_too_many_attempts(client):
    payload = {"email": "nope@example.com", "password": "wrong"}
    for _ in range(10):
        response = await client.post("/api/auth/login", json=payload)
        assert response.status_code == 401
    too_many = await client.post("/api/auth/login", json=payload)
    assert too_many.status_code == 429


async def test_register_rate_limited_after_too_many_attempts(client):
    for i in range(5):
        response = await client.post(
            "/api/auth/register",
            json={"email": f"spam{i}@example.com", "password": "StrongPass1", "username": f"spam{i}"},
        )
        assert response.status_code == 200
    too_many = await client.post(
        "/api/auth/register",
        json={"email": "spam-overflow@example.com", "password": "StrongPass1", "username": "overflow"},
    )
    assert too_many.status_code == 429


async def test_forgot_password_rate_limited_after_too_many_attempts(client):
    for _ in range(3):
        response = await client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
        assert response.status_code == 200
    too_many = await client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    assert too_many.status_code == 429


async def test_admin_login_rate_limited_after_too_many_attempts(client):
    import config

    for _ in range(10):
        response = await client.post(
            "/api/admin/login",
            json={"email": config.ADMIN_EMAIL, "password": "wrong"},
        )
        assert response.status_code == 401
    too_many = await client.post(
        "/api/admin/login",
        json={"email": config.ADMIN_EMAIL, "password": "wrong"},
    )
    assert too_many.status_code == 429
