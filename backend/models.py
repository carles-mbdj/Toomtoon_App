"""Pydantic models shared across routers."""
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


# ==================== USERS ====================

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
    refresh_token: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    notifications_enabled: Optional[bool] = None
    language: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class PasswordReset(BaseModel):
    token: str
    new_password: str


# ==================== WEBTOONS / EPISODES / GENRES ====================

class Episode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    webtoon_id: str
    number: int
    title: str
    thumbnail: Optional[str] = None
    pages: List[str] = []  # List of image URLs/base64
    # Always reflects the real page count, even on endpoints that strip
    # `pages` to avoid leaking premium content (see webtoons.py).
    page_count: int = 0
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

class Genre(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    webtoon_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GenreCreate(BaseModel):
    name: str

class CoverImageUpdate(BaseModel):
    cover_image: str

class ImageUploadRequest(BaseModel):
    image: str  # base64 data URL, or an already-hosted http(s) URL (no-op)
    folder: str  # one of: covers, thumbnails, pages, articles

class EpisodePagesUpdate(BaseModel):
    pages: List[str]

class SinglePageAdd(BaseModel):
    page_image: str


# ==================== SUBSCRIPTIONS / PAYMENTS ====================

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

class CheckoutSessionCreate(BaseModel):
    plan_id: str
    currency: str = "EUR"
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


# ==================== READING HISTORY / NOTIFICATIONS ====================

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


# ==================== COMMENTS / ARTICLES ====================

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
