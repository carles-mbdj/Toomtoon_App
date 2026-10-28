"""Regression tests for the vague-1 security fixes: these must stay true
even as the codebase evolves (e.g. during the router split)."""


async def test_admin_login_success(client, admin_token):
    assert admin_token


async def test_admin_login_wrong_password_rejected(client, admin_token):
    import config

    response = await client.post(
        "/api/admin/login",
        json={"email": config.ADMIN_EMAIL, "password": "not-the-password"},
    )
    assert response.status_code == 401


async def test_admin_stats_requires_admin(client, user_headers):
    anonymous = await client.get("/api/admin/stats")
    assert anonymous.status_code == 401

    as_regular_user = await client.get("/api/admin/stats", headers=user_headers)
    assert as_regular_user.status_code == 403


async def test_admin_stats_with_admin_token(client, admin_headers):
    response = await client.get("/api/admin/stats", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    for key in (
        "total_users",
        "total_webtoons",
        "total_articles",
        "premium_users",
        "featured_webtoons",
        "recent_webtoons",
    ):
        assert key in body


async def test_seed_requires_admin(client, user_headers):
    anonymous = await client.post("/api/seed")
    assert anonymous.status_code == 401

    as_regular_user = await client.post("/api/seed", headers=user_headers)
    assert as_regular_user.status_code == 403


async def test_public_webtoon_write_routes_are_gone(client):
    """POST /webtoons and PUT /webtoons/{id} used to let anyone create or
    edit content with no authentication at all. The GET routes at those
    paths still exist, so an unauthenticated write now correctly 405s
    instead of ever reaching write logic (it must never be 200)."""
    create = await client.post(
        "/api/webtoons",
        json={"title": "x", "author": "x", "genre": "x", "description": "x"},
    )
    assert create.status_code in (404, 405)

    update = await client.put("/api/webtoons/some-id", json={"title": "x"})
    assert update.status_code in (404, 405)


async def test_public_episode_create_route_is_gone(client):
    response = await client.post(
        "/api/episodes",
        json={"webtoon_id": "x", "number": 1, "title": "x"},
    )
    assert response.status_code in (404, 405)


async def test_test_confirm_payment_requires_admin(client, user_headers):
    response = await client.post(
        "/api/payments/pi_fake/test-confirm",
        headers=user_headers,
    )
    assert response.status_code == 403


async def test_test_confirm_payment_disabled_by_default(client, admin_headers):
    """The Stripe-bypass test endpoint must be a no-op (404) for admins too
    unless an operator explicitly opts in via ENABLE_TEST_PAYMENTS=true."""
    response = await client.post(
        "/api/payments/pi_fake/test-confirm",
        headers=admin_headers,
    )
    assert response.status_code == 404


async def test_stripe_webhook_rejected_without_secret(client):
    """Without STRIPE_WEBHOOK_SECRET configured, the webhook must refuse
    the request rather than trusting an unsigned payload."""
    response = await client.post(
        "/api/webhooks/stripe",
        json={"type": "payment_intent.succeeded", "data": {"object": {"id": "pi_fake"}}},
    )
    assert response.status_code == 503
