"""ToomToon API entrypoint: wires together the routers, CORS, the admin
panel static file serving, and app startup/shutdown hooks. All business
logic lives in `routers/*`, `models.py`, `auth_utils.py` and `config.py`.
"""
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.responses import FileResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.cors import CORSMiddleware
import os
from datetime import datetime

import config
from routers import admin, auth, content, payments, webtoons

# Create the main app without a prefix
app = FastAPI(title="ToomToon API")
app.state.limiter = config.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create a router with the /api prefix and mount every feature router onto it
api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(webtoons.router)
api_router.include_router(payments.router)
api_router.include_router(content.router)
api_router.include_router(admin.router)


# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "ToomToon API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# Serve admin panel static files under /api/admin (to work with K8s ingress)
# Must be registered on api_router AFTER the routes above and BEFORE
# app.include_router(api_router): routes are matched in registration
# order, so these catch-alls must not shadow the specific /admin/* API
# routes (login, stats, users, webtoons...) already added via admin.router.
if config.ADMIN_DIR.exists():
    # Serve static assets under /api/admin/assets
    @api_router.get("/admin/assets/{file_path:path}")
    async def serve_admin_assets(file_path: str):
        asset_path = config.ADMIN_DIR / "assets" / file_path
        if asset_path.exists():
            return FileResponse(asset_path)
        raise HTTPException(status_code=404, detail="Asset not found")

    # Root admin route
    @api_router.get("/admin")
    async def serve_admin_root():
        return FileResponse(config.ADMIN_DIR / "index.html")

    # Serve admin panel index.html for all /api/admin routes (SPA support)
    @api_router.get("/admin/{full_path:path}")
    async def serve_admin(full_path: str):
        # For any /api/admin route, serve index.html (SPA routing)
        return FileResponse(config.ADMIN_DIR / "index.html")

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
        "http://localhost:8081",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Cache-Control", "Pragma", "Expires"],
)


@app.on_event("startup")
async def on_startup():
    await payments.initialize_stripe_products()


@app.on_event("shutdown")
async def shutdown_db_client():
    config.client.close()
