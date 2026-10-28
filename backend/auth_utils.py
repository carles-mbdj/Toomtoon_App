"""Password hashing, JWT issuance, and the auth dependencies shared by
every router (`get_current_user`, `require_admin`)."""
from datetime import datetime, timedelta

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials

import config
from models import User

# Store password reset tokens (in production, use Redis or database).
# Mutated in place everywhere it's used, so re-exporting the name is safe.
password_reset_tokens = {}


def hash_password(password: str) -> str:
    return config.pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return config.pwd_context.verify(password, password_hash)


async def verify_and_migrate_password(password: str, user: dict) -> bool:
    """Verify a password against a user's stored hash, transparently
    upgrading legacy unsalted SHA256 hashes to bcrypt on successful login."""
    if not config.pwd_context.verify(password, user["password_hash"]):
        return False
    if config.pwd_context.needs_update(user["password_hash"]):
        await config.db.users.update_one(
            {"id": user["id"]},
            {"$set": {"password_hash": hash_password(password)}}
        )
    return True


def create_token(user_id: str, email: str, is_admin: bool = False) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "is_admin": is_admin,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(config.security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        user = await config.db.users.find_one({"id": payload["user_id"]})
        if user:
            return User(**user)
    except Exception:
        pass
    return None


async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(config.security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(credentials.credentials, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        user = await config.db.users.find_one({"id": payload["user_id"]})
        if user and user.get("is_admin"):
            return User(**user)
    except Exception:
        pass
    raise HTTPException(status_code=403, detail="Accès administrateur requis")
