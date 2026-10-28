"""Regression tests for the vague-5 fix where deleting an account used to
leave any active Stripe subscription running (and billing) forever."""
from datetime import datetime, timedelta

import jwt as pyjwt

import config
import stripe_checkout


async def test_delete_account_without_subscription_succeeds(client, user_headers, fresh_db):
    response = await client.delete("/api/user/account", headers=user_headers)
    assert response.status_code == 200, response.text

    deleted = await fresh_db.users.find_one({"email": "reader@example.com"})
    assert deleted is None


async def test_delete_account_cancels_active_stripe_subscription(client, user_headers, user_token, fresh_db, monkeypatch):
    payload = pyjwt.decode(user_token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    user_id = payload["user_id"]

    await fresh_db.subscriptions.insert_one({
        "user_id": user_id,
        "subscription_provider": "stripe",
        "status": "active",
        "stripe_subscription_id": "sub_fake123",
        "current_period_end": datetime.utcnow() + timedelta(days=10),
    })

    cancelled_ids = []
    monkeypatch.setattr(
        stripe_checkout.stripe.Subscription, "delete",
        lambda sub_id: cancelled_ids.append(sub_id)
    )

    response = await client.delete("/api/user/account", headers=user_headers)
    assert response.status_code == 200, response.text
    assert cancelled_ids == ["sub_fake123"]
