"""Per-user view deduplication, shared by webtoons/episodes/articles.

Without this, simply re-opening the same content as the same logged-in
user incremented `views` on every single request - a reader refreshing
or re-visiting a page a dozen times inflated the counter by a dozen,
even though it was really one person reading once.
"""
from typing import Optional

import config

_COLLECTION_NAME_BY_TYPE = {
    "webtoon": "webtoons",
    "episode": "episodes",
    "article": "articles",
}


async def record_view(content_type: str, content_id: str, user_id: Optional[str]) -> None:
    """Increment `views` on the target document, but at most once per
    authenticated user. Anonymous views (user_id is None) can't be
    deduped - there's no stable identity to dedupe against - so they
    keep incrementing on every request, same as before."""
    collection = getattr(config.db, _COLLECTION_NAME_BY_TYPE[content_type])

    if user_id:
        already_viewed = await config.db.content_views.find_one({
            "content_type": content_type,
            "content_id": content_id,
            "user_id": user_id,
        })
        if already_viewed:
            return
        await config.db.content_views.insert_one({
            "content_type": content_type,
            "content_id": content_id,
            "user_id": user_id,
        })

    await collection.update_one({"id": content_id}, {"$inc": {"views": 1}})
