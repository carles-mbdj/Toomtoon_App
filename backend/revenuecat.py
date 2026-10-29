"""RevenueCat webhook handling for Google Play (and, later, Apple App
Store) subscriptions. Mirrors the Stripe webhook handlers in
stripe_checkout.py, but RevenueCat's webhook payload already carries
everything needed - there's no secondary "retrieve from the provider"
call like `stripe.Subscription.retrieve(...)`.

Integration contract (must hold on the mobile/RevenueCat dashboard side,
set up once the RevenueCat SDK is wired into the app):
  - The RevenueCat SDK must be initialized with `appUserID` set to our
    own `User.id`, so `event["app_user_id"]` below IS the ToomToon user
    id directly - no separate customer-id mapping table is needed.
  - Google Play Console / RevenueCat product IDs must be named exactly
    like our internal plan ids (plan_1_month, plan_3_months,
    plan_12_months), so `event["product_id"]` can be stored directly in
    `Subscription.plan` / `User.subscription_type` with no translation
    table, the same way Stripe price IDs map to our plan ids.
"""
from datetime import datetime
from typing import Any, Dict, Optional

import config

# Event types that mean "the user has active entitlement right now".
ACTIVE_EVENT_TYPES = {"INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE"}


async def handle_event(event: Dict[str, Any]) -> None:
    event_type = event.get("type")
    user_id = event.get("app_user_id")
    if not user_id:
        config.logger.error(f"RevenueCat webhook missing app_user_id (event type: {event_type})")
        return

    if event_type in ACTIVE_EVENT_TYPES:
        await _activate(event)
    elif event_type == "CANCELLATION":
        await _mark_cancel_at_period_end(user_id)
    elif event_type in ("EXPIRATION", "SUBSCRIPTION_PAUSED"):
        await _deactivate(user_id)
    elif event_type == "BILLING_ISSUE":
        await _mark_past_due(user_id)
    else:
        config.logger.info(f"Unhandled RevenueCat event type: {event_type}")


def _period_end(event: Dict[str, Any]) -> Optional[datetime]:
    expiration_ms = event.get("expiration_at_ms")
    return datetime.utcfromtimestamp(expiration_ms / 1000) if expiration_ms else None


async def _activate(event: Dict[str, Any]) -> None:
    user_id = event["app_user_id"]
    plan_id = event.get("product_id")
    period_end = _period_end(event)

    await config.db.subscriptions.update_one(
        {"user_id": user_id, "subscription_provider": "google_play"},
        {
            "$set": {
                "user_id": user_id,
                "plan": plan_id,
                "subscription_provider": "google_play",
                "status": "active",
                "end_date": period_end,
                "current_period_end": period_end,
                "cancel_at_period_end": False,
                "updated_at": datetime.utcnow(),
            },
            "$setOnInsert": {"start_date": datetime.utcnow()},
        },
        upsert=True,
    )
    await config.db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_type": plan_id, "subscription_end": period_end}},
    )
    config.logger.info(f"Google Play subscription activated for user {user_id}: {plan_id}")


async def _mark_cancel_at_period_end(user_id: str) -> None:
    await config.db.subscriptions.update_one(
        {"user_id": user_id, "subscription_provider": "google_play"},
        {"$set": {"cancel_at_period_end": True, "updated_at": datetime.utcnow()}},
    )
    config.logger.info(f"Google Play subscription set to cancel at period end for user {user_id}")


async def _deactivate(user_id: str) -> None:
    await config.db.subscriptions.update_one(
        {"user_id": user_id, "subscription_provider": "google_play"},
        {"$set": {
            "status": "canceled",
            "canceled_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }},
    )
    await config.db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_type": None, "subscription_end": None}},
    )
    config.logger.info(f"Google Play subscription deactivated for user {user_id}")


async def _mark_past_due(user_id: str) -> None:
    await config.db.subscriptions.update_one(
        {"user_id": user_id, "subscription_provider": "google_play"},
        {"$set": {"status": "past_due", "updated_at": datetime.utcnow()}},
    )
    await config.db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_status": "past_due"}},
    )
    config.logger.warning(f"Google Play billing issue for user {user_id}")
