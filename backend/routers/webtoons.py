"""Webtoons, episodes, genres, and the admin management/image-upload
routes for all three. Public read routes stay unauthenticated by design
(browsing the catalog doesn't require an account); every write route is
gated behind `require_admin`."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

import config
from auth_utils import get_current_user, require_admin
from models import (
    CoverImageUpdate,
    Episode,
    EpisodeCreate,
    EpisodePagesUpdate,
    EpisodeUpdate,
    Genre,
    GenreCreate,
    SinglePageAdd,
    User,
    Webtoon,
    WebtoonCreate,
    WebtoonUpdate,
)

router = APIRouter()


# ==================== WEBTOON ROUTES ====================

@router.get("/webtoons", response_model=List[Webtoon])
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

    webtoons = await config.db.webtoons.find(query).sort("created_at", -1).to_list(100)
    return [Webtoon(**w) for w in webtoons]

@router.get("/webtoons/featured", response_model=List[Webtoon])
async def get_featured_webtoons():
    """Get featured webtoons (is_featured=True) or top ongoing by views"""
    # First try to get webtoons marked as featured
    featured = await config.db.webtoons.find({"is_featured": True, "status": "ongoing"}).sort("views", -1).limit(5).to_list(5)

    # If no featured, fallback to top ongoing by views
    if not featured:
        featured = await config.db.webtoons.find({"status": "ongoing"}).sort("views", -1).limit(5).to_list(5)

    return [Webtoon(**w) for w in featured]

@router.get("/webtoons/{webtoon_id}", response_model=Webtoon)
async def get_webtoon(webtoon_id: str):
    webtoon = await config.db.webtoons.find_one({"id": webtoon_id})
    if not webtoon:
        raise HTTPException(status_code=404, detail="Webtoon non trouvé")
    return Webtoon(**webtoon)

# Note: creating/updating webtoons is only exposed via the authenticated
# /admin/webtoons routes further below (require_admin). Do not re-add an
# unauthenticated POST/PUT here.


# ==================== EPISODE ROUTES ====================

@router.get("/webtoons/{webtoon_id}/episodes", response_model=List[Episode])
async def get_episodes(webtoon_id: str):
    # Pages (full image content) are intentionally omitted here: listing must not
    # leak premium/paywalled page content. Full pages are only served by the
    # per-episode endpoint below, which enforces the subscription/free check.
    episodes = await config.db.episodes.find({"webtoon_id": webtoon_id}).sort("number", 1).to_list(100)
    for e in episodes:
        e["page_count"] = len(e.get("pages", []))
        e.pop("pages", None)
    return [Episode(**e) for e in episodes]

@router.get("/episodes/recent", response_model=List[dict])
async def get_recent_episodes():
    episodes = await config.db.episodes.find().sort("release_date", -1).limit(10).to_list(10)
    result = []
    for ep in episodes:
        webtoon = await config.db.webtoons.find_one({"id": ep["webtoon_id"]})
        if webtoon:
            # Pages (full image content) must not be leaked in a public listing -
            # they are only served by the gated GET /episodes/{id} endpoint.
            ep["page_count"] = len(ep.get("pages", []))
            ep.pop("pages", None)
            result.append({
                **Episode(**ep).dict(),
                "webtoon_title": webtoon["title"],
                "webtoon_cover": webtoon.get("cover_image")
            })
    return result

@router.get("/episodes/{episode_id}")
async def get_episode(
    episode_id: str,
    current_user: User = Depends(get_current_user)
):
    episode = await config.db.episodes.find_one({"id": episode_id})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode non trouvé")

    episode["page_count"] = len(episode.get("pages", []))
    ep = Episode(**episode)

    # Get webtoon to check status
    webtoon = await config.db.webtoons.find_one({"id": ep.webtoon_id})
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
    await config.db.episodes.update_one({"id": episode_id}, {"$inc": {"views": 1}})

    return ep

# Note: creating episodes is only exposed via the authenticated
# /admin/episodes routes further below (require_admin). Do not re-add an
# unauthenticated POST here.


# ==================== GENRE ROUTES ====================

@router.get("/genres")
async def get_genres():
    """Get all genres with webtoon count"""
    # First, get all genres from collection
    genres_from_db = await config.db.genres.find().to_list(100)

    # If no genres in collection, extract from webtoons
    if not genres_from_db:
        genre_names = await config.db.webtoons.distinct("genre")
        for name in genre_names:
            if name:
                count = await config.db.webtoons.count_documents({"genre": name})
                genre = Genre(name=name, webtoon_count=count)
                await config.db.genres.insert_one(genre.dict())
        genres_from_db = await config.db.genres.find().to_list(100)

    # Update webtoon counts
    result = []
    for g in genres_from_db:
        count = await config.db.webtoons.count_documents({"genre": g.get("name")})
        result.append({
            "id": g.get("id"),
            "name": g.get("name"),
            "webtoon_count": count,
            "created_at": g.get("created_at").isoformat() if g.get("created_at") else None
        })

    return result

@router.post("/admin/genres")
async def create_genre(
    genre_data: GenreCreate,
    admin: User = Depends(require_admin)
):
    """Create a new genre (admin only)"""
    # Check if genre exists
    existing = await config.db.genres.find_one({"name": {"$regex": f"^{genre_data.name}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="Ce genre existe déjà")

    genre = Genre(name=genre_data.name)
    await config.db.genres.insert_one(genre.dict())

    return {
        "id": genre.id,
        "name": genre.name,
        "webtoon_count": 0,
        "created_at": genre.created_at.isoformat()
    }

@router.put("/admin/genres/{genre_id}")
async def update_genre(
    genre_id: str,
    genre_data: GenreCreate,
    admin: User = Depends(require_admin)
):
    """Update a genre (admin only)"""
    genre = await config.db.genres.find_one({"id": genre_id})
    if not genre:
        raise HTTPException(status_code=404, detail="Genre non trouvé")

    old_name = genre.get("name")

    # Update genre name
    await config.db.genres.update_one(
        {"id": genre_id},
        {"$set": {"name": genre_data.name}}
    )

    # Update all webtoons with old genre name
    await config.db.webtoons.update_many(
        {"genre": old_name},
        {"$set": {"genre": genre_data.name}}
    )

    count = await config.db.webtoons.count_documents({"genre": genre_data.name})

    return {
        "id": genre_id,
        "name": genre_data.name,
        "webtoon_count": count
    }

@router.delete("/admin/genres/{genre_id}")
async def delete_genre(
    genre_id: str,
    admin: User = Depends(require_admin)
):
    """Delete a genre (admin only)"""
    genre = await config.db.genres.find_one({"id": genre_id})
    if not genre:
        raise HTTPException(status_code=404, detail="Genre non trouvé")

    # Check if webtoons use this genre
    count = await config.db.webtoons.count_documents({"genre": genre.get("name")})
    if count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Impossible de supprimer: {count} webtoon(s) utilisent ce genre"
        )

    await config.db.genres.delete_one({"id": genre_id})
    return {"success": True}


# ==================== ADMIN WEBTOON MANAGEMENT ====================

@router.post("/admin/webtoons", response_model=Webtoon)
async def admin_create_webtoon(
    webtoon_data: WebtoonCreate,
    admin: User = Depends(require_admin)
):
    """Create a new webtoon (admin only)"""
    webtoon = Webtoon(**webtoon_data.dict())
    await config.db.webtoons.insert_one(webtoon.dict())
    return webtoon

@router.put("/admin/webtoons/{webtoon_id}")
async def admin_update_webtoon(
    webtoon_id: str,
    webtoon_data: WebtoonUpdate,
    admin: User = Depends(require_admin)
):
    """Update a webtoon (admin only)"""
    update_dict = {k: v for k, v in webtoon_data.dict().items() if v is not None}

    if not update_dict:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    result = await config.db.webtoons.update_one({"id": webtoon_id}, {"$set": update_dict})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Webtoon non trouvé")

    webtoon = await config.db.webtoons.find_one({"id": webtoon_id})
    return Webtoon(**webtoon)

@router.delete("/admin/webtoons/{webtoon_id}")
async def admin_delete_webtoon(webtoon_id: str, admin: User = Depends(require_admin)):
    """Delete a webtoon and its episodes (admin only)"""
    webtoon = await config.db.webtoons.find_one({"id": webtoon_id})
    if not webtoon:
        raise HTTPException(status_code=404, detail="Webtoon non trouvé")

    # Delete all episodes
    await config.db.episodes.delete_many({"webtoon_id": webtoon_id})
    # Delete webtoon
    await config.db.webtoons.delete_one({"id": webtoon_id})

    return {"success": True, "message": "Webtoon et épisodes supprimés"}


# ==================== ADMIN EPISODE MANAGEMENT ====================

@router.post("/admin/episodes", response_model=Episode)
async def admin_create_episode(
    episode_data: EpisodeCreate,
    admin: User = Depends(require_admin)
):
    """Create a new episode (admin only)"""
    # Check webtoon exists
    webtoon = await config.db.webtoons.find_one({"id": episode_data.webtoon_id})
    if not webtoon:
        raise HTTPException(status_code=404, detail="Webtoon non trouvé")

    episode = Episode(**episode_data.dict(), page_count=len(episode_data.pages))
    # page_count is derived from `pages` at read time (see get_episode(s) above),
    # not persisted, so it can never drift from the real pages array in Mongo.
    episode_doc = episode.dict()
    del episode_doc["page_count"]
    await config.db.episodes.insert_one(episode_doc)

    # Update webtoon total episodes
    await config.db.webtoons.update_one(
        {"id": episode_data.webtoon_id},
        {"$inc": {"total_episodes": 1}}
    )

    return episode

@router.put("/admin/episodes/{episode_id}")
async def admin_update_episode(
    episode_id: str,
    episode_data: EpisodeUpdate,
    admin: User = Depends(require_admin)
):
    """Update an episode (admin only)"""
    update_dict = {k: v for k, v in episode_data.dict().items() if v is not None}

    if not update_dict:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    result = await config.db.episodes.update_one({"id": episode_id}, {"$set": update_dict})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Episode non trouvé")

    episode = await config.db.episodes.find_one({"id": episode_id})
    episode["page_count"] = len(episode.get("pages", []))
    return Episode(**episode)

@router.delete("/admin/episodes/{episode_id}")
async def admin_delete_episode(episode_id: str, admin: User = Depends(require_admin)):
    """Delete an episode (admin only)"""
    episode = await config.db.episodes.find_one({"id": episode_id})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode non trouvé")

    # Decrement webtoon total episodes
    await config.db.webtoons.update_one(
        {"id": episode["webtoon_id"]},
        {"$inc": {"total_episodes": -1}}
    )

    await config.db.episodes.delete_one({"id": episode_id})

    return {"success": True, "message": "Episode supprimé"}


# ==================== IMAGE UPLOAD ====================

@router.put("/admin/webtoons/{webtoon_id}/cover")
async def update_webtoon_cover(
    webtoon_id: str,
    data: CoverImageUpdate,
    admin: User = Depends(require_admin)
):
    """Update webtoon cover image (base64)"""
    result = await config.db.webtoons.update_one(
        {"id": webtoon_id},
        {"$set": {"cover_image": data.cover_image}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Webtoon non trouvé")
    return {"success": True}

@router.put("/admin/episodes/{episode_id}/pages")
async def update_episode_pages(
    episode_id: str,
    data: EpisodePagesUpdate,
    admin: User = Depends(require_admin)
):
    """Update episode pages (list of base64 images)"""
    result = await config.db.episodes.update_one(
        {"id": episode_id},
        {"$set": {"pages": data.pages}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Episode non trouvé")
    return {"success": True, "page_count": len(data.pages)}

@router.post("/admin/episodes/{episode_id}/pages/add")
async def add_episode_page(
    episode_id: str,
    data: SinglePageAdd,
    admin: User = Depends(require_admin)
):
    """Add a single page to episode"""
    episode = await config.db.episodes.find_one({"id": episode_id})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode non trouvé")

    pages = episode.get("pages", [])
    pages.append(data.page_image)

    await config.db.episodes.update_one(
        {"id": episode_id},
        {"$set": {"pages": pages}}
    )
    return {"success": True, "page_count": len(pages)}


# ==================== CALENDAR/SCHEDULE ====================

@router.get("/schedule")
async def get_schedule():
    days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
    schedule = {}
    for day in days:
        webtoons = await config.db.webtoons.find({"diffusion_day": day, "status": "ongoing"}).to_list(10)
        schedule[day] = [Webtoon(**w).dict() for w in webtoons]
    return schedule
