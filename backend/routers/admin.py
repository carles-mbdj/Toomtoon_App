"""Admin login, dashboard stats, user management, and demo data seeding."""
import hmac
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request

import config
import image_storage
from auth_utils import hash_password, issue_tokens, require_admin, verify_and_migrate_password
from models import Article, Episode, ImageUploadRequest, User, UserLogin, Webtoon
from routers.payments import get_plan_by_id

router = APIRouter()


# ==================== IMAGE UPLOAD ====================

@router.post("/admin/upload")
async def upload_image(body: ImageUploadRequest, admin: User = Depends(require_admin)):
    """Upload an image (base64 data URL) to Cloudinary and return its URL.
    Used by the admin panel instead of storing base64 blobs in MongoDB."""
    try:
        url = await image_storage.upload_image(body.image, body.folder)
    except image_storage.ImageStorageNotConfigured:
        raise HTTPException(status_code=503, detail="Le stockage d'images n'est pas configuré")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"url": url}


# ==================== ADMIN AUTH ====================

@router.post("/admin/login")
@config.limiter.limit("10/minute")
async def admin_login(request: Request, credentials: UserLogin):
    """Special admin login endpoint"""
    # Check for default admin (constant-time comparison to avoid timing attacks)
    if credentials.email == config.ADMIN_EMAIL and hmac.compare_digest(credentials.password, config.ADMIN_PASSWORD):
        # Create or get admin user
        admin = await config.db.users.find_one({"email": config.ADMIN_EMAIL})
        if not admin:
            admin_user = User(
                email=config.ADMIN_EMAIL,
                username="Admin",
                is_admin=True
            )
            admin_dict = admin_user.dict()
            admin_dict["password_hash"] = hash_password(config.ADMIN_PASSWORD)
            await config.db.users.insert_one(admin_dict)
            admin = admin_dict

        token, refresh_token = await issue_tokens(admin["id"], admin["email"], True)
        return {
            "id": admin["id"],
            "email": admin["email"],
            "username": admin.get("username", "Admin"),
            "is_admin": True,
            "token": token,
            "refresh_token": refresh_token
        }

    # Check database for admin user
    user = await config.db.users.find_one({"email": credentials.email, "is_admin": True})
    if not user or not await verify_and_migrate_password(credentials.password, user):
        raise HTTPException(status_code=401, detail="Identifiants administrateur invalides")

    token, refresh_token = await issue_tokens(user["id"], user["email"], True)
    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "is_admin": True,
        "token": token,
        "refresh_token": refresh_token
    }


# ==================== ADMIN STATS ====================

@router.get("/admin/stats")
async def get_admin_stats(admin: User = Depends(require_admin)):
    """Get dashboard statistics"""
    total_users = await config.db.users.count_documents({})
    total_webtoons = await config.db.webtoons.count_documents({})
    total_episodes = await config.db.episodes.count_documents({})
    total_articles = await config.db.articles.count_documents({})
    active_subscriptions = await config.db.subscriptions.count_documents({"status": "active"})
    premium_users = await config.db.users.count_documents({"subscription_type": {"$nin": [None, "free"]}})
    featured_webtoons = await config.db.webtoons.count_documents({"is_featured": True})
    completed_webtoons = await config.db.webtoons.count_documents({"status": "completed"})
    ongoing_webtoons = await config.db.webtoons.count_documents({"status": "ongoing"})

    # Get recent activity
    recent_users = await config.db.users.find().sort("created_at", -1).limit(5).to_list(5)
    recent_subscriptions = await config.db.subscriptions.find().sort("start_date", -1).limit(5).to_list(5)
    recent_webtoons = await config.db.webtoons.find().sort("created_at", -1).limit(5).to_list(5)

    # Calculate revenue (mock)
    subscriptions = await config.db.subscriptions.find({"status": "active"}).to_list(1000)
    total_revenue = sum(s.get("price", 0) for s in subscriptions)

    # Views stats
    total_views = 0
    webtoons = await config.db.webtoons.find().to_list(100)
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
            "subscription_type": u.get("subscription_type"),
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

    # Format recent webtoons (remove _id)
    formatted_webtoons = []
    for w in recent_webtoons:
        formatted_webtoons.append({
            "id": w.get("id"),
            "title": w.get("title"),
            "author": w.get("author"),
            "cover_image": w.get("cover_image"),
            "views": w.get("views", 0)
        })

    return {
        "total_users": total_users,
        "total_webtoons": total_webtoons,
        "total_episodes": total_episodes,
        "total_articles": total_articles,
        "active_subscriptions": active_subscriptions,
        "premium_users": premium_users,
        "featured_webtoons": featured_webtoons,
        "completed_webtoons": completed_webtoons,
        "ongoing_webtoons": ongoing_webtoons,
        "total_revenue": total_revenue,
        "total_views": total_views,
        "recent_users": formatted_users,
        "recent_subscriptions": formatted_subs,
        "recent_webtoons": formatted_webtoons
    }


# ==================== ADMIN USERS ====================

@router.get("/admin/users")
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

    total = await config.db.users.count_documents(query)
    users = await config.db.users.find(query).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)

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

@router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: User = Depends(require_admin)):
    """Delete a user (admin only)"""
    user = await config.db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if user.get("is_admin"):
        raise HTTPException(status_code=400, detail="Impossible de supprimer un administrateur")

    await config.db.reading_history.delete_many({"user_id": user_id})
    await config.db.subscriptions.delete_many({"user_id": user_id})
    await config.db.notifications.delete_many({"user_id": user_id})
    await config.db.users.delete_one({"id": user_id})

    return {"success": True, "message": "Utilisateur supprimé"}

@router.put("/admin/users/{user_id}/subscription")
async def update_user_subscription(
    user_id: str,
    plan: str,
    admin: User = Depends(require_admin)
):
    """Update user subscription (admin only)"""
    # Check user exists
    user = await config.db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if plan == "none" or plan == "":
        await config.db.users.update_one(
            {"id": user_id},
            {"$set": {"subscription_type": None, "subscription_end": None}}
        )
    else:
        # Get plan from database
        plan_data = await get_plan_by_id(plan)
        if not plan_data:
            raise HTTPException(status_code=400, detail="Plan invalide")

        end_date = datetime.utcnow() + timedelta(days=plan_data["duration_days"])
        await config.db.users.update_one(
            {"id": user_id},
            {"$set": {"subscription_type": plan, "subscription_end": end_date}}
        )

    return {"success": True, "message": "Abonnement mis à jour"}


# ==================== SEED DATA ====================

@router.post("/seed")
async def seed_database(admin: User = Depends(require_admin)):
    """Seed the database with demo data"""

    # Clear existing data
    await config.db.webtoons.delete_many({})
    await config.db.episodes.delete_many({})

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
        await config.db.webtoons.insert_one(webtoon.dict())
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
            await config.db.episodes.insert_one(episode.dict())

        # Update total episodes
        await config.db.webtoons.update_one(
            {"id": webtoon.id},
            {"$set": {"total_episodes": num_episodes}}
        )

    # Create demo articles for Toom-Mag
    await config.db.articles.delete_many({})

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
        await config.db.articles.insert_one(article.dict())

    return {"success": True, "message": "Base de données initialisée avec les données de démonstration"}
