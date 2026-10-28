"""Authentication, password reset, user settings, and notifications."""
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException

import config
from auth_utils import (
    create_token,
    get_current_user,
    hash_password,
    password_reset_tokens,
    verify_and_migrate_password,
)
from models import (
    PasswordChange,
    PasswordResetRequest,
    User,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
)

router = APIRouter()


# ==================== AUTH ROUTES ====================

@router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
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

    token = create_token(user.id, user.email)
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        token=token
    )

@router.post("/auth/login", response_model=UserResponse)
async def login(credentials: UserLogin):
    user = await config.db.users.find_one({"email": credentials.email})
    if not user or not await verify_and_migrate_password(credentials.password, user):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_token(user["id"], user["email"], user.get("is_admin", False))
    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        is_admin=user.get("is_admin", False),
        subscription_type=user.get("subscription_type"),
        subscription_end=user.get("subscription_end"),
        notifications_enabled=user.get("notifications_enabled", True),
        language=user.get("language", "fr"),
        token=token
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


# ==================== PASSWORD RESET ROUTES ====================

@router.post("/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """Request password reset - generates a reset token"""
    user = await config.db.users.find_one({"email": request.email})
    if not user:
        # Don't reveal if email exists
        return {"success": True, "message": "Si l'email existe, un code de réinitialisation a été envoyé"}

    # Generate reset token (6 digit code), using a CSPRNG rather than `random`
    reset_code = ''.join(secrets.choice("0123456789") for _ in range(6))

    # Store token with expiration (15 minutes)
    password_reset_tokens[request.email] = {
        "code": reset_code,
        "expires": datetime.utcnow() + timedelta(minutes=15)
    }

    # TODO: send the code by email once an email service is integrated.
    # Until then it is only logged server-side - it must never be returned
    # in the API response, as that would let anyone reset any account.
    config.logger.info(f"Password reset code for {request.email}: {reset_code}")

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
