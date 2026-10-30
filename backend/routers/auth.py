"""Authentication, password reset, user settings, and notifications."""
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request

import config
from auth_utils import (
    get_current_user,
    hash_password,
    issue_tokens,
    password_reset_tokens,
    revoke_refresh_token,
    rotate_refresh_token,
    verify_and_migrate_password,
)
from models import (
    PasswordChange,
    PasswordResetRequest,
    RefreshTokenRequest,
    User,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    validate_password_strength,
)
from stripe_checkout import cancel_subscription

router = APIRouter()


# ==================== AUTH ROUTES ====================

@router.post("/auth/register", response_model=UserResponse)
@config.limiter.limit("5/minute")
async def register(request: Request, user_data: UserCreate):
    # Check if email exists
    existing = await config.db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    # Create user
    user = User(
        email=user_data.email,
        username=user_data.username
    )
    user_dict = user.dict()
    user_dict["password_hash"] = hash_password(user_data.password)

    await config.db.users.insert_one(user_dict)

    token, refresh_token = await issue_tokens(user.id, user.email)
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        token=token,
        refresh_token=refresh_token
    )

@router.post("/auth/login", response_model=UserResponse)
@config.limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin):
    user = await config.db.users.find_one({"email": credentials.email})
    if not user or not await verify_and_migrate_password(credentials.password, user):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token, refresh_token = await issue_tokens(user["id"], user["email"], user.get("is_admin", False))
    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        is_admin=user.get("is_admin", False),
        subscription_type=user.get("subscription_type"),
        subscription_end=user.get("subscription_end"),
        notifications_enabled=user.get("notifications_enabled", True),
        language=user.get("language", "fr"),
        token=token,
        refresh_token=refresh_token
    )

@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        is_admin=current_user.is_admin,
        subscription_type=current_user.subscription_type,
        subscription_end=current_user.subscription_end,
        notifications_enabled=current_user.notifications_enabled,
        language=current_user.language
    )

@router.post("/auth/refresh")
async def refresh_access_token(body: RefreshTokenRequest):
    """Exchange a still-valid refresh token for a new access+refresh pair."""
    result = await rotate_refresh_token(body.refresh_token)
    if not result:
        raise HTTPException(status_code=401, detail="Refresh token invalide ou expiré")
    access_token, refresh_token = result
    return {"token": access_token, "refresh_token": refresh_token}

@router.post("/auth/logout")
async def logout(body: RefreshTokenRequest):
    """Revoke a refresh token so it can no longer be used to mint new access tokens."""
    await revoke_refresh_token(body.refresh_token)
    return {"success": True}


# ==================== PASSWORD RESET ROUTES ====================

@router.post("/auth/forgot-password")
@config.limiter.limit("3/minute")
async def forgot_password(request: Request, reset_request: PasswordResetRequest):
    """Request password reset - generates a reset token"""
    user = await config.db.users.find_one({"email": reset_request.email})
    if not user:
        # Don't reveal if email exists
        return {"success": True, "message": "Si l'email existe, un code de réinitialisation a été envoyé"}

    # Generate reset token (6 digit code), using a CSPRNG rather than `random`
    reset_code = ''.join(secrets.choice("0123456789") for _ in range(6))

    # Store token with expiration (15 minutes)
    password_reset_tokens[reset_request.email] = {
        "code": reset_code,
        "expires": datetime.utcnow() + timedelta(minutes=15)
    }

    # TODO: send the code by email once an email service is integrated.
    # Until then it is only logged server-side - it must never be returned
    # in the API response, as that would let anyone reset any account.
    config.logger.info(f"Password reset code for {reset_request.email}: {reset_code}")

    return {
        "success": True,
        "message": "Si l'email existe, un code de réinitialisation a été envoyé"
    }

@router.post("/auth/verify-reset-code")
async def verify_reset_code(email: str, code: str):
    """Verify the reset code"""
    if email not in password_reset_tokens:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré")

    token_data = password_reset_tokens[email]
    if datetime.utcnow() > token_data["expires"]:
        del password_reset_tokens[email]
        raise HTTPException(status_code=400, detail="Code expiré")

    if token_data["code"] != code:
        raise HTTPException(status_code=400, detail="Code invalide")

    return {"success": True, "message": "Code vérifié"}

@router.post("/auth/reset-password")
async def reset_password(email: str, code: str, new_password: str):
    """Reset password with verified code"""
    try:
        new_password = validate_password_strength(new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if email not in password_reset_tokens:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré")

    token_data = password_reset_tokens[email]
    if datetime.utcnow() > token_data["expires"] or token_data["code"] != code:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré")

    # Update password
    result = await config.db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": hash_password(new_password)}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Utilisateur non trouvé")

    # Remove used token
    del password_reset_tokens[email]

    return {"success": True, "message": "Mot de passe réinitialisé avec succès"}


# ==================== USER SETTINGS ROUTES ====================

@router.put("/user/profile", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}

    if "email" in update_dict:
        existing = await config.db.users.find_one({"email": update_dict["email"], "id": {"$ne": current_user.id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")

    if update_dict:
        await config.db.users.update_one({"id": current_user.id}, {"$set": update_dict})

    updated_user = await config.db.users.find_one({"id": current_user.id})
    return UserResponse(**updated_user)

@router.put("/user/password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    user = await config.db.users.find_one({"id": current_user.id})
    if not user or not await verify_and_migrate_password(password_data.current_password, user):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")

    await config.db.users.update_one(
        {"id": current_user.id},
        {"$set": {"password_hash": hash_password(password_data.new_password)}}
    )

    return {"success": True, "message": "Mot de passe modifié avec succès"}

@router.delete("/user/account")
async def delete_account(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    # Cancel any active Stripe subscription first, so the user isn't billed
    # after their account no longer exists. Absence of a subscription (or a
    # transient Stripe error) must not block the account deletion itself.
    try:
        await cancel_subscription(config.db, current_user.id, immediately=True)
    except ValueError:
        pass
    except Exception as e:
        config.logger.error(f"Failed to cancel Stripe subscription for user {current_user.id} on account deletion: {e}")

    # Google Play is the merchant of record for a Play-billed subscription,
    # so it can't be cancelled from here (see CGV Article 5) - flag it so
    # support can follow up, rather than silently leaving it billing.
    google_play_sub = await config.db.subscriptions.find_one({
        "user_id": current_user.id,
        "subscription_provider": "google_play",
        "status": "active",
    })
    if google_play_sub:
        config.logger.warning(
            f"User {current_user.id} deleted their account with an active Google Play "
            f"subscription that could not be cancelled automatically; they must cancel "
            f"it from the Play Store themselves."
        )

    # Delete user data
    await config.db.reading_history.delete_many({"user_id": current_user.id})
    await config.db.subscriptions.delete_many({"user_id": current_user.id})
    await config.db.notifications.delete_many({"user_id": current_user.id})
    await config.db.users.delete_one({"id": current_user.id})

    return {"success": True, "message": "Compte supprimé avec succès"}


# ==================== NOTIFICATIONS ROUTES ====================

@router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    notifications = await config.db.notifications.find({"user_id": current_user.id}).sort("created_at", -1).to_list(50)
    return notifications

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    await config.db.notifications.update_one(
        {"id": notification_id, "user_id": current_user.id},
        {"$set": {"read": True}}
    )
    return {"success": True}

@router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    await config.db.notifications.update_many(
        {"user_id": current_user.id},
        {"$set": {"read": True}}
    )
    return {"success": True}
