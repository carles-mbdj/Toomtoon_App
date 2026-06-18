"""
Stripe Checkout Integration for ToomToon
=========================================
Handles recurring subscriptions via Stripe Checkout.
Designed with modularity to easily add StoreKit (iOS) later.
"""

import stripe
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Stripe Price IDs will be created dynamically or configured here
# These map our internal plan IDs to Stripe Price IDs
STRIPE_PRICE_MAP = {
    # Will be populated by ensure_stripe_products()
}

# Subscription plan definitions
SUBSCRIPTION_PLANS = [
    {
        "id": "plan_1_month",
        "name": "1 Mois",
        "duration_days": 30,
        "interval": "month",
        "interval_count": 1,
        "prices": {
            "EUR": 350,   # 3.50 EUR in cents
            "USD": 399,   # 3.99 USD in cents
            "XAF": 2000,  # 2000 XAF (no cents for XAF)
        },
        "features": [
            "Accès illimité",
            "Lecture hors-ligne",
            "Sans publicité"
        ],
        "popular": False
    },
    {
        "id": "plan_3_month",
        "name": "3 Mois",
        "duration_days": 90,
        "interval": "month",
        "interval_count": 3,
        "prices": {
            "EUR": 600,   # 6.00 EUR
            "USD": 699,   # 6.99 USD
            "XAF": 5000,  # 5000 XAF
        },
        "features": [
            "Accès illimité",
            "Lecture hors-ligne", 
            "Sans publicité",
            "Économisez 33%"
        ],
        "popular": True
    },
    {
        "id": "plan_12_month",
        "name": "12 Mois",
        "duration_days": 365,
        "interval": "year",
        "interval_count": 1,
        "prices": {
            "EUR": 1200,  # 12.00 EUR
            "USD": 1299,  # 12.99 USD
            "XAF": 15000, # 15000 XAF
        },
        "features": [
            "Accès illimité",
            "Lecture hors-ligne",
            "Sans publicité",
            "Économisez 60%",
            "Accès anticipé aux nouveautés"
        ],
        "popular": False
    }
]


async def ensure_stripe_products(db) -> Dict[str, Dict[str, str]]:
    """
    Ensure Stripe Products and Prices exist for all subscription plans.
    Creates them if they don't exist, or retrieves existing IDs.
    Returns a mapping of plan_id -> {currency: stripe_price_id}
    """
    global STRIPE_PRICE_MAP
    
    # Check if we already have the mapping in database
    stripe_config = await db.stripe_config.find_one({"type": "price_mapping"})
    if stripe_config and stripe_config.get("mapping"):
        STRIPE_PRICE_MAP = stripe_config["mapping"]
        logger.info("Loaded existing Stripe price mapping from database")
        return STRIPE_PRICE_MAP
    
    price_mapping = {}
    
    for plan in SUBSCRIPTION_PLANS:
        plan_id = plan["id"]
        price_mapping[plan_id] = {}
        
        # Check if product already exists
        existing_products = stripe.Product.list(limit=100)
        product = None
        for p in existing_products.data:
            if p.metadata.get("toomtoon_plan_id") == plan_id:
                product = p
                break
        
        if not product:
            # Create new product
            product = stripe.Product.create(
                name=f"ToomToon Premium - {plan['name']}",
                description=", ".join(plan["features"]),
                metadata={"toomtoon_plan_id": plan_id}
            )
            logger.info(f"Created Stripe product for {plan_id}: {product.id}")
        
        # Create prices for each currency
        for currency, amount in plan["prices"].items():
            # Check if price already exists
            existing_prices = stripe.Price.list(product=product.id, limit=100)
            price = None
            for p in existing_prices.data:
                if (p.currency.upper() == currency and 
                    p.recurring and 
                    p.recurring.interval == plan["interval"] and
                    p.recurring.interval_count == plan["interval_count"]):
                    price = p
                    break
            
            if not price:
                # Create new price
                price = stripe.Price.create(
                    product=product.id,
                    unit_amount=amount,
                    currency=currency.lower(),
                    recurring={
                        "interval": plan["interval"],
                        "interval_count": plan["interval_count"]
                    },
                    metadata={
                        "toomtoon_plan_id": plan_id,
                        "currency": currency
                    }
                )
                logger.info(f"Created Stripe price for {plan_id}/{currency}: {price.id}")
            
            price_mapping[plan_id][currency] = price.id
    
    # Store mapping in database
    await db.stripe_config.update_one(
        {"type": "price_mapping"},
        {"$set": {"mapping": price_mapping, "updated_at": datetime.utcnow()}},
        upsert=True
    )
    
    STRIPE_PRICE_MAP = price_mapping
    logger.info(f"Stripe price mapping: {price_mapping}")
    return price_mapping


async def get_or_create_stripe_customer(db, user_id: str, email: str) -> str:
    """
    Get existing Stripe customer ID or create a new one.
    """
    user = await db.users.find_one({"id": user_id})
    
    if user and user.get("stripe_customer_id"):
        return user["stripe_customer_id"]
    
    # Create new Stripe customer
    customer = stripe.Customer.create(
        email=email,
        metadata={"toomtoon_user_id": user_id}
    )
    
    # Store customer ID in database
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"stripe_customer_id": customer.id}}
    )
    
    logger.info(f"Created Stripe customer {customer.id} for user {user_id}")
    return customer.id


async def create_checkout_session(
    db,
    user_id: str,
    email: str,
    plan_id: str,
    currency: str,
    success_url: str,
    cancel_url: str
) -> Dict[str, Any]:
    """
    Create a Stripe Checkout session for subscription.
    Returns the checkout session URL and ID.
    """
    # Ensure products/prices exist
    if not STRIPE_PRICE_MAP:
        await ensure_stripe_products(db)
    
    # Validate plan and currency
    if plan_id not in STRIPE_PRICE_MAP:
        raise ValueError(f"Invalid plan_id: {plan_id}")
    
    currency = currency.upper()
    if currency not in STRIPE_PRICE_MAP[plan_id]:
        raise ValueError(f"Currency {currency} not available for plan {plan_id}")
    
    price_id = STRIPE_PRICE_MAP[plan_id][currency]
    
    # Get or create Stripe customer
    customer_id = await get_or_create_stripe_customer(db, user_id, email)
    
    # Check for existing active subscription
    existing_sub = await db.subscriptions.find_one({
        "user_id": user_id,
        "status": "active",
        "subscription_provider": "stripe"
    })
    
    # Create checkout session
    session_params = {
        "customer": customer_id,
        "payment_method_types": ["card"],
        "line_items": [{
            "price": price_id,
            "quantity": 1
        }],
        "mode": "subscription",
        "success_url": success_url + "?session_id={CHECKOUT_SESSION_ID}",
        "cancel_url": cancel_url,
        "metadata": {
            "toomtoon_user_id": user_id,
            "toomtoon_plan_id": plan_id,
            "currency": currency
        },
        "subscription_data": {
            "metadata": {
                "toomtoon_user_id": user_id,
                "toomtoon_plan_id": plan_id
            }
        },
        "allow_promotion_codes": True,
        "billing_address_collection": "auto",
    }
    
    # If user has existing subscription, allow them to update
    if existing_sub and existing_sub.get("stripe_subscription_id"):
        # Use subscription update mode instead
        # For now, we'll let them create a new subscription
        # Stripe will handle the billing proration
        pass
    
    session = stripe.checkout.Session.create(**session_params)
    
    # Store checkout session for tracking
    await db.checkout_sessions.insert_one({
        "session_id": session.id,
        "user_id": user_id,
        "plan_id": plan_id,
        "currency": currency,
        "status": "pending",
        "created_at": datetime.utcnow()
    })
    
    return {
        "checkout_url": session.url,
        "session_id": session.id
    }


async def handle_checkout_completed(db, session: stripe.checkout.Session):
    """
    Handle successful checkout completion.
    Called from webhook when checkout.session.completed event is received.
    """
    user_id = session.metadata.get("toomtoon_user_id")
    plan_id = session.metadata.get("toomtoon_plan_id")
    subscription_id = session.subscription
    customer_id = session.customer
    
    if not user_id or not subscription_id:
        logger.error(f"Missing metadata in checkout session: {session.id}")
        return
    
    # Get subscription details from Stripe
    subscription = stripe.Subscription.retrieve(subscription_id)
    
    # Get plan details
    plan = next((p for p in SUBSCRIPTION_PLANS if p["id"] == plan_id), None)
    if not plan:
        logger.error(f"Unknown plan: {plan_id}")
        return
    
    # Calculate end date
    current_period_end = datetime.fromtimestamp(subscription.current_period_end)
    
    # Update or create subscription in database
    sub_data = {
        "user_id": user_id,
        "plan": plan_id,
        "stripe_subscription_id": subscription_id,
        "stripe_customer_id": customer_id,
        "subscription_provider": "stripe",
        "status": "active",
        "start_date": datetime.utcnow(),
        "end_date": current_period_end,
        "current_period_end": current_period_end,
        "cancel_at_period_end": subscription.cancel_at_period_end,
        "updated_at": datetime.utcnow()
    }
    
    await db.subscriptions.update_one(
        {"user_id": user_id, "subscription_provider": "stripe"},
        {"$set": sub_data},
        upsert=True
    )
    
    # Update user record
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "subscription_type": plan_id,
            "subscription_status": "active",
            "subscription_end": current_period_end,
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": subscription_id
        }}
    )
    
    # Update checkout session status
    await db.checkout_sessions.update_one(
        {"session_id": session.id},
        {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
    )
    
    logger.info(f"Subscription activated for user {user_id}: {plan_id}")


async def handle_subscription_updated(db, subscription: stripe.Subscription):
    """
    Handle subscription update events (renewals, plan changes, etc.)
    """
    user_id = subscription.metadata.get("toomtoon_user_id")
    if not user_id:
        # Try to find user by customer ID
        customer_id = subscription.customer
        user = await db.users.find_one({"stripe_customer_id": customer_id})
        if user:
            user_id = user["id"]
        else:
            logger.error(f"Could not find user for subscription: {subscription.id}")
            return
    
    current_period_end = datetime.fromtimestamp(subscription.current_period_end)
    
    # Determine status
    status = "active" if subscription.status in ["active", "trialing"] else subscription.status
    
    # Update subscription
    await db.subscriptions.update_one(
        {"stripe_subscription_id": subscription.id},
        {"$set": {
            "status": status,
            "current_period_end": current_period_end,
            "end_date": current_period_end,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Update user
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "subscription_status": status,
            "subscription_end": current_period_end
        }}
    )
    
    logger.info(f"Subscription updated for user {user_id}: status={status}")


async def handle_subscription_deleted(db, subscription: stripe.Subscription):
    """
    Handle subscription cancellation/deletion.
    """
    user_id = subscription.metadata.get("toomtoon_user_id")
    if not user_id:
        customer_id = subscription.customer
        user = await db.users.find_one({"stripe_customer_id": customer_id})
        if user:
            user_id = user["id"]
        else:
            logger.error(f"Could not find user for canceled subscription: {subscription.id}")
            return
    
    # Update subscription status
    await db.subscriptions.update_one(
        {"stripe_subscription_id": subscription.id},
        {"$set": {
            "status": "canceled",
            "canceled_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Update user
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "subscription_status": "canceled",
            "subscription_type": None
        }}
    )
    
    logger.info(f"Subscription canceled for user {user_id}")


async def handle_invoice_paid(db, invoice: stripe.Invoice):
    """
    Handle successful invoice payment (subscription renewal).
    """
    subscription_id = invoice.subscription
    if not subscription_id:
        return
    
    # Get subscription
    subscription = stripe.Subscription.retrieve(subscription_id)
    await handle_subscription_updated(db, subscription)
    
    logger.info(f"Invoice paid for subscription: {subscription_id}")


async def handle_invoice_payment_failed(db, invoice: stripe.Invoice):
    """
    Handle failed invoice payment.
    """
    subscription_id = invoice.subscription
    customer_id = invoice.customer
    
    # Find user
    user = await db.users.find_one({"stripe_customer_id": customer_id})
    if not user:
        logger.error(f"Could not find user for failed invoice: {invoice.id}")
        return
    
    # Update subscription status
    if subscription_id:
        await db.subscriptions.update_one(
            {"stripe_subscription_id": subscription_id},
            {"$set": {
                "status": "past_due",
                "updated_at": datetime.utcnow()
            }}
        )
    
    # Update user
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"subscription_status": "past_due"}}
    )
    
    # TODO: Send notification to user about payment failure
    logger.warning(f"Invoice payment failed for user {user['id']}")


async def cancel_subscription(db, user_id: str, immediately: bool = False) -> Dict[str, Any]:
    """
    Cancel a user's subscription.
    If immediately=False, cancels at period end.
    If immediately=True, cancels right away (prorated refund may apply).
    """
    # Get user's subscription
    subscription = await db.subscriptions.find_one({
        "user_id": user_id,
        "subscription_provider": "stripe",
        "status": "active"
    })
    
    if not subscription or not subscription.get("stripe_subscription_id"):
        raise ValueError("No active subscription found")
    
    stripe_sub_id = subscription["stripe_subscription_id"]
    
    if immediately:
        # Cancel immediately
        result = stripe.Subscription.delete(stripe_sub_id)
    else:
        # Cancel at period end
        result = stripe.Subscription.modify(
            stripe_sub_id,
            cancel_at_period_end=True
        )
    
    # Update local records
    await db.subscriptions.update_one(
        {"stripe_subscription_id": stripe_sub_id},
        {"$set": {
            "cancel_at_period_end": True,
            "updated_at": datetime.utcnow()
        }}
    )
    
    logger.info(f"Subscription canceled for user {user_id}, immediately={immediately}")
    
    return {
        "success": True,
        "cancel_at_period_end": not immediately,
        "current_period_end": subscription.get("current_period_end")
    }


async def get_customer_portal_url(db, user_id: str, return_url: str) -> str:
    """
    Get Stripe Customer Portal URL for subscription management.
    """
    user = await db.users.find_one({"id": user_id})
    if not user or not user.get("stripe_customer_id"):
        raise ValueError("No Stripe customer found for user")
    
    session = stripe.billing_portal.Session.create(
        customer=user["stripe_customer_id"],
        return_url=return_url
    )
    
    return session.url


def get_subscription_plans() -> list:
    """Return all available subscription plans."""
    return SUBSCRIPTION_PLANS
