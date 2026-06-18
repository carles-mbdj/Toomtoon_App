from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import hashlib
import jwt
import secrets
import stripe
import hmac

# Import Stripe Checkout module
from stripe_checkout import (
    ensure_stripe_products,
    create_checkout_session,
    handle_checkout_completed,
    handle_subscription_updated,
    handle_subscription_deleted,
    handle_invoice_paid,
    handle_invoice_payment_failed,
    cancel_subscription,
    get_customer_portal_url,
    get_subscription_plans,
    SUBSCRIPTION_PLANS
)

ROOT_DIR = Path(__file__).parent
ADMIN_DIR = ROOT_DIR.parent / 'admin-panel' / 'dist'
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'toomtoon_db')]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"

# Admin credentials (in production, use environment variables)
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@toomtoon.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')

# Initialize Stripe
stripe.api_key = STRIPE_SECRET_KEY

# Create the main app without a prefix
app = FastAPI(title="ToomToon API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    username: str
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    subscription_type: Optional[str] = None
    subscription_end: Optional[datetime] = None
    notifications_enabled: bool = True
    language: str = "fr"

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    is_admin: bool = False
    subscription_type: Optional[str] = None
    subscription_end: Optional[datetime] = None
    notifications_enabled: bool = True
    language: str = "fr"
    token: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    notifications_enabled: Optional[bool] = None
    language: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class Episode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    webtoon_id: str
    number: int
    title: str
    thumbnail: Optional[str] = None
    pages: List[str] = []  # List of image URLs/base64
    is_free: bool = False
    release_date: datetime = Field(default_factory=datetime.utcnow)
    views: int = 0

class EpisodeCreate(BaseModel):
    webtoon_id: str
    number: int
    title: str
    thumbnail: Optional[str] = None
    pages: List[str] = []
    is_free: bool = False

class EpisodeUpdate(BaseModel):
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    pages: Optional[List[str]] = None
    is_free: Optional[bool] = None

class Webtoon(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    author: str
    genre: str
    description: str
    cover_image: Optional[str] = None
    season: int = 1
    status: str = "ongoing"  # ongoing, completed
    diffusion_day: Optional[str] = None  # lundi, mardi, etc.
    is_featured: bool = False  # Webtoon en exclusivité
    created_at: datetime = Field(default_factory=datetime.utcnow)
    total_episodes: int = 0
    views: int = 0

class WebtoonCreate(BaseModel):
    title: str
    author: str
    genre: str
    description: str
    cover_image: Optional[str] = None
    season: int = 1
    status: str = "ongoing"
    diffusion_day: Optional[str] = None
    is_featured: bool = False

class WebtoonUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    genre: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    season: Optional[int] = None
    status: Optional[str] = None
    diffusion_day: Optional[str] = None
    is_featured: Optional[bool] = None

class Subscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    plan: str  # 1_month, 3_months, 6_months, 12_months
    price: float
    start_date: datetime = Field(default_factory=datetime.utcnow)
    end_date: datetime
    status: str = "active"

class SubscriptionCreate(BaseModel):
    plan: str

class ReadingHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    webtoon_id: str
    episode_id: str
    last_page: int = 0
    read_at: datetime = Field(default_factory=datetime.utcnow)

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: str = "info"  # info, new_episode, subscription, system
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== NEW MODELS ====================

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    webtoon_id: Optional[str] = None
    episode_id: Optional[str] = None
    article_id: Optional[str] = None
    content: str
    likes: List[str] = []  # List of user IDs who liked
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CommentCreate(BaseModel):
    webtoon_id: Optional[str] = None
    episode_id: Optional[str] = None
    article_id: Optional[str] = None
    content: str

class Article(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subtitle: Optional[str] = None
    content: str
    cover_image: Optional[str] = None
    category: str = "news"  # news, interview, review, behind_scenes
    author: str = "ToomToon"
    featured: bool = False
    views: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ArticleCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    content: str
    cover_image: Optional[str] = None
    category: str = "news"
    author: str = "ToomToon"
    featured: bool = False

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

# Store password reset tokens (in production, use Redis or database)
password_reset_tokens = {}

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str, email: str, is_admin: bool = False) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "is_admin": is_admin,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]})
        if user:
            return User(**user)
    except Exception:
        pass
    return None

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]})
        if user and user.get("is_admin"):
            return User(**user)
    except Exception:
        pass
    raise HTTPException(status_code=403, detail="Accès administrateur requis")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # Create user
    user = User(
        email=user_data.email,
        username=user_data.username
    )
    user_dict = user.dict()
    user_dict["password_hash"] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
    token = create_token(user.id, user.email)
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        token=token
    )

@api_router.post("/auth/login", response_model=UserResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({
        "email": credentials.email,
        "password_hash": hash_password(credentials.password)
    })
    if not user:
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

@api_router.get("/auth/me", response_model=UserResponse)
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

@api_router.post("/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """Request password reset - generates a reset token"""
    user = await db.users.find_one({"email": request.email})
    if not user:
        # Don't reveal if email exists
        return {"success": True, "message": "Si l'email existe, un code de réinitialisation a été envoyé"}
    
    # Generate reset token (6 digit code for simplicity)
    import random
    reset_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Store token with expiration (15 minutes)
    password_reset_tokens[request.email] = {
        "code": reset_code,
        "expires": datetime.utcnow() + timedelta(minutes=15)
    }
    
    # In production, send email here
    # For demo, we'll return the code (remove in production!)
    return {
        "success": True, 
        "message": "Code de réinitialisation envoyé",
        "demo_code": reset_code  # Remove in production!
    }

@api_router.post("/auth/verify-reset-code")
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

@api_router.post("/auth/reset-password")
async def reset_password(email: str, code: str, new_password: str):
    """Reset password with verified code"""
    if email not in password_reset_tokens:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré")
    
    token_data = password_reset_tokens[email]
    if datetime.utcnow() > token_data["expires"] or token_data["code"] != code:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré")
    
    # Update password
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Utilisateur non trouvé")
    
    # Remove used token
    del password_reset_tokens[email]
    
    return {"success": True, "message": "Mot de passe réinitialisé avec succès"}

# ==================== USER SETTINGS ROUTES ====================

@api_router.put("/user/profile", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    if "email" in update_dict:
        existing = await db.users.find_one({"email": update_dict["email"], "id": {"$ne": current_user.id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    if update_dict:
        await db.users.update_one({"id": current_user.id}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"id": current_user.id})
    return UserResponse(**updated_user)

@api_router.put("/user/password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    user = await db.users.find_one({
        "id": current_user.id,
        "password_hash": hash_password(password_data.current_password)
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"password_hash": hash_password(password_data.new_password)}}
    )
    
    return {"success": True, "message": "Mot de passe modifié avec succès"}

@api_router.delete("/user/account")
async def delete_account(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    # Delete user data
    await db.reading_history.delete_many({"user_id": current_user.id})
    await db.subscriptions.delete_many({"user_id": current_user.id})
    await db.notifications.delete_many({"user_id": current_user.id})
    await db.users.delete_one({"id": current_user.id})
    
    return {"success": True, "message": "Compte supprimé avec succès"}

# ==================== NOTIFICATIONS ROUTES ====================

@api_router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    notifications = await db.notifications.find({"user_id": current_user.id}).sort("created_at", -1).to_list(50)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user.id},
        {"$set": {"read": True}}
    )
    return {"success": True}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    await db.notifications.update_many(
        {"user_id": current_user.id},
        {"$set": {"read": True}}
    )
    return {"success": True}

# ==================== WEBTOON ROUTES ====================

@api_router.get("/webtoons", response_model=List[Webtoon])
async def get_webtoons(
    genre: Optional[str] = None,
    status: Optional[str] = None,
    diffusion_day: Optional[str] = None,
    search: Optional[str] = None
):
    query = {}
    if genre:
        query["genre"] = genre
    if status:
        query["status"] = status
    if diffusion_day:
        query["diffusion_day"] = diffusion_day
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"author": {"$regex": search, "$options": "i"}}
        ]
    
    webtoons = await db.webtoons.find(query).sort("created_at", -1).to_list(100)
    return [Webtoon(**w) for w in webtoons]

@api_router.get("/webtoons/featured", response_model=List[Webtoon])
async def get_featured_webtoons():
    """Get featured webtoons (is_featured=True) or top ongoing by views"""
    # First try to get webtoons marked as featured
    featured = await db.webtoons.find({"is_featured": True, "status": "ongoing"}).sort("views", -1).limit(5).to_list(5)
    
    # If no featured, fallback to top ongoing by views
    if not featured:
        featured = await db.webtoons.find({"status": "ongoing"}).sort("views", -1).limit(5).to_list(5)
    
    return [Webtoon(**w) for w in featured]

@api_router.get("/webtoons/{webtoon_id}", response_model=Webtoon)
async def get_webtoon(webtoon_id: str):
    webtoon = await db.webtoons.find_one({"id": webtoon_id})
    if not webtoon:
        raise HTTPException(status_code=404, detail="Webtoon non trouvé")
    return Webtoon(**webtoon)

@api_router.post("/webtoons", response_model=Webtoon)
async def create_webtoon(webtoon_data: WebtoonCreate):
    webtoon = Webtoon(**webtoon_data.dict())
    await db.webtoons.insert_one(webtoon.dict())
    return webtoon

@api_router.put("/webtoons/{webtoon_id}", response_model=Webtoon)
async def update_webtoon(webtoon_id: str, webtoon_data: WebtoonCreate):
    result = await db.webtoons.update_one(
        {"id": webtoon_id},
        {"$set": webtoon_data.dict()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Webtoon non trouvé")
    webtoon = await db.webtoons.find_one({"id": webtoon_id})
    return Webtoon(**webtoon)

# ==================== EPISODE ROUTES ====================

@api_router.get("/webtoons/{webtoon_id}/episodes", response_model=List[Episode])
async def get_episodes(webtoon_id: str):
    episodes = await db.episodes.find({"webtoon_id": webtoon_id}).sort("number", 1).to_list(100)
    return [Episode(**e) for e in episodes]

@api_router.get("/episodes/recent", response_model=List[dict])
async def get_recent_episodes():
    episodes = await db.episodes.find().sort("release_date", -1).limit(10).to_list(10)
    result = []
    for ep in episodes:
        webtoon = await db.webtoons.find_one({"id": ep["webtoon_id"]})
        if webtoon:
            result.append({
                **Episode(**ep).dict(),
                "webtoon_title": webtoon["title"],
                "webtoon_cover": webtoon.get("cover_image")
            })
    return result

@api_router.get("/episodes/{episode_id}")
async def get_episode(
    episode_id: str,
    current_user: User = Depends(get_current_user)
):
    episode = await db.episodes.find_one({"id": episode_id})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode non trouvé")
    
    ep = Episode(**episode)
    
    # Get webtoon to check status
    webtoon = await db.webtoons.find_one({"id": ep.webtoon_id})
    if not webtoon:
        raise HTTPException(status_code=404, detail="Webtoon non trouvé")
    
    # Block access to non-free episodes of ongoing webtoons
    if webtoon.get("status") == "ongoing" and not ep.is_free:
        # Only allow access if user has a valid subscription
        if not current_user:
            raise HTTPException(
                status_code=401, 
                detail="Connectez-vous pour accéder à cet épisode d'un webtoon en cours"
            )
        if not current_user.subscription_type or (current_user.subscription_end and current_user.subscription_end < datetime.utcnow()):
            raise HTTPException(
                status_code=403, 
                detail="Abonnement requis pour accéder aux épisodes premium des webtoons en cours"
            )
    
    # Check if user can access this episode (premium check)
    if not ep.is_free:
        if not current_user:
            raise HTTPException(status_code=401, detail="Connectez-vous pour accéder à cet épisode")
        if not current_user.subscription_type or (current_user.subscription_end and current_user.subscription_end < datetime.utcnow()):
            raise HTTPException(status_code=403, detail="Abonnement requis pour cet épisode")
    
    # Increment views
    await db.episodes.update_one({"id": episode_id}, {"$inc": {"views": 1}})
    
    return ep

@api_router.post("/episodes", response_model=Episode)
async def create_episode(episode_data: EpisodeCreate):
    episode = Episode(**episode_data.dict())
    await db.episodes.insert_one(episode.dict())
    
    # Update webtoon total episodes
    await db.webtoons.update_one(
        {"id": episode_data.webtoon_id},
        {"$inc": {"total_episodes": 1}}
    )
    return episode

# ==================== GENRE ROUTES ====================

class Genre(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    webtoon_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GenreCreate(BaseModel):
    name: str

@api_router.get("/genres")
async def get_genres():
    """Get all genres with webtoon count"""
    # First, get all genres from collection
    genres_from_db = await db.genres.find().to_list(100)
    
    # If no genres in collection, extract from webtoons
    if not genres_from_db:
        genre_names = await db.webtoons.distinct("genre")
        for name in genre_names:
            if name:
                count = await db.webtoons.count_documents({"genre": name})
                genre = Genre(name=name, webtoon_count=count)
                await db.genres.insert_one(genre.dict())
        genres_from_db = await db.genres.find().to_list(100)
    
    # Update webtoon counts
    result = []
    for g in genres_from_db:
        count = await db.webtoons.count_documents({"genre": g.get("name")})
        result.append({
            "id": g.get("id"),
            "name": g.get("name"),
            "webtoon_count": count,
            "created_at": g.get("created_at").isoformat() if g.get("created_at") else None
        })
    
    return result

@api_router.post("/admin/genres")
async def create_genre(
    genre_data: GenreCreate,
    admin: User = Depends(require_admin)
):
    """Create a new genre (admin only)"""
    # Check if genre exists
    existing = await db.genres.find_one({"name": {"$regex": f"^{genre_data.name}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="Ce genre existe déjà")
    
    genre = Genre(name=genre_data.name)
    await db.genres.insert_one(genre.dict())
    
    return {
        "id": genre.id,
        "name": genre.name,
        "webtoon_count": 0,
        "created_at": genre.created_at.isoformat()
    }

@api_router.put("/admin/genres/{genre_id}")
async def update_genre(
    genre_id: str,
    genre_data: GenreCreate,
    admin: User = Depends(require_admin)
):
    """Update a genre (admin only)"""
    genre = await db.genres.find_one({"id": genre_id})
    if not genre:
        raise HTTPException(status_code=404, detail="Genre non trouvé")
    
    old_name = genre.get("name")
    
    # Update genre name
    await db.genres.update_one(
        {"id": genre_id},
        {"$set": {"name": genre_data.name}}
    )
    
    # Update all webtoons with old genre name
    await db.webtoons.update_many(
        {"genre": old_name},
        {"$set": {"genre": genre_data.name}}
    )
    
    count = await db.webtoons.count_documents({"genre": genre_data.name})
    
    return {
        "id": genre_id,
        "name": genre_data.name,
        "webtoon_count": count
    }

@api_router.delete("/admin/genres/{genre_id}")
async def delete_genre(
    genre_id: str,
    admin: User = Depends(require_admin)
):
    """Delete a genre (admin only)"""
    genre = await db.genres.find_one({"id": genre_id})
    if not genre:
        raise HTTPException(status_code=404, detail="Genre non trouvé")
    
    # Check if webtoons use this genre
    count = await db.webtoons.count_documents({"genre": genre.get("name")})
    if count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Impossible de supprimer: {count} webtoon(s) utilisent ce genre"
        )
    
    await db.genres.delete_one({"id": genre_id})
    return {"success": True}

# ==================== SUBSCRIPTION PLANS (Database Backed) ====================

# Default subscription plans (stored in database for admin modification)
DEFAULT_SUBSCRIPTION_PLANS = [
    {
        "id": "plan_1_month",
        "name": "1 Mois",
        "duration_days": 30,
        "prices": {
            "EUR": 300,   # 3.00 EUR in cents
            "USD": 350,   # 3.50 USD in cents  
            "XAF": 2000   # 2000 XAF (no cents)
        },
        "features": ["Accès illimité", "Lecture hors-ligne", "Sans publicité"],
        "popular": False,
        "active": True
    },
    {
        "id": "plan_3_months",
        "name": "3 Mois",
        "duration_days": 90,
        "prices": {
            "EUR": 600,   # 6.00 EUR
            "USD": 700,   # 7.00 USD
            "XAF": 4000   # 4000 XAF
        },
        "features": ["Accès illimité", "Lecture hors-ligne", "Sans publicité", "Économisez 33%"],
        "popular": True,
        "active": True
    },
    {
        "id": "plan_12_months",
        "name": "12 Mois",
        "duration_days": 365,
        "prices": {
            "EUR": 1200,  # 12.00 EUR
            "USD": 1400,  # 14.00 USD
            "XAF": 8000   # 8000 XAF
        },
        "features": ["Accès illimité", "Lecture hors-ligne", "Sans publicité", "Économisez 66%", "Accès anticipé"],
        "popular": False,
        "active": True
    }
]

# ==================== PAYMENT MODELS ====================

class PaymentIntentCreate(BaseModel):
    plan_id: str
    currency: str = "EUR"  # EUR, USD, XAF
    payment_method_id: Optional[str] = None

class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    amount: int
    currency: str
    status: str

class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    plan_id: str
    stripe_payment_intent_id: str
    amount: int  # In cents
    currency: str
    status: str  # pending, succeeded, failed, refunded
    idempotency_key: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict = {}

class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    duration_days: Optional[int] = None
    prices: Optional[Dict[str, int]] = None
    features: Optional[List[str]] = None
    popular: Optional[bool] = None
    active: Optional[bool] = None

class SubscriptionPlanCreate(BaseModel):
    id: str
    name: str
    duration_days: int
    prices: Dict[str, int]
    features: List[str] = []
    popular: bool = False
    active: bool = True

# ==================== PAYMENT HELPER FUNCTIONS ====================

async def get_subscription_plans_from_db():
    """Get subscription plans from database, seed if empty"""
    plans = await db.subscription_plans.find({"active": True}).to_list(20)
    if not plans:
        # Seed default plans
        for plan in DEFAULT_SUBSCRIPTION_PLANS:
            await db.subscription_plans.insert_one(plan)
        plans = await db.subscription_plans.find({"active": True}).to_list(20)
    return plans

async def get_plan_by_id(plan_id: str):
    """Get a specific subscription plan"""
    plan = await db.subscription_plans.find_one({"id": plan_id})
    return plan

def format_price(amount_cents: int, currency: str) -> str:
    """Format price for display"""
    if currency == "XAF":
        return f"{amount_cents} XAF"
    return f"{amount_cents / 100:.2f} {currency}"

# ==================== SUBSCRIPTION PLAN ROUTES ====================

@api_router.get("/subscriptions/plans")
async def get_subscription_plans():
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

@api_router.get("/subscriptions/plans/{plan_id}")
async def get_subscription_plan(plan_id: str):
    """Get a specific subscription plan"""
    plan = await get_plan_by_id(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    return plan

# ==================== STRIPE PAYMENT ROUTES ====================

@api_router.get("/payments/config")
async def get_payment_config():
    """Get Stripe publishable key for frontend"""
    return {
        "publishable_key": STRIPE_PUBLISHABLE_KEY,
        "supported_currencies": ["EUR", "USD", "XAF"],
        "apple_pay_enabled": True,
        "google_pay_enabled": True
    }

@api_router.post("/payments/create-intent")
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
    existing_payment = await db.payments.find_one({"idempotency_key": idempotency_key})
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
        await db.payments.insert_one(payment_dict)
        
        return {
            "client_secret": payment_intent.client_secret,
            "payment_intent_id": payment_intent.id,
            "amount": amount,
            "currency": currency,
            "status": "pending"
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur de paiement: {str(e)}")

@api_router.get("/payments/{payment_id}")
async def get_payment_status(
    payment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get payment status"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    payment = await db.payments.find_one({
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

@api_router.post("/payments/{payment_id}/confirm")
async def confirm_payment(
    payment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Confirm payment and activate subscription (called after successful Stripe payment)"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    payment = await db.payments.find_one({
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
            await db.payments.update_one(
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
            await db.subscriptions.insert_one(subscription.dict())
            
            # Update user subscription
            await db.users.update_one(
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
        logger.error(f"Stripe verification error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur de vérification: {str(e)}")


@api_router.post("/payments/{payment_id}/test-confirm")
async def test_confirm_payment(
    payment_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    TEST ONLY: Simulate a successful payment for testing purposes.
    This endpoint bypasses Stripe verification and directly activates the subscription.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    payment = await db.payments.find_one({
        "stripe_payment_intent_id": payment_id,
        "user_id": current_user.id
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
        await db.payments.update_one(
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
        await db.subscriptions.insert_one(subscription.dict())
        
        # Update user subscription
        await db.users.update_one(
            {"id": current_user.id},
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
        logger.error(f"Test payment error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur: {str(e)}")

@api_router.post("/payments/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    amount: Optional[int] = None,  # Optional partial refund amount in cents
    admin: User = Depends(require_admin)
):
    """Refund a payment (admin only)"""
    payment = await db.payments.find_one({"stripe_payment_intent_id": payment_id})
    
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
        await db.payments.update_one(
            {"stripe_payment_intent_id": payment_id},
            {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
        )
        
        # If full refund, cancel subscription
        if new_status == "refunded":
            await db.users.update_one(
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
        logger.error(f"Stripe refund error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur de remboursement: {str(e)}")

# ==================== STRIPE WEBHOOK ====================

@api_router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    # If webhook secret is configured, verify signature
    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # No webhook secret - parse payload directly (development mode)
        import json
        event = json.loads(payload)
    
    event_type = event.get("type") if isinstance(event, dict) else event.type
    
    # Log event
    logger.info(f"Stripe webhook received: {event_type}")
    
    # Handle specific events
    if event_type == "payment_intent.succeeded":
        data = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event.data.object
        payment_intent_id = data.get("id") if isinstance(data, dict) else data.id
        
        # Update payment status
        payment = await db.payments.find_one({"stripe_payment_intent_id": payment_intent_id})
        if payment and payment["status"] != "succeeded":
            # Get plan details
            plan = await get_plan_by_id(payment["plan_id"])
            if plan:
                end_date = datetime.utcnow() + timedelta(days=plan["duration_days"])
                
                # Update payment
                await db.payments.update_one(
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
                await db.subscriptions.insert_one(subscription.dict())
                
                # Update user
                await db.users.update_one(
                    {"id": payment["user_id"]},
                    {"$set": {
                        "subscription_type": payment["plan_id"],
                        "subscription_end": end_date
                    }}
                )
                
                logger.info(f"Subscription activated for user {payment['user_id']}")
    
    elif event_type == "payment_intent.payment_failed":
        data = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event.data.object
        payment_intent_id = data.get("id") if isinstance(data, dict) else data.id
        
        await db.payments.update_one(
            {"stripe_payment_intent_id": payment_intent_id},
            {"$set": {"status": "failed", "updated_at": datetime.utcnow()}}
        )
        logger.info(f"Payment failed: {payment_intent_id}")
    
    return {"received": True}

# ==================== STRIPE CHECKOUT ENDPOINTS ====================

class CheckoutSessionCreate(BaseModel):
    plan_id: str
    currency: str = "EUR"
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None

@api_router.post("/checkout/create-session")
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
            db=db,
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
        logger.error(f"Stripe error creating checkout session: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur Stripe: {str(e)}")


@api_router.get("/checkout/session/{session_id}")
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


@api_router.post("/checkout/cancel-subscription")
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
        result = await cancel_subscription(db, current_user.id, immediately)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Erreur: {str(e)}")


@api_router.get("/checkout/customer-portal")
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
        portal_url = await get_customer_portal_url(db, current_user.id, return_url)
        return {"portal_url": portal_url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Erreur: {str(e)}")


@api_router.get("/checkout/subscription-status")
async def get_subscription_status(current_user: User = Depends(get_current_user)):
    """
    Get the current user's subscription status.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    # Get subscription from database
    subscription = await db.subscriptions.find_one({
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
@api_router.post("/webhooks/stripe-checkout")
async def stripe_checkout_webhook(request: Request):
    """
    Handle Stripe webhook events for Checkout/Subscriptions.
    Configure this URL in your Stripe Dashboard.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    # Verify signature if webhook secret is configured
    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        import json
        event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)
    
    event_type = event.type
    data_object = event.data.object
    
    logger.info(f"Stripe Checkout webhook received: {event_type}")
    
    try:
        if event_type == "checkout.session.completed":
            await handle_checkout_completed(db, data_object)
        
        elif event_type == "customer.subscription.updated":
            await handle_subscription_updated(db, data_object)
        
        elif event_type == "customer.subscription.deleted":
            await handle_subscription_deleted(db, data_object)
        
        elif event_type == "invoice.paid":
            await handle_invoice_paid(db, data_object)
        
        elif event_type == "invoice.payment_failed":
            await handle_invoice_payment_failed(db, data_object)
        
        else:
            logger.info(f"Unhandled event type: {event_type}")
    
    except Exception as e:
        logger.error(f"Error handling webhook event {event_type}: {str(e)}")
        # Don't raise - return 200 to acknowledge receipt
    
    return {"received": True}


# Initialize Stripe products on startup
@app.on_event("startup")
async def initialize_stripe_products():
    """Initialize Stripe products and prices on startup."""
    try:
        if STRIPE_SECRET_KEY:
            await ensure_stripe_products(db)
            logger.info("Stripe products initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Stripe products: {str(e)}")

# ==================== ADMIN SUBSCRIPTION PLAN MANAGEMENT ====================

@api_router.get("/admin/subscription-plans")
async def admin_get_all_plans(admin: User = Depends(require_admin)):
    """Get all subscription plans including inactive (admin only)"""
    plans = await db.subscription_plans.find().to_list(50)
    return [{
        "id": p["id"],
        "name": p["name"],
        "duration_days": p["duration_days"],
        "prices": p["prices"],
        "features": p.get("features", []),
        "popular": p.get("popular", False),
        "active": p.get("active", True)
    } for p in plans]

@api_router.post("/admin/subscription-plans")
async def admin_create_plan(
    plan_data: SubscriptionPlanCreate,
    admin: User = Depends(require_admin)
):
    """Create a new subscription plan (admin only)"""
    existing = await db.subscription_plans.find_one({"id": plan_data.id})
    if existing:
        raise HTTPException(status_code=400, detail="Un plan avec cet ID existe déjà")
    
    await db.subscription_plans.insert_one(plan_data.dict())
    return plan_data.dict()

@api_router.put("/admin/subscription-plans/{plan_id}")
async def admin_update_plan(
    plan_id: str,
    plan_data: SubscriptionPlanUpdate,
    admin: User = Depends(require_admin)
):
    """Update a subscription plan (admin only)"""
    plan = await db.subscription_plans.find_one({"id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    
    update_dict = {k: v for k, v in plan_data.dict().items() if v is not None}
    
    if update_dict:
        await db.subscription_plans.update_one({"id": plan_id}, {"$set": update_dict})
    
    updated_plan = await db.subscription_plans.find_one({"id": plan_id})
    return {
        "id": updated_plan["id"],
        "name": updated_plan["name"],
        "duration_days": updated_plan["duration_days"],
        "prices": updated_plan["prices"],
        "features": updated_plan.get("features", []),
        "popular": updated_plan.get("popular", False),
        "active": updated_plan.get("active", True)
    }

@api_router.delete("/admin/subscription-plans/{plan_id}")
async def admin_delete_plan(
    plan_id: str,
    admin: User = Depends(require_admin)
):
    """Deactivate a subscription plan (admin only)"""
    result = await db.subscription_plans.update_one(
        {"id": plan_id},
        {"$set": {"active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    return {"success": True}

@api_router.get("/admin/payments")
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
    
    total = await db.payments.count_documents(query)
    payments = await db.payments.find(query).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    
    result = []
    for p in payments:
        user = await db.users.find_one({"id": p["user_id"]})
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
@api_router.post("/subscriptions/subscribe")
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

# ==================== READING HISTORY ====================

@api_router.post("/history")
async def save_reading_progress(
    webtoon_id: str,
    episode_id: str,
    page: int,
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    existing = await db.reading_history.find_one({
        "user_id": current_user.id,
        "webtoon_id": webtoon_id,
        "episode_id": episode_id
    })
    
    if existing:
        await db.reading_history.update_one(
            {"id": existing["id"]},
            {"$set": {"last_page": page, "read_at": datetime.utcnow()}}
        )
    else:
        history = ReadingHistory(
            user_id=current_user.id,
            webtoon_id=webtoon_id,
            episode_id=episode_id,
            last_page=page
        )
        await db.reading_history.insert_one(history.dict())
    
    return {"success": True}

@api_router.get("/history")
async def get_reading_history(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    history = await db.reading_history.find({"user_id": current_user.id}).sort("read_at", -1).to_list(50)
    result = []
    for h in history:
        webtoon = await db.webtoons.find_one({"id": h["webtoon_id"]})
        episode = await db.episodes.find_one({"id": h["episode_id"]})
        if webtoon and episode:
            result.append({
                **h,
                "webtoon_title": webtoon["title"],
                "webtoon_cover": webtoon.get("cover_image"),
                "episode_title": episode["title"],
                "episode_number": episode["number"]
            })
    return result

@api_router.delete("/history")
async def clear_reading_history(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    await db.reading_history.delete_many({"user_id": current_user.id})
    return {"success": True, "message": "Historique effacé"}

# ==================== COMMENTS/REACTIONS ====================

@api_router.get("/comments")
async def get_comments(
    webtoon_id: Optional[str] = None,
    episode_id: Optional[str] = None,
    article_id: Optional[str] = None
):
    """Get comments for a webtoon, episode, or article"""
    query = {}
    if webtoon_id:
        query["webtoon_id"] = webtoon_id
    if episode_id:
        query["episode_id"] = episode_id
    if article_id:
        query["article_id"] = article_id
    
    comments = await db.comments.find(query).sort("created_at", -1).to_list(100)
    
    result = []
    for c in comments:
        user = await db.users.find_one({"id": c["user_id"]})
        result.append({
            "id": c.get("id"),
            "user_id": c.get("user_id"),
            "username": user.get("username") if user else "Utilisateur",
            "content": c.get("content"),
            "likes": len(c.get("likes", [])),
            "liked_by_user": False,  # Will be updated by client
            "created_at": c.get("created_at").isoformat() if c.get("created_at") else None
        })
    
    return result

@api_router.post("/comments")
async def create_comment(
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new comment"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Connectez-vous pour commenter")
    
    comment = Comment(
        user_id=current_user.id,
        webtoon_id=comment_data.webtoon_id,
        episode_id=comment_data.episode_id,
        article_id=comment_data.article_id,
        content=comment_data.content
    )
    
    await db.comments.insert_one(comment.dict())
    
    return {
        "id": comment.id,
        "user_id": comment.user_id,
        "username": current_user.username,
        "content": comment.content,
        "likes": 0,
        "created_at": comment.created_at.isoformat()
    }

@api_router.post("/comments/{comment_id}/like")
async def toggle_like_comment(
    comment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Toggle like on a comment"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Connectez-vous pour aimer")
    
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Commentaire non trouvé")
    
    likes = comment.get("likes", [])
    
    if current_user.id in likes:
        likes.remove(current_user.id)
        action = "unliked"
    else:
        likes.append(current_user.id)
        action = "liked"
    
    await db.comments.update_one({"id": comment_id}, {"$set": {"likes": likes}})
    
    return {"success": True, "action": action, "likes": len(likes)}

@api_router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a comment (only owner or admin)"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Commentaire non trouvé")
    
    if comment["user_id"] != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.comments.delete_one({"id": comment_id})
    return {"success": True}

# ==================== TOOM-MAG (ARTICLES) ====================

@api_router.get("/articles")
async def get_articles(
    category: Optional[str] = None,
    featured: Optional[bool] = None
):
    """Get all articles"""
    query = {}
    if category:
        query["category"] = category
    if featured is not None:
        query["featured"] = featured
    
    articles = await db.articles.find(query).sort("created_at", -1).to_list(50)
    
    return [{
        "id": a.get("id"),
        "title": a.get("title"),
        "subtitle": a.get("subtitle"),
        "content": a.get("content"),
        "cover_image": a.get("cover_image"),
        "category": a.get("category"),
        "author": a.get("author"),
        "featured": a.get("featured", False),
        "views": a.get("views", 0),
        "created_at": a.get("created_at").isoformat() if a.get("created_at") else None
    } for a in articles]

@api_router.get("/articles/{article_id}")
async def get_article(article_id: str):
    """Get a single article"""
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    # Increment views
    await db.articles.update_one({"id": article_id}, {"$inc": {"views": 1}})
    
    return {
        "id": article.get("id"),
        "title": article.get("title"),
        "subtitle": article.get("subtitle"),
        "content": article.get("content"),
        "cover_image": article.get("cover_image"),
        "category": article.get("category"),
        "author": article.get("author"),
        "featured": article.get("featured", False),
        "views": article.get("views", 0) + 1,
        "created_at": article.get("created_at").isoformat() if article.get("created_at") else None
    }

@api_router.post("/admin/articles")
async def create_article(
    article_data: ArticleCreate,
    admin: User = Depends(require_admin)
):
    """Create a new article (admin only)"""
    article = Article(**article_data.dict())
    await db.articles.insert_one(article.dict())
    return article

@api_router.put("/admin/articles/{article_id}")
async def update_article(
    article_id: str,
    article_data: ArticleCreate,
    admin: User = Depends(require_admin)
):
    """Update an article (admin only)"""
    result = await db.articles.update_one(
        {"id": article_id},
        {"$set": article_data.dict()}
    )
    if result.modified_count == 0:
        # Check if article exists
        existing = await db.articles.find_one({"id": article_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Article non trouvé")
    
    article = await db.articles.find_one({"id": article_id})
    # Convert to Article model to avoid ObjectId serialization issues
    return Article(**{k: v for k, v in article.items() if k != '_id'})

@api_router.delete("/admin/articles/{article_id}")
async def delete_article(
    article_id: str,
    admin: User = Depends(require_admin)
):
    """Delete an article (admin only)"""
    result = await db.articles.delete_one({"id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    return {"success": True}

# ==================== IMAGE UPLOAD ====================

class CoverImageUpdate(BaseModel):
    cover_image: str

class EpisodePagesUpdate(BaseModel):
    pages: List[str]

class SinglePageAdd(BaseModel):
    page_image: str

@api_router.put("/admin/webtoons/{webtoon_id}/cover")
async def update_webtoon_cover(
    webtoon_id: str,
    data: CoverImageUpdate,
    admin: User = Depends(require_admin)
):
    """Update webtoon cover image (base64)"""
    result = await db.webtoons.update_one(
        {"id": webtoon_id},
        {"$set": {"cover_image": data.cover_image}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Webtoon non trouvé")
    return {"success": True}

@api_router.put("/admin/episodes/{episode_id}/pages")
async def update_episode_pages(
    episode_id: str,
    data: EpisodePagesUpdate,
    admin: User = Depends(require_admin)
):
    """Update episode pages (list of base64 images)"""
    result = await db.episodes.update_one(
        {"id": episode_id},
        {"$set": {"pages": data.pages}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Episode non trouvé")
    return {"success": True, "page_count": len(data.pages)}

@api_router.post("/admin/episodes/{episode_id}/pages/add")
async def add_episode_page(
    episode_id: str,
    data: SinglePageAdd,
    admin: User = Depends(require_admin)
):
    """Add a single page to episode"""
    episode = await db.episodes.find_one({"id": episode_id})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode non trouvé")
    
    pages = episode.get("pages", [])
    pages.append(data.page_image)
    
    await db.episodes.update_one(
        {"id": episode_id},
        {"$set": {"pages": pages}}
    )
    return {"success": True, "page_count": len(pages)}

# ==================== CALENDAR/SCHEDULE ====================

@api_router.get("/schedule")
async def get_schedule():
    days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
    schedule = {}
    for day in days:
        webtoons = await db.webtoons.find({"diffusion_day": day, "status": "ongoing"}).to_list(10)
        schedule[day] = [Webtoon(**w).dict() for w in webtoons]
    return schedule

# ==================== ADMIN ROUTES ====================

@api_router.post("/admin/login")
async def admin_login(credentials: UserLogin):
    """Special admin login endpoint"""
    # Check for default admin
    if credentials.email == ADMIN_EMAIL and credentials.password == ADMIN_PASSWORD:
        # Create or get admin user
        admin = await db.users.find_one({"email": ADMIN_EMAIL})
        if not admin:
            admin_user = User(
                email=ADMIN_EMAIL,
                username="Admin",
                is_admin=True
            )
            admin_dict = admin_user.dict()
            admin_dict["password_hash"] = hash_password(ADMIN_PASSWORD)
            await db.users.insert_one(admin_dict)
            admin = admin_dict
        
        token = create_token(admin["id"], admin["email"], True)
        return {
            "id": admin["id"],
            "email": admin["email"],
            "username": admin.get("username", "Admin"),
            "is_admin": True,
            "token": token
        }
    
    # Check database for admin user
    user = await db.users.find_one({
        "email": credentials.email,
        "password_hash": hash_password(credentials.password),
        "is_admin": True
    })
    
    if not user:
        raise HTTPException(status_code=401, detail="Identifiants administrateur invalides")
    
    token = create_token(user["id"], user["email"], True)
    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "is_admin": True,
        "token": token
    }

@api_router.get("/admin/stats")
async def get_admin_stats(admin: User = Depends(require_admin)):
    """Get dashboard statistics"""
    total_users = await db.users.count_documents({})
    total_webtoons = await db.webtoons.count_documents({})
    total_episodes = await db.episodes.count_documents({})
    active_subscriptions = await db.subscriptions.count_documents({"status": "active"})
    
    # Get recent activity
    recent_users = await db.users.find().sort("created_at", -1).limit(5).to_list(5)
    recent_subscriptions = await db.subscriptions.find().sort("start_date", -1).limit(5).to_list(5)
    
    # Calculate revenue (mock)
    subscriptions = await db.subscriptions.find({"status": "active"}).to_list(1000)
    total_revenue = sum(s.get("price", 0) for s in subscriptions)
    
    # Views stats
    total_views = 0
    webtoons = await db.webtoons.find().to_list(100)
    for w in webtoons:
        total_views += w.get("views", 0)
    
    # Format recent users (remove _id and convert dates)
    formatted_users = []
    for u in recent_users:
        created_at = u.get("created_at")
        formatted_users.append({
            "id": u.get("id"),
            "username": u.get("username"),
            "email": u.get("email"),
            "created_at": created_at.isoformat() if created_at else None
        })
    
    # Format recent subscriptions (remove _id)
    formatted_subs = []
    for s in recent_subscriptions:
        start_date = s.get("start_date")
        end_date = s.get("end_date")
        formatted_subs.append({
            "id": s.get("id"),
            "user_id": s.get("user_id"),
            "plan": s.get("plan"),
            "price": s.get("price"),
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "status": s.get("status")
        })
    
    return {
        "total_users": total_users,
        "total_webtoons": total_webtoons,
        "total_episodes": total_episodes,
        "active_subscriptions": active_subscriptions,
        "total_revenue": total_revenue,
        "total_views": total_views,
        "recent_users": formatted_users,
        "recent_subscriptions": formatted_subs
    }

@api_router.get("/admin/users")
async def get_all_users(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    admin: User = Depends(require_admin)
):
    """Get all users (admin only)"""
    query = {}
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.users.count_documents(query)
    users = await db.users.find(query).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    
    return {
        "total": total,
        "users": [{
            "id": u["id"],
            "email": u["email"],
            "username": u["username"],
            "is_admin": u.get("is_admin", False),
            "subscription_type": u.get("subscription_type"),
            "subscription_end": u.get("subscription_end"),
            "created_at": u.get("created_at")
        } for u in users]
    }

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: User = Depends(require_admin)):
    """Delete a user (admin only)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if user.get("is_admin"):
        raise HTTPException(status_code=400, detail="Impossible de supprimer un administrateur")
    
    await db.reading_history.delete_many({"user_id": user_id})
    await db.subscriptions.delete_many({"user_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    
    return {"success": True, "message": "Utilisateur supprimé"}

@api_router.put("/admin/users/{user_id}/subscription")
async def update_user_subscription(
    user_id: str,
    plan: str,
    admin: User = Depends(require_admin)
):
    """Update user subscription (admin only)"""
    # Check user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if plan == "none" or plan == "":
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"subscription_type": None, "subscription_end": None}}
        )
    else:
        # Get plan from database
        plan_data = await get_plan_by_id(plan)
        if not plan_data:
            raise HTTPException(status_code=400, detail="Plan invalide")
        
        end_date = datetime.utcnow() + timedelta(days=plan_data["duration_days"])
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"subscription_type": plan, "subscription_end": end_date}}
        )
    
    return {"success": True, "message": "Abonnement mis à jour"}

# ==================== ADMIN WEBTOON MANAGEMENT ====================

@api_router.post("/admin/webtoons", response_model=Webtoon)
async def admin_create_webtoon(
    webtoon_data: WebtoonCreate,
    admin: User = Depends(require_admin)
):
    """Create a new webtoon (admin only)"""
    webtoon = Webtoon(**webtoon_data.dict())
    await db.webtoons.insert_one(webtoon.dict())
    return webtoon

@api_router.put("/admin/webtoons/{webtoon_id}")
async def admin_update_webtoon(
    webtoon_id: str,
    webtoon_data: WebtoonUpdate,
    admin: User = Depends(require_admin)
):
    """Update a webtoon (admin only)"""
    update_dict = {k: v for k, v in webtoon_data.dict().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    result = await db.webtoons.update_one({"id": webtoon_id}, {"$set": update_dict})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Webtoon non trouvé")
    
    webtoon = await db.webtoons.find_one({"id": webtoon_id})
    return Webtoon(**webtoon)

@api_router.delete("/admin/webtoons/{webtoon_id}")
async def admin_delete_webtoon(webtoon_id: str, admin: User = Depends(require_admin)):
    """Delete a webtoon and its episodes (admin only)"""
    webtoon = await db.webtoons.find_one({"id": webtoon_id})
    if not webtoon:
        raise HTTPException(status_code=404, detail="Webtoon non trouvé")
    
    # Delete all episodes
    await db.episodes.delete_many({"webtoon_id": webtoon_id})
    # Delete webtoon
    await db.webtoons.delete_one({"id": webtoon_id})
    
    return {"success": True, "message": "Webtoon et épisodes supprimés"}

# ==================== ADMIN EPISODE MANAGEMENT ====================

@api_router.post("/admin/episodes", response_model=Episode)
async def admin_create_episode(
    episode_data: EpisodeCreate,
    admin: User = Depends(require_admin)
):
    """Create a new episode (admin only)"""
    # Check webtoon exists
    webtoon = await db.webtoons.find_one({"id": episode_data.webtoon_id})
    if not webtoon:
        raise HTTPException(status_code=404, detail="Webtoon non trouvé")
    
    episode = Episode(**episode_data.dict())
    await db.episodes.insert_one(episode.dict())
    
    # Update webtoon total episodes
    await db.webtoons.update_one(
        {"id": episode_data.webtoon_id},
        {"$inc": {"total_episodes": 1}}
    )
    
    return episode

@api_router.put("/admin/episodes/{episode_id}")
async def admin_update_episode(
    episode_id: str,
    episode_data: EpisodeUpdate,
    admin: User = Depends(require_admin)
):
    """Update an episode (admin only)"""
    update_dict = {k: v for k, v in episode_data.dict().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    result = await db.episodes.update_one({"id": episode_id}, {"$set": update_dict})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Episode non trouvé")
    
    episode = await db.episodes.find_one({"id": episode_id})
    return Episode(**episode)

@api_router.delete("/admin/episodes/{episode_id}")
async def admin_delete_episode(episode_id: str, admin: User = Depends(require_admin)):
    """Delete an episode (admin only)"""
    episode = await db.episodes.find_one({"id": episode_id})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode non trouvé")
    
    # Decrement webtoon total episodes
    await db.webtoons.update_one(
        {"id": episode["webtoon_id"]},
        {"$inc": {"total_episodes": -1}}
    )
    
    await db.episodes.delete_one({"id": episode_id})
    
    return {"success": True, "message": "Episode supprimé"}

# ==================== ADMIN SUBSCRIPTIONS ====================

@api_router.get("/admin/subscriptions")
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
    
    total = await db.subscriptions.count_documents(query)
    subscriptions = await db.subscriptions.find(query).skip(skip).limit(limit).sort("start_date", -1).to_list(limit)
    
    result = []
    for sub in subscriptions:
        user = await db.users.find_one({"id": sub["user_id"]})
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

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_database():
    """Seed the database with demo data"""
    
    # Clear existing data
    await db.webtoons.delete_many({})
    await db.episodes.delete_many({})
    
    # Demo webtoons
    demo_webtoons = [
        {
            "title": "Le Royaume de Kush",
            "author": "Amara Diallo",
            "genre": "Action",
            "description": "Une épopée africaine dans l'ancien royaume de Kush. Suivez Makeda dans sa quête pour sauver son peuple.",
            "season": 1,
            "status": "ongoing",
            "diffusion_day": "lundi",
            "views": 15420
        },
        {
            "title": "Lagos Dreams",
            "author": "Chidi Okonkwo",
            "genre": "Romance",
            "description": "Adaeze, une jeune designer de Lagos, navigue entre amour, ambition et traditions familiales.",
            "season": 1,
            "status": "ongoing",
            "diffusion_day": "mardi",
            "views": 12300
        },
        {
            "title": "Les Gardiens du Sahel",
            "author": "Moussa Traoré",
            "genre": "Fantastique",
            "description": "Dans un Sahel mystique, des jeunes héros découvrent leurs pouvoirs ancestraux pour combattre les forces obscures.",
            "season": 2,
            "status": "ongoing",
            "diffusion_day": "mercredi",
            "views": 18750
        },
        {
            "title": "Kinshasa Beat",
            "author": "Fela Mbemba",
            "genre": "Musique",
            "description": "L'histoire de Yves, un jeune musicien de Kinshasa qui rêve de conquérir le monde avec sa rumba moderne.",
            "season": 1,
            "status": "ongoing",
            "diffusion_day": "jeudi",
            "views": 9800
        },
        {
            "title": "L'Oracle de Tombouctou",
            "author": "Fatou Keita",
            "genre": "Mystère",
            "description": "Aminata découvre d'anciens manuscrits qui révèlent des secrets millénaires. Un thriller historique captivant.",
            "season": 1,
            "status": "ongoing",
            "diffusion_day": "vendredi",
            "views": 14200
        },
        {
            "title": "Safari Spatial",
            "author": "Kwame Asante",
            "genre": "Science-Fiction",
            "description": "En 2150, l'Afrique mène l'exploration spatiale. L'équipage du vaisseau Ubuntu explore de nouveaux mondes.",
            "season": 1,
            "status": "ongoing",
            "diffusion_day": "samedi",
            "views": 11500
        },
        {
            "title": "Masques et Merveilles",
            "author": "Ngozi Adichie",
            "genre": "Comédie",
            "description": "Les aventures hilarantes de Kofi, un fabricant de masques traditionnels dans le Ghana moderne.",
            "season": 1,
            "status": "completed",
            "diffusion_day": None,
            "views": 8900
        },
        {
            "title": "Le Secret des Ancêtres",
            "author": "Mamadou Sow",
            "genre": "Horreur",
            "description": "Dans un village sénégalais, d'étranges événements réveillent des légendes oubliées.",
            "season": 1,
            "status": "ongoing",
            "diffusion_day": "dimanche",
            "views": 7600
        }
    ]
    
    created_webtoons = []
    for w_data in demo_webtoons:
        webtoon = Webtoon(**w_data)
        await db.webtoons.insert_one(webtoon.dict())
        created_webtoons.append(webtoon)
    
    # Create episodes for each webtoon
    for webtoon in created_webtoons:
        num_episodes = 8  # 8 episodes per webtoon
        for i in range(1, num_episodes + 1):
            episode = Episode(
                webtoon_id=webtoon.id,
                number=i,
                title=f"Épisode {i}",
                is_free=(i <= 4),  # First 4 episodes are free
                release_date=datetime.utcnow() - timedelta(days=(num_episodes - i) * 3),
                views=int(webtoon.views / num_episodes * (num_episodes - i + 1))
            )
            await db.episodes.insert_one(episode.dict())
        
        # Update total episodes
        await db.webtoons.update_one(
            {"id": webtoon.id},
            {"$set": {"total_episodes": num_episodes}}
        )
    
    # Create demo articles for Toom-Mag
    await db.articles.delete_many({})
    
    demo_articles = [
        {
            "title": "Rencontre avec Amara Diallo",
            "subtitle": "L'auteur de 'Le Royaume de Kush' se confie",
            "content": """Amara Diallo, le créateur du webtoon à succès 'Le Royaume de Kush', nous ouvre les portes de son univers créatif.

**ToomToon**: Comment est née l'idée du Royaume de Kush?

**Amara**: J'ai toujours été fasciné par l'histoire de Nubie et du royaume de Kush. C'est une civilisation extraordinaire qui a rivalisé avec l'Égypte antique, mais qui reste méconnue. Je voulais la faire découvrir à travers une aventure épique.

**ToomToon**: Qu'est-ce qui vous inspire au quotidien?

**Amara**: La richesse de l'histoire africaine est une source inépuisable d'inspiration. Chaque royaume, chaque tradition recèle des histoires incroyables qui n'attendent qu'à être racontées.""",
            "category": "interview",
            "author": "Équipe ToomToon",
            "featured": True,
            "views": 3200
        },
        {
            "title": "Les 10 webtoons africains à suivre en 2025",
            "subtitle": "Notre sélection des séries incontournables",
            "content": """Découvrez notre sélection des meilleurs webtoons africains de cette année!

1. **Le Royaume de Kush** - Une épopée historique captivante
2. **Lagos Dreams** - Romance moderne au Nigeria  
3. **Les Gardiens du Sahel** - Fantastique et pouvoirs ancestraux
4. **Safari Spatial** - Science-fiction africaine
5. **L'Oracle de Tombouctou** - Mystères et manuscrits anciens

Ces séries représentent le meilleur de la créativité africaine dans l'univers du webtoon.""",
            "category": "review",
            "author": "Équipe ToomToon",
            "featured": True,
            "views": 5600
        },
        {
            "title": "Dans les coulisses de ToomToon",
            "subtitle": "Comment sont créés vos webtoons préférés",
            "content": """Plongez dans les coulisses de la création d'un webtoon!

**L'écriture du scénario**
Tout commence par une idée. Nos auteurs développent leurs histoires sur plusieurs mois, créant des personnages attachants et des intrigues captivantes.

**Le dessin**
Chaque planche est dessinée à la main ou numériquement. Un épisode peut nécessiter jusqu'à 60 heures de travail!

**La colorisation**
Les couleurs donnent vie aux dessins. Nos coloristes utilisent des palettes spécialement créées pour chaque série.

**La publication**
Une fois validé, l'épisode est mis en ligne pour votre plus grand plaisir!""",
            "category": "behind_scenes",
            "author": "Équipe ToomToon",
            "featured": False,
            "views": 2100
        },
        {
            "title": "Nouveaux épisodes cette semaine",
            "subtitle": "Ne ratez pas les dernières sorties",
            "content": """Voici les épisodes disponibles cette semaine sur ToomToon:

**Lundi** - Le Royaume de Kush, Épisode 15
**Mardi** - Lagos Dreams, Épisode 12
**Mercredi** - Les Gardiens du Sahel, Épisode 20
**Jeudi** - Kinshasa Beat, Épisode 8
**Vendredi** - L'Oracle de Tombouctou, Épisode 10
**Samedi** - Safari Spatial, Épisode 9
**Dimanche** - Le Secret des Ancêtres, Épisode 7

Bonne lecture!""",
            "category": "news",
            "author": "Équipe ToomToon",
            "featured": False,
            "views": 1800
        },
        {
            "title": "Le webtoon africain: un art en pleine expansion",
            "subtitle": "Analyse d'un phénomène culturel",
            "content": """Le webtoon africain connaît une croissance exceptionnelle ces dernières années.

**Un marché en plein essor**
De plus en plus de lecteurs se tournent vers les webtoons africains, attirés par des histoires authentiques et des représentations culturelles riches.

**Des auteurs talentueux**
L'Afrique regorge de talents artistiques. Nos auteurs combinent techniques modernes et traditions narratives africaines pour créer des œuvres uniques.

**L'avenir du webtoon africain**
Avec des plateformes comme ToomToon, le webtoon africain a un bel avenir devant lui. Nous sommes fiers de contribuer à cette révolution culturelle.""",
            "category": "news",
            "author": "Équipe ToomToon",
            "featured": False,
            "views": 4200
        }
    ]
    
    for a_data in demo_articles:
        article = Article(**a_data)
        await db.articles.insert_one(article.dict())
    
    return {"success": True, "message": "Base de données initialisée avec les données de démonstration"}

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "ToomToon API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Serve admin panel static files under /api/admin (to work with K8s ingress)
# Must be defined BEFORE including the router
if ADMIN_DIR.exists():
    # Serve static assets under /api/admin/assets
    @api_router.get("/admin/assets/{file_path:path}")
    async def serve_admin_assets(file_path: str):
        asset_path = ADMIN_DIR / "assets" / file_path
        if asset_path.exists():
            return FileResponse(asset_path)
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Root admin route
    @api_router.get("/admin")
    async def serve_admin_root():
        return FileResponse(ADMIN_DIR / "index.html")
    
    # Serve admin panel index.html for all /api/admin routes (SPA support)
    @api_router.get("/admin/{full_path:path}")
    async def serve_admin(full_path: str):
        # For any /api/admin route, serve index.html (SPA routing)
        return FileResponse(ADMIN_DIR / "index.html")

# Include the router in the main app
app.include_router(api_router)

# Get allowed origins from environment or use restrictive defaults
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '').split(',')
if not ALLOWED_ORIGINS or ALLOWED_ORIGINS == ['']:
    # In development, allow the preview URL
    ALLOWED_ORIGINS = [
        "https://african-webtoons.preview.emergentagent.com",
        "http://localhost:3000",
        "http://localhost:8001",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
