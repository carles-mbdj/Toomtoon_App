"""Regression tests for stripe_checkout.py's subscription-activation
side effects (DB writes + confirmation email), exercised directly
rather than through the webhook HTTP layer - mocking a real signed
Stripe event isn't needed to test what handle_checkout_completed does
once an event is already verified and parsed."""
from datetime import datetime, timedelta
from types import SimpleNamespace

import email_service
import stripe_checkout


async def test_handle_checkout_completed_activates_subscription_and_sends_email(fresh_db, monkeypatch):
    await fresh_db.users.insert_one({
        "id": "user1",
        "email": "buyer@example.com",
        "username": "buyer",
        "is_admin": False,
    })

    sent = []

    async def fake_send_email_async(to_email, subject, body_text):
        sent.append((to_email, subject))

    monkeypatch.setattr(email_service, "send_email_async", fake_send_email_async)

    fake_subscription = SimpleNamespace(
        current_period_end=int((datetime.utcnow() + timedelta(days=30)).timestamp()),
        cancel_at_period_end=False,
    )
    monkeypatch.setattr(stripe_checkout.stripe.Subscription, "retrieve", lambda sub_id: fake_subscription)

    session = SimpleNamespace(
        id="cs_test_123",
        metadata={"toomtoon_user_id": "user1", "toomtoon_plan_id": "plan_1_month"},
        subscription="sub_test_123",
        customer="cus_test_123",
    )

    await stripe_checkout.handle_checkout_completed(fresh_db, session)

    user = await fresh_db.users.find_one({"id": "user1"})
    assert user["subscription_type"] == "plan_1_month"
    assert user["stripe_subscription_id"] == "sub_test_123"

    sub = await fresh_db.subscriptions.find_one({"user_id": "user1", "subscription_provider": "stripe"})
    assert sub["status"] == "active"

    assert len(sent) == 1
    assert sent[0][0] == "buyer@example.com"
