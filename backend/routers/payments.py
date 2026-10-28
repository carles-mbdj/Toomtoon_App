"""Subscription plans, Stripe PaymentIntent flow, Stripe Checkout flow,
webhooks, and the admin payment/subscription-plan management routes."""
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

import stripe
from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request

import config
from auth_utils import get_current_user, require_admin
from models import (
    DEFAULT_SUBSCRIPTION_PLANS,
    CheckoutSessionCreate,
    Payment,
    PaymentIntentCreate,
    Subscription,
    SubscriptionCreate,
    SubscriptionPlanCreate,
    SubscriptionPlanUpdate,
    User,
)
from stripe_checkout import (
    cancel_subscription,
    create_checkout_session,
    ensure_stripe_products,
    get_customer_portal_url,
    handle_checkout_completed,
    handle_invoice_paid,
    handle_invoice_payment_failed,
    handle_subscription_deleted,
    handle_subscription_updated,
)

router = APIRouter()


# ==================== SUBSCRIPTION PLAN HELPERS ====================

async def get_subscription_plans_from_db():
    """Get subscription plans from database, seed if empty"""
    plans = await config.db.subscription_plans.find({"active": True}).to_list(20)
    if not plans:
        # Seed default plans
        for plan in DEFAULT_SUBSCRIPTION_PLANS:
            await config.db.subscription_plans.insert_one(plan)
        plans = await config.db.subscription_plans.find({"active": True}).to_list(20)
    return plans

async def get_plan_by_id(plan_id: str):
    """Get a specific subscription plan"""
    plan = await config.db.subscription_plans.find_one({"id": plan_id})
    return plan

def format_price(amount_cents: int, currency: str) -> str:
    """Format price for display"""
    if currency == "XAF":
        return f"{amount_cents} XAF"
    return f"{amount_cents / 100:.2f} {currency}"


# ==================== SUBSCRIPTION PLAN ROUTES ====================

@router.get("/subscriptions/plans")
async def list_subscription_plans():
    """Get all active subscription plans"""
    plans = await get_subscription_plans_from_db()
    return [{
        "id": p["id"],
        "name": p["name"],
        "duration_days": p["duration_days"],
        "prices": p["prices"],
        "features": p.get("features", []),
        "popular": p.get("popular", False)
    } for p in plans]

@router.get("/subscriptions/plans/{plan_id}")
async def get_subscription_plan(plan_id: str):
    """Get a specific subscription plan"""
    plan = await get_plan_by_id(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    return plan


# ==================== STRIPE PAYMENT ROUTES ====================

@router.get("/payments/config")
async def get_payment_config():
    """Get Stripe publishable key for frontend"""
    return {
        "publishable_key": config.STRIPE_PUBLISHABLE_KEY,
        "supported_currencies": ["EUR", "USD", "XAF"],
        "apple_pay_enabled": True,
        "google_pay_enabled": True
    }

@router.post("/payments/create-intent")
async def create_payment_intent(
    data: PaymentIntentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
):
    """Create a Stripe PaymentIntent for subscription purchase"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    # Generate idempotency key if not provided
    if not idempotency_key:
        idempotency_key = str(uuid.uuid4())

    # Check for existing payment with same idempotency key
    existing_payment = await config.db.payments.find_one({"idempotency_key": idempotency_key})
    if existing_payment:
        # Return existing payment intent
        return {
            "client_secret": existing_payment.get("stripe_client_secret"),
            "payment_intent_id": existing_payment.get("stripe_payment_intent_id"),
            "amount": existing_payment.get("amount"),
            "currency": existing_payment.get("currency"),
            "status": existing_payment.get("status")
        }

    # Get plan
    plan = await get_plan_by_id(data.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Plan invalide")

    # Validate currency
    currency = data.currency.upper()
    if currency not in plan["prices"]:
        raise HTTPException(status_code=400, detail=f"Devise {currency} non supportée pour ce plan")

    amount = plan["prices"][currency]

    try:
        # Create Stripe PaymentIntent
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency.lower(),
            automatic_payment_methods={"enabled": True},
            metadata={
                "user_id": current_user.id,
                "plan_id": data.plan_id,
                "idempotency_key": idempotency_key
            },
            idempotency_key=idempotency_key
        )

        # Store payment record
        payment = Payment(
            user_id=current_user.id,
            plan_id=data.plan_id,
            stripe_payment_intent_id=payment_intent.id,
            amount=amount,
            currency=currency,
            status="pending",
            idempotency_key=idempotency_key,
            metadata={"stripe_client_secret": payment_intent.client_secret}
        )

        payment_dict = payment.dict()
        payment_dict["stripe_client_secret"] = payment_intent.client_secret
        await config.db.payments.insert_one(payment_dict)

        return {
            "client_secret": payment_intent.client_secret,
            "payment_intent_id": payment_intent.id,
            "amount": amount,
            "currency": currency,
            "status": "pending"
        }

    except stripe.error.StripeError as e:
        config.logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur de paiement: {str(e)}")

@router.get("/payments/{payment_id}")
async def get_payment_status(
    payment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get payment status"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    payment = await config.db.payments.find_one({
        "$or": [
            {"id": payment_id},
            {"stripe_payment_intent_id": payment_id}
        ],
        "user_id": current_user.id
    })

    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")

    return {
        "id": payment["id"],
        "status": payment["status"],
        "amount": payment["amount"],
        "currency": payment["currency"],
        "plan_id": payment["plan_id"],
        "created_at": payment["created_at"].isoformat() if payment.get("created_at") else None
    }

@router.post("/payments/{payment_id}/confirm")
async def confirm_payment(
    payment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Confirm payment and activate subscription (called after successful Stripe payment)"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    payment = await config.db.payments.find_one({
        "stripe_payment_intent_id": payment_id,
        "user_id": current_user.id
    })

    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")

    if payment["status"] == "succeeded":
        return {"success": True, "message": "Paiement déjà confirmé"}

    try:
        # Verify payment with Stripe
        intent = stripe.PaymentIntent.retrieve(payment_id)

        if intent.status == "succeeded":
            # Get plan details
            plan = await get_plan_by_id(payment["plan_id"])
            if not plan:
                raise HTTPException(status_code=400, detail="Plan non trouvé")

            # Calculate subscription end date
            end_date = datetime.utcnow() + timedelta(days=plan["duration_days"])

            # Update payment status
            await config.db.payments.update_one(
                {"id": payment["id"]},
                {"$set": {"status": "succeeded", "updated_at": datetime.utcnow()}}
            )

            # Create subscription record
            subscription = Subscription(
                user_id=current_user.id,
                plan=payment["plan_id"],
                price=payment["amount"] / 100 if payment["currency"] != "XAF" else payment["amount"],
                end_date=end_date,
                status="active"
            )
            await config.db.subscriptions.insert_one(subscription.dict())

            # Update user subscription
            await config.db.users.update_one(
                {"id": current_user.id},
                {"$set": {
                    "subscription_type": payment["plan_id"],
                    "subscription_end": end_date
                }}
            )

            return {
                "success": True,
                "message": f"Abonnement {plan['name']} activé avec succès!",
                "subscription_end": end_date.isoformat()
            }
        else:
            return {
                "success": False,
                "status": intent.status,
                "message": "Le paiement n'est pas encore confirmé"
            }

    except stripe.error.StripeError as e:
        config.logger.error(f"Stripe verification error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur de vérification: {str(e)}")


@router.post("/payments/{payment_id}/test-confirm")
async def test_confirm_payment(
    payment_id: str,
    admin: User = Depends(require_admin)
):
    """
    TEST ONLY: Simulate a successful payment for testing purposes.
    This endpoint bypasses Stripe verification and directly activates the subscription.
    Restricted to admins and disabled unless ENABLE_TEST_PAYMENTS=true, so it can
    never be used in production to grant a free subscription.
    """
    if os.environ.get('ENABLE_TEST_PAYMENTS', '').lower() != 'true':
        raise HTTPException(status_code=404, detail="Not found")

    payment = await config.db.payments.find_one({
        "stripe_payment_intent_id": payment_id
    })

    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")

    if payment["status"] == "succeeded":
        return {"success": True, "message": "Paiement déjà confirmé"}

    try:
        # Get plan details
        plan = await get_plan_by_id(payment["plan_id"])
        if not plan:
            raise HTTPException(status_code=400, detail="Plan non trouvé")

        # Calculate subscription end date
        end_date = datetime.utcnow() + timedelta(days=plan["duration_days"])

        # Update payment status
        await config.db.payments.update_one(
            {"id": payment["id"]},
            {"$set": {"status": "succeeded", "updated_at": datetime.utcnow()}}
        )

        # Create subscription record
        subscription = Subscription(
            user_id=payment["user_id"],
            plan=payment["plan_id"],
            price=payment["amount"] / 100 if payment["currency"] != "XAF" else payment["amount"],
            end_date=end_date,
            status="active"
        )
        await config.db.subscriptions.insert_one(subscription.dict())

        # Update user subscription
        await config.db.users.update_one(
            {"id": payment["user_id"]},
            {"$set": {
                "subscription_type": payment["plan_id"],
                "subscription_end": end_date
            }}
        )

        return {
            "success": True,
            "message": f"[TEST] Abonnement {plan['name']} activé avec succès!",
            "subscription_end": end_date.isoformat(),
            "test_mode": True
        }

    except Exception as e:
        config.logger.error(f"Test payment error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur: {str(e)}")

@router.post("/payments/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    amount: Optional[int] = Body(None, embed=True),  # Optional partial refund amount in cents
    admin: User = Depends(require_admin)
):
    """Refund a payment (admin only)"""
    payment = await config.db.payments.find_one({"stripe_payment_intent_id": payment_id})

    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")

    if payment["status"] != "succeeded":
        raise HTTPException(status_code=400, detail="Seuls les paiements réussis peuvent être remboursés")

    try:
        refund_params = {"payment_intent": payment_id}
        if amount:
            refund_params["amount"] = amount

        refund = stripe.Refund.create(**refund_params)

        # Update payment status
        new_status = "refunded" if not amount or amount >= payment["amount"] else "partially_refunded"
        await config.db.payments.update_one(
            {"stripe_payment_intent_id": payment_id},
            {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
        )

        # If full refund, cancel subscription
        if new_status == "refunded":
            await config.db.users.update_one(
                {"id": payment["user_id"]},
                {"$set": {"subscription_type": None, "subscription_end": None}}
            )

        return {
            "success": True,
            "refund_id": refund.id,
            "amount": refund.amount,
            "status": new_status
        }

    except stripe.error.StripeError as e:
        config.logger.error(f"Stripe refund error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur de remboursement: {str(e)}")


# ==================== STRIPE WEBHOOK ====================

@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    # STRIPE_WEBHOOK_SECRET is mandatory: without it we cannot verify the
    # request actually came from Stripe, so refuse it rather than trusting
    # an unsigned payload (which would let anyone forge a fake payment event).
    if not config.STRIPE_WEBHOOK_SECRET:
        config.logger.error("Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not configured")
        raise HTTPException(status_code=503, detail="Webhook not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, config.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        config.logger.error(f"Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        config.logger.error(f"Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event.get("type") if isinstance(event, dict) else event.type

    # Log event
    config.logger.info(f"Stripe webhook received: {event_type}")

    # Handle specific events
    if event_type == "payment_intent.succeeded":
        data = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event.data.object
        payment_intent_id = data.get("id") if isinstance(data, dict) else data.id

        # Update payment status
        payment = await config.db.payments.find_one({"stripe_payment_intent_id": payment_intent_id})
        if payment and payment["status"] != "succeeded":
            # Get plan details
            plan = await get_plan_by_id(payment["plan_id"])
            if plan:
                end_date = datetime.utcnow() + timedelta(days=plan["duration_days"])

                # Update payment
                await config.db.payments.update_one(
                    {"stripe_payment_intent_id": payment_intent_id},
                    {"$set": {"status": "succeeded", "updated_at": datetime.utcnow()}}
                )

                # Create subscription
                subscription = Subscription(
                    user_id=payment["user_id"],
                    plan=payment["plan_id"],
                    price=payment["amount"] / 100 if payment["currency"] != "XAF" else payment["amount"],
                    end_date=end_date,
                    status="active"
                )
                await config.db.subscriptions.insert_one(subscription.dict())

                # Update user
                await config.db.users.update_one(
                    {"id": payment["user_id"]},
                    {"$set": {
                        "subscription_type": payment["plan_id"],
                        "subscription_end": end_date
                    }}
                )

                config.logger.info(f"Subscription activated for user {payment['user_id']}")

    elif event_type == "payment_intent.payment_failed":
        data = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event.data.object
        payment_intent_id = data.get("id") if isinstance(data, dict) else data.id

        await config.db.payments.update_one(
            {"stripe_payment_intent_id": payment_intent_id},
            {"$set": {"status": "failed", "updated_at": datetime.utcnow()}}
        )
        config.logger.info(f"Payment failed: {payment_intent_id}")

    return {"received": True}


# ==================== STRIPE CHECKOUT ENDPOINTS ====================

@router.post("/checkout/create-session")
async def create_checkout_session_endpoint(
    data: CheckoutSessionCreate,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Create a Stripe Checkout session for subscription purchase.
    Returns a URL to redirect the user to Stripe's hosted checkout page.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    # Get base URL from request
    base_url = str(request.base_url).rstrip('/')

    # Default URLs if not provided
    success_url = data.success_url or f"{base_url}/payment-success"
    cancel_url = data.cancel_url or f"{base_url}/payment-cancel"

    try:
        result = await create_checkout_session(
            db=config.db,
            user_id=current_user.id,
            email=current_user.email,
            plan_id=data.plan_id,
            currency=data.currency,
            success_url=success_url,
            cancel_url=cancel_url
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.StripeError as e:
        config.logger.error(f"Stripe error creating checkout session: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur Stripe: {str(e)}")


@router.get("/checkout/session/{session_id}")
async def get_checkout_session_status(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get the status of a checkout session.
    Used to verify payment completion after redirect.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    try:
        session = stripe.checkout.Session.retrieve(session_id)

        # Verify the session belongs to this user
        if session.metadata.get("toomtoon_user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Session non autorisée")

        return {
            "session_id": session.id,
            "status": session.status,
            "payment_status": session.payment_status,
            "subscription_id": session.subscription,
            "customer_email": session.customer_email
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Erreur: {str(e)}")


@router.post("/checkout/cancel-subscription")
async def cancel_subscription_endpoint(
    immediately: bool = False,
    current_user: User = Depends(get_current_user)
):
    """
    Cancel the current user's subscription.
    If immediately=False (default), cancels at the end of the billing period.
    If immediately=True, cancels right away.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    try:
        result = await cancel_subscription(config.db, current_user.id, immediately)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Erreur: {str(e)}")


@router.get("/checkout/customer-portal")
async def get_customer_portal_endpoint(
    return_url: Optional[str] = None,
    request: Request = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get a URL to Stripe's Customer Portal for subscription management.
    Users can update payment methods, view invoices, cancel subscriptions, etc.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    # Default return URL
    if not return_url:
        base_url = str(request.base_url).rstrip('/')
        return_url = f"{base_url}/subscription"

    try:
        portal_url = await get_customer_portal_url(config.db, current_user.id, return_url)
        return {"portal_url": portal_url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Erreur: {str(e)}")


@router.get("/checkout/subscription-status")
async def get_subscription_status(current_user: User = Depends(get_current_user)):
    """
    Get the current user's subscription status.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    # Get subscription from database
    subscription = await config.db.subscriptions.find_one({
        "user_id": current_user.id,
        "status": {"$in": ["active", "trialing", "past_due"]}
    })

    if not subscription:
        return {
            "has_subscription": False,
            "status": None,
            "plan_id": None,
            "current_period_end": None,
            "cancel_at_period_end": False
        }

    return {
        "has_subscription": True,
        "status": subscription.get("status"),
        "plan_id": subscription.get("plan"),
        "current_period_end": subscription.get("current_period_end"),
        "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
        "subscription_provider": subscription.get("subscription_provider", "stripe")
    }


# Update webhook to handle Checkout events
@router.post("/webhooks/stripe-checkout")
async def stripe_checkout_webhook(request: Request):
    """
    Handle Stripe webhook events for Checkout/Subscriptions.
    Configure this URL in your Stripe Dashboard.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    # STRIPE_WEBHOOK_SECRET is mandatory: without it we cannot verify the
    # request actually came from Stripe, so refuse it rather than trusting
    # an unsigned payload (which would let anyone forge a fake subscription event).
    if not config.STRIPE_WEBHOOK_SECRET:
        config.logger.error("Stripe checkout webhook rejected: STRIPE_WEBHOOK_SECRET is not configured")
        raise HTTPException(status_code=503, detail="Webhook not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, config.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        config.logger.error(f"Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        config.logger.error(f"Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event.type
    data_object = event.data.object

    config.logger.info(f"Stripe Checkout webhook received: {event_type}")

    try:
        if event_type == "checkout.session.completed":
            await handle_checkout_completed(config.db, data_object)

        elif event_type == "customer.subscription.updated":
            await handle_subscription_updated(config.db, data_object)

        elif event_type == "customer.subscription.deleted":
            await handle_subscription_deleted(config.db, data_object)

        elif event_type == "invoice.paid":
            await handle_invoice_paid(config.db, data_object)

        elif event_type == "invoice.payment_failed":
            await handle_invoice_payment_failed(config.db, data_object)

        else:
            config.logger.info(f"Unhandled event type: {event_type}")

    except Exception as e:
        config.logger.error(f"Error handling webhook event {event_type}: {str(e)}")
        # Don't raise - return 200 to acknowledge receipt

    return {"received": True}


async def initialize_stripe_products():
    """Initialize Stripe products and prices on startup."""
    try:
        if config.STRIPE_SECRET_KEY:
            await ensure_stripe_products(config.db)
            config.logger.info("Stripe products initialized successfully")
    except Exception as e:
        config.logger.error(f"Failed to initialize Stripe products: {str(e)}")


# ==================== ADMIN SUBSCRIPTION PLAN MANAGEMENT ====================

@router.get("/admin/subscription-plans")
async def admin_get_all_plans(admin: User = Depends(require_admin)):
    """Get all subscription plans including inactive (admin only)"""
    plans = await config.db.subscription_plans.find().to_list(50)
    return [{
        "id": p["id"],
        "name": p["name"],
        "duration_days": p["duration_days"],
        "prices": p["prices"],
        "features": p.get("features", []),
        "popular": p.get("popular", False),
        "active": p.get("active", True)
    } for p in plans]

@router.post("/admin/subscription-plans")
async def admin_create_plan(
    plan_data: SubscriptionPlanCreate,
    admin: User = Depends(require_admin)
):
    """Create a new subscription plan (admin only)"""
    existing = await config.db.subscription_plans.find_one({"id": plan_data.id})
    if existing:
        raise HTTPException(status_code=400, detail="Un plan avec cet ID existe déjà")

    await config.db.subscription_plans.insert_one(plan_data.dict())
    return plan_data.dict()

@router.put("/admin/subscription-plans/{plan_id}")
async def admin_update_plan(
    plan_id: str,
    plan_data: SubscriptionPlanUpdate,
    admin: User = Depends(require_admin)
):
    """Update a subscription plan (admin only)"""
    plan = await config.db.subscription_plans.find_one({"id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan non trouvé")

    update_dict = {k: v for k, v in plan_data.dict().items() if v is not None}

    if update_dict:
        await config.db.subscription_plans.update_one({"id": plan_id}, {"$set": update_dict})

    updated_plan = await config.db.subscription_plans.find_one({"id": plan_id})
    return {
        "id": updated_plan["id"],
        "name": updated_plan["name"],
        "duration_days": updated_plan["duration_days"],
        "prices": updated_plan["prices"],
        "features": updated_plan.get("features", []),
        "popular": updated_plan.get("popular", False),
        "active": updated_plan.get("active", True)
    }

@router.delete("/admin/subscription-plans/{plan_id}")
async def admin_delete_plan(
    plan_id: str,
    admin: User = Depends(require_admin)
):
    """Deactivate a subscription plan (admin only)"""
    result = await config.db.subscription_plans.update_one(
        {"id": plan_id},
        {"$set": {"active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    return {"success": True}

@router.get("/admin/payments")
async def admin_get_payments(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    admin: User = Depends(require_admin)
):
    """Get all payments (admin only)"""
    query = {}
    if status:
        query["status"] = status

    total = await config.db.payments.count_documents(query)
    payments = await config.db.payments.find(query).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)

    result = []
    for p in payments:
        user = await config.db.users.find_one({"id": p["user_id"]})
        plan = await get_plan_by_id(p["plan_id"])
        result.append({
            "id": p["id"],
            "user_email": user["email"] if user else "Unknown",
            "user_name": user["username"] if user else "Unknown",
            "plan_name": plan["name"] if plan else p["plan_id"],
            "amount": p["amount"],
            "currency": p["currency"],
            "status": p["status"],
            "stripe_payment_intent_id": p["stripe_payment_intent_id"],
            "created_at": p["created_at"].isoformat() if p.get("created_at") else None
        })

    return {"total": total, "payments": result}

# Legacy subscribe endpoint (keep for backward compatibility but redirect to payment flow)
@router.post("/subscriptions/subscribe")
async def subscribe(
    sub_data: SubscriptionCreate,
    current_user: User = Depends(get_current_user)
):
    """Legacy subscription endpoint - now requires payment"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    # Get plan from database
    plan = await get_plan_by_id(f"plan_{sub_data.plan}")
    if not plan:
        # Try old format
        plan = await get_plan_by_id(sub_data.plan)

    if not plan:
        raise HTTPException(status_code=400, detail="Plan invalide - utilisez le nouveau système de paiement")

    return {
        "success": False,
        "message": "Veuillez utiliser le système de paiement Stripe",
        "redirect": "/payment",
        "plan_id": plan["id"]
    }


# ==================== ADMIN SUBSCRIPTIONS ====================

@router.get("/admin/subscriptions")
async def get_all_subscriptions(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    admin: User = Depends(require_admin)
):
    """Get all subscriptions (admin only)"""
    query = {}
    if status:
        query["status"] = status

    total = await config.db.subscriptions.count_documents(query)
    subscriptions = await config.db.subscriptions.find(query).skip(skip).limit(limit).sort("start_date", -1).to_list(limit)

    result = []
    for sub in subscriptions:
        user = await config.db.users.find_one({"id": sub["user_id"]})
        result.append({
            "id": sub.get("id"),
            "user_id": sub.get("user_id"),
            "plan": sub.get("plan"),
            "price": sub.get("price"),
            "start_date": sub.get("start_date"),
            "end_date": sub.get("end_date"),
            "status": sub.get("status"),
            "user_email": user["email"] if user else "Unknown",
            "user_name": user["username"] if user else "Unknown"
        })

    return {"total": total, "subscriptions": result}
