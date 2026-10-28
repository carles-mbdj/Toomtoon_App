"""Password hashing, JWT issuance, and the auth dependencies shared by
every router (`get_current_user`, `require_admin`)."""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials

import config
from models import User

# Store password reset tokens (in production, use Redis or database).
# Mutated in place everywhere it's used, so re-exporting the name is safe.
password_reset_tokens = {}

# Access tokens are short-lived; refresh tokens (stored hashed in
# `config.db.refresh_tokens`, revocable, rotated on every use) are what
# keeps the user signed in beyond that without re-entering credentials.
ACCESS_TOKEN_LIFETIME = timedelta(minutes=30)
REFRESH_TOKEN_LIFETIME = timedelta(days=30)


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
        "exp": datetime.utcnow() + ACCESS_TOKEN_LIFETIME
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def _hash_refresh_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


async def create_refresh_token(user_id: str) -> str:
    """Issue a new opaque refresh token and store only its hash, so a
    database leak doesn't hand out directly usable tokens."""
    raw_token = secrets.token_urlsafe(48)
    await config.db.refresh_tokens.insert_one({
        "token_hash": _hash_refresh_token(raw_token),
        "user_id": user_id,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + REFRESH_TOKEN_LIFETIME,
    })
    return raw_token


async def issue_tokens(user_id: str, email: str, is_admin: bool = False) -> Tuple[str, str]:
    """Issue a fresh (access_token, refresh_token) pair for a user."""
    access_token = create_token(user_id, email, is_admin)
    refresh_token = await create_refresh_token(user_id)
    return access_token, refresh_token


async def rotate_refresh_token(raw_token: str) -> Optional[Tuple[str, str]]:
    """Validate a refresh token and exchange it for a new access+refresh
    pair, deleting the old one. Rotating on every use limits the replay
    window if a refresh token is ever stolen."""
    token_hash = _hash_refresh_token(raw_token)
    stored = await config.db.refresh_tokens.find_one({"token_hash": token_hash})
    if not stored or stored["expires_at"] < datetime.utcnow():
        return None
    await config.db.refresh_tokens.delete_one({"token_hash": token_hash})

    user = await config.db.users.find_one({"id": stored["user_id"]})
    if not user:
        return None
    return await issue_tokens(user["id"], user["email"], user.get("is_admin", False))


async def revoke_refresh_token(raw_token: str) -> None:
    await config.db.refresh_tokens.delete_one({"token_hash": _hash_refresh_token(raw_token)})


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
