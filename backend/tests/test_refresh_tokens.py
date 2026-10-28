"""Regression tests for the vague-5 auth changes: short-lived access
tokens backed by a rotating, revocable refresh token."""
import hashlib
from datetime import datetime, timedelta

import jwt as pyjwt

import config


async def test_login_and_register_return_a_refresh_token(client):
    register = await client.post(
        "/api/auth/register",
        json={"email": "dana@example.com", "password": "StrongPass1", "username": "dana"},
    )
    assert register.status_code == 200, register.text
    assert register.json()["refresh_token"]

    login = await client.post(
        "/api/auth/login",
        json={"email": "dana@example.com", "password": "StrongPass1"},
    )
    assert login.status_code == 200, login.text
    assert login.json()["refresh_token"]


async def test_access_token_is_short_lived(client):
    register = await client.post(
        "/api/auth/register",
        json={"email": "henry@example.com", "password": "StrongPass1", "username": "henry"},
    )
    token = register.json()["token"]
    payload = pyjwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    lifetime = datetime.utcfromtimestamp(payload["exp"]) - datetime.utcnow()
    assert lifetime < timedelta(hours=1)


async def test_refresh_issues_new_tokens_and_rotates_old_one_out(client):
    register = await client.post(
        "/api/auth/register",
        json={"email": "erin@example.com", "password": "StrongPass1", "username": "erin"},
    )
    old_refresh_token = register.json()["refresh_token"]

    refresh = await client.post("/api/auth/refresh", json={"refresh_token": old_refresh_token})
    assert refresh.status_code == 200, refresh.text
    assert refresh.json()["token"]
    new_refresh_token = refresh.json()["refresh_token"]
    assert new_refresh_token and new_refresh_token != old_refresh_token

    # The old refresh token was consumed by the rotation above and must not
    # be usable a second time (limits the blast radius of a stolen token).
    reuse = await client.post("/api/auth/refresh", json={"refresh_token": old_refresh_token})
    assert reuse.status_code == 401


async def test_refresh_with_unknown_token_rejected(client):
    response = await client.post("/api/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert response.status_code == 401


async def test_refresh_with_expired_token_rejected(client, fresh_db):
    register = await client.post(
        "/api/auth/register",
        json={"email": "frank@example.com", "password": "StrongPass1", "username": "frank"},
    )
    refresh_token = register.json()["refresh_token"]
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    await fresh_db.refresh_tokens.update_one(
        {"token_hash": token_hash},
        {"$set": {"expires_at": datetime.utcnow() - timedelta(days=1)}},
    )

    response = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 401


async def test_logout_revokes_refresh_token(client):
    register = await client.post(
        "/api/auth/register",
        json={"email": "grace@example.com", "password": "StrongPass1", "username": "grace"},
    )
    refresh_token = register.json()["refresh_token"]

    logout = await client.post("/api/auth/logout", json={"refresh_token": refresh_token})
    assert logout.status_code == 200

    reuse = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert reuse.status_code == 401


async def test_admin_login_returns_a_refresh_token(client, admin_token):
    response = await client.post(
        "/api/admin/login",
        json={"email": config.ADMIN_EMAIL, "password": config.ADMIN_PASSWORD},
    )
    assert response.status_code == 200, response.text
    assert response.json()["refresh_token"]
