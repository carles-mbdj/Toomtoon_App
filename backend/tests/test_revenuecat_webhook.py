"""Regression tests for the RevenueCat (Google Play) webhook: ingests
subscription events the same way the Stripe webhook does, but
authenticated with a static bearer token instead of a signature."""
import config


async def test_webhook_rejected_without_secret(client, monkeypatch):
    monkeypatch.setattr(config, "REVENUECAT_WEBHOOK_SECRET", "")
    response = await client.post(
        "/api/webhooks/revenuecat",
        json={"event": {"type": "INITIAL_PURCHASE", "app_user_id": "u1", "product_id": "plan_1_month"}},
    )
    assert response.status_code == 503


async def test_webhook_rejected_with_wrong_authorization(client, monkeypatch):
    monkeypatch.setattr(config, "REVENUECAT_WEBHOOK_SECRET", "test-secret")

    response = await client.post(
        "/api/webhooks/revenuecat",
        json={"event": {"type": "INITIAL_PURCHASE", "app_user_id": "u1", "product_id": "plan_1_month"}},
        headers={"Authorization": "Bearer wrong-secret"},
    )
    assert response.status_code == 401


async def test_initial_purchase_activates_subscription(client, user_headers, user_token, fresh_db, monkeypatch):
    import jwt as pyjwt

    monkeypatch.setattr(config, "REVENUECAT_WEBHOOK_SECRET", "test-secret")
    payload = pyjwt.decode(user_token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    user_id = payload["user_id"]

    response = await client.post(
        "/api/webhooks/revenuecat",
        json={"event": {
            "type": "INITIAL_PURCHASE",
            "app_user_id": user_id,
            "product_id": "plan_3_months",
            "expiration_at_ms": 4102444800000,  # far future
        }},
        headers={"Authorization": "Bearer test-secret"},
    )
    assert response.status_code == 200, response.text

    user = await fresh_db.users.find_one({"id": user_id})
    assert user["subscription_type"] == "plan_3_months"

    sub = await fresh_db.subscriptions.find_one({"user_id": user_id, "subscription_provider": "google_play"})
    assert sub["status"] == "active"
    assert sub["cancel_at_period_end"] is False


async def test_cancellation_sets_cancel_at_period_end(client, user_token, fresh_db, monkeypatch):
    import jwt as pyjwt

    monkeypatch.setattr(config, "REVENUECAT_WEBHOOK_SECRET", "test-secret")
    payload = pyjwt.decode(user_token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    user_id = payload["user_id"]

    await fresh_db.subscriptions.insert_one({
        "user_id": user_id,
        "plan": "plan_1_month",
        "subscription_provider": "google_play",
        "status": "active",
        "cancel_at_period_end": False,
    })

    response = await client.post(
        "/api/webhooks/revenuecat",
        json={"event": {"type": "CANCELLATION", "app_user_id": user_id, "product_id": "plan_1_month"}},
        headers={"Authorization": "Bearer test-secret"},
    )
    assert response.status_code == 200, response.text

    sub = await fresh_db.subscriptions.find_one({"user_id": user_id, "subscription_provider": "google_play"})
    assert sub["cancel_at_period_end"] is True
    assert sub["status"] == "active"  # still active until the period actually ends


async def test_expiration_deactivates_subscription_and_clears_user(client, user_token, fresh_db, monkeypatch):
    import jwt as pyjwt

    monkeypatch.setattr(config, "REVENUECAT_WEBHOOK_SECRET", "test-secret")
    payload = pyjwt.decode(user_token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    user_id = payload["user_id"]

    await fresh_db.subscriptions.insert_one({
        "user_id": user_id,
        "plan": "plan_1_month",
        "subscription_provider": "google_play",
        "status": "active",
    })
    await fresh_db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_type": "plan_1_month"}},
    )

    response = await client.post(
        "/api/webhooks/revenuecat",
        json={"event": {"type": "EXPIRATION", "app_user_id": user_id, "product_id": "plan_1_month"}},
        headers={"Authorization": "Bearer test-secret"},
    )
    assert response.status_code == 200, response.text

    sub = await fresh_db.subscriptions.find_one({"user_id": user_id, "subscription_provider": "google_play"})
    assert sub["status"] == "canceled"

    user = await fresh_db.users.find_one({"id": user_id})
    assert user["subscription_type"] is None
