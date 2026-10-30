"""Shared configuration: environment, database connection, and secrets.

`db` is a mutable module attribute (not re-exported by value) so that
tests can swap it for an in-memory database via `config.db = mock_db`.
Every router module accesses it as `config.db.<collection>` so that swap
is visible everywhere without needing to patch multiple modules.
"""
import logging
import os
import secrets
from pathlib import Path

import cloudinary
from dotenv import load_dotenv
from fastapi.security import HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from slowapi import Limiter
from slowapi.util import get_remote_address
import stripe

ROOT_DIR = Path(__file__).parent
ADMIN_DIR = ROOT_DIR.parent / 'admin-panel' / 'dist'
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("toomtoon")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'toomtoon_db')]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"

# Admin credentials - must be set via environment variables, no weak default
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')

# RevenueCat (Google Play / Apple App Store subscriptions) - optional:
# unset in dev/CI, where the webhook simply responds 503 instead of
# crashing on startup. RevenueCat authenticates its webhook calls with a
# static bearer token configured in its dashboard, not a signature.
REVENUECAT_WEBHOOK_SECRET = os.environ.get('REVENUECAT_WEBHOOK_SECRET', '')

# Transactional email (SMTP) - optional: unset in dev/CI, where
# email_service.send_email just logs instead of sending.
SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL', '')

# Initialize Stripe
stripe.api_key = STRIPE_SECRET_KEY

# Cloudinary (image storage) - optional: unset in dev/CI, where the
# upload endpoint simply responds 503 instead of crashing on startup.
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')
cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True,
)

security = HTTPBearer(auto_error=False)

pwd_context = CryptContext(schemes=["bcrypt", "hex_sha256"], deprecated=["hex_sha256"])

# Rate limiting (keyed by client IP) for brute-force-prone auth endpoints.
limiter = Limiter(key_func=get_remote_address)
