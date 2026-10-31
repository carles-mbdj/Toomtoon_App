"""Comments, Toom-Mag articles, and per-user reading history."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

import config
import view_tracking
from auth_utils import get_current_user, require_admin
from models import Article, ArticleCreate, Comment, CommentCreate, ReadingHistory, User

router = APIRouter()


# ==================== READING HISTORY ====================

@router.post("/history")
async def save_reading_progress(
    webtoon_id: str,
    episode_id: str,
    page: int,
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    existing = await config.db.reading_history.find_one({
        "user_id": current_user.id,
        "webtoon_id": webtoon_id,
        "episode_id": episode_id
    })

    if existing:
        await config.db.reading_history.update_one(
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
        await config.db.reading_history.insert_one(history.dict())

    return {"success": True}

@router.get("/history")
async def get_reading_history(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    history = await config.db.reading_history.find({"user_id": current_user.id}).sort("read_at", -1).to_list(50)
    result = []
    for h in history:
        webtoon = await config.db.webtoons.find_one({"id": h["webtoon_id"]})
        episode = await config.db.episodes.find_one({"id": h["episode_id"]})
        if webtoon and episode:
            result.append({
                **h,
                "webtoon_title": webtoon["title"],
                "webtoon_cover": webtoon.get("cover_image"),
                "episode_title": episode["title"],
                "episode_number": episode["number"]
            })
    return result

@router.delete("/history")
async def clear_reading_history(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    await config.db.reading_history.delete_many({"user_id": current_user.id})
    return {"success": True, "message": "Historique effacé"}


# ==================== COMMENTS/REACTIONS ====================

@router.get("/comments")
async def get_comments(
    webtoon_id: Optional[str] = None,
    episode_id: Optional[str] = None,
    article_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get comments for a webtoon, episode, or article"""
    query = {}
    if webtoon_id:
        query["webtoon_id"] = webtoon_id
    if episode_id:
        query["episode_id"] = episode_id
    if article_id:
        query["article_id"] = article_id

    comments = await config.db.comments.find(query).sort("created_at", -1).to_list(100)

    result = []
    for c in comments:
        user = await config.db.users.find_one({"id": c["user_id"]})
        likes = c.get("likes", [])
        dislikes = c.get("dislikes", [])
        result.append({
            "id": c.get("id"),
            "user_id": c.get("user_id"),
            "username": user.get("username") if user else "Utilisateur",
            "content": c.get("content"),
            "likes": len(likes),
            "dislikes": len(dislikes),
            "liked_by_user": bool(current_user and current_user.id in likes),
            "disliked_by_user": bool(current_user and current_user.id in dislikes),
            "created_at": c.get("created_at").isoformat() if c.get("created_at") else None
        })

    return result

@router.post("/comments")
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

    await config.db.comments.insert_one(comment.dict())

    return {
        "id": comment.id,
        "user_id": comment.user_id,
        "username": current_user.username,
        "content": comment.content,
        "likes": 0,
        "dislikes": 0,
        "created_at": comment.created_at.isoformat()
    }

@router.post("/comments/{comment_id}/like")
async def toggle_like_comment(
    comment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Toggle like on a comment. Liking removes any existing dislike from
    the same user - a comment can't be both liked and disliked by one
    person at once."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Connectez-vous pour aimer")

    comment = await config.db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Commentaire non trouvé")

    likes = comment.get("likes", [])
    dislikes = comment.get("dislikes", [])

    if current_user.id in likes:
        likes.remove(current_user.id)
        action = "unliked"
    else:
        likes.append(current_user.id)
        if current_user.id in dislikes:
            dislikes.remove(current_user.id)
        action = "liked"

    await config.db.comments.update_one({"id": comment_id}, {"$set": {"likes": likes, "dislikes": dislikes}})

    return {"success": True, "action": action, "likes": len(likes), "dislikes": len(dislikes)}

@router.post("/comments/{comment_id}/dislike")
async def toggle_dislike_comment(
    comment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Toggle dislike on a comment. Disliking removes any existing like
    from the same user, symmetrically with toggle_like_comment."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Connectez-vous pour réagir")

    comment = await config.db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Commentaire non trouvé")

    likes = comment.get("likes", [])
    dislikes = comment.get("dislikes", [])

    if current_user.id in dislikes:
        dislikes.remove(current_user.id)
        action = "undisliked"
    else:
        dislikes.append(current_user.id)
        if current_user.id in likes:
            likes.remove(current_user.id)
        action = "disliked"

    await config.db.comments.update_one({"id": comment_id}, {"$set": {"likes": likes, "dislikes": dislikes}})

    return {"success": True, "action": action, "likes": len(likes), "dislikes": len(dislikes)}

@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a comment (only owner or admin)"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")

    comment = await config.db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Commentaire non trouvé")

    if comment["user_id"] != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Non autorisé")

    await config.db.comments.delete_one({"id": comment_id})
    return {"success": True}


@router.get("/admin/comments")
async def admin_get_comments(
    skip: int = 0,
    limit: int = 20,
    admin: User = Depends(require_admin)
):
    """Get all comments across the platform (admin only), newest first,
    enriched with the title of the webtoon/episode/article they're on."""
    total = await config.db.comments.count_documents({})
    comments = await config.db.comments.find().sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    result = []
    for c in comments:
        user = await config.db.users.find_one({"id": c.get("user_id")})

        context_type = None
        context_title = None
        if c.get("webtoon_id"):
            webtoon = await config.db.webtoons.find_one({"id": c["webtoon_id"]})
            context_type = "webtoon"
            context_title = webtoon.get("title") if webtoon else None
        elif c.get("episode_id"):
            episode = await config.db.episodes.find_one({"id": c["episode_id"]})
            context_type = "episode"
            context_title = episode.get("title") if episode else None
        elif c.get("article_id"):
            article = await config.db.articles.find_one({"id": c["article_id"]})
            context_type = "article"
            context_title = article.get("title") if article else None

        result.append({
            "id": c.get("id"),
            "user_id": c.get("user_id"),
            "username": user.get("username") if user else "Utilisateur supprimé",
            "user_email": user.get("email") if user else None,
            "content": c.get("content"),
            "likes": len(c.get("likes", [])),
            "dislikes": len(c.get("dislikes", [])),
            "context_type": context_type,
            "context_title": context_title,
            "created_at": c.get("created_at").isoformat() if c.get("created_at") else None,
        })

    return {"total": total, "comments": result}


# ==================== TOOM-MAG (ARTICLES) ====================

@router.get("/articles")
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

    articles = await config.db.articles.find(query).sort("created_at", -1).to_list(50)

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

@router.get("/articles/{article_id}")
async def get_article(article_id: str, current_user: User = Depends(get_current_user)):
    """Get a single article"""
    article = await config.db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article non trouvé")

    # Counts once per logged-in user (re-reading the same article doesn't
    # keep inflating it); anonymous views still increment every time since
    # there's no stable identity to dedupe against.
    await view_tracking.record_view("article", article_id, current_user.id if current_user else None)
    article = await config.db.articles.find_one({"id": article_id})

    return {
        "id": article.get("id"),
        "title": article.get("title"),
        "subtitle": article.get("subtitle"),
        "content": article.get("content"),
        "cover_image": article.get("cover_image"),
        "category": article.get("category"),
        "author": article.get("author"),
        "featured": article.get("featured", False),
        "views": article.get("views", 0),
        "created_at": article.get("created_at").isoformat() if article.get("created_at") else None
    }

@router.post("/admin/articles")
async def create_article(
    article_data: ArticleCreate,
    admin: User = Depends(require_admin)
):
    """Create a new article (admin only)"""
    article = Article(**article_data.dict())
    await config.db.articles.insert_one(article.dict())
    return article

@router.put("/admin/articles/{article_id}")
async def update_article(
    article_id: str,
    article_data: ArticleCreate,
    admin: User = Depends(require_admin)
):
    """Update an article (admin only)"""
    result = await config.db.articles.update_one(
        {"id": article_id},
        {"$set": article_data.dict()}
    )
    if result.modified_count == 0:
        # Check if article exists
        existing = await config.db.articles.find_one({"id": article_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Article non trouvé")

    article = await config.db.articles.find_one({"id": article_id})
    # Convert to Article model to avoid ObjectId serialization issues
    return Article(**{k: v for k, v in article.items() if k != '_id'})

@router.delete("/admin/articles/{article_id}")
async def delete_article(
    article_id: str,
    admin: User = Depends(require_admin)
):
    """Delete an article (admin only)"""
    result = await config.db.articles.delete_one({"id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    return {"success": True}
