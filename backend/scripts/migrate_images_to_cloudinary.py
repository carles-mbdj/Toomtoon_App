"""One-off migration: upload every base64 image still stored inline in
MongoDB (webtoon covers, episode thumbnails/pages, article covers) to
Cloudinary, and replace the field with the resulting URL.

Run once, manually, against the real database:

    cd backend
    python -m scripts.migrate_images_to_cloudinary

Safe to re-run: any field that's already an http(s) URL is left alone
(see image_storage.upload_image), so a partial run can just be repeated.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import config
import image_storage


def is_base64_image(value) -> bool:
    return isinstance(value, str) and value.startswith("data:")


async def migrate_webtoon_covers():
    migrated = 0
    async for webtoon in config.db.webtoons.find({"cover_image": {"$regex": "^data:"}}):
        url = await image_storage.upload_image(webtoon["cover_image"], "covers")
        await config.db.webtoons.update_one({"id": webtoon["id"]}, {"$set": {"cover_image": url}})
        migrated += 1
    print(f"Webtoon covers migrated: {migrated}")


async def migrate_episode_images():
    migrated_thumbnails = 0
    migrated_pages = 0
    async for episode in config.db.episodes.find({}):
        updates = {}

        if is_base64_image(episode.get("thumbnail")):
            updates["thumbnail"] = await image_storage.upload_image(episode["thumbnail"], "thumbnails")
            migrated_thumbnails += 1

        pages = episode.get("pages") or []
        if any(is_base64_image(p) for p in pages):
            new_pages = []
            for page in pages:
                if is_base64_image(page):
                    new_pages.append(await image_storage.upload_image(page, "pages"))
                    migrated_pages += 1
                else:
                    new_pages.append(page)
            updates["pages"] = new_pages

        if updates:
            await config.db.episodes.update_one({"id": episode["id"]}, {"$set": updates})

    print(f"Episode thumbnails migrated: {migrated_thumbnails}")
    print(f"Episode pages migrated: {migrated_pages}")


async def migrate_article_covers():
    migrated = 0
    async for article in config.db.articles.find({"cover_image": {"$regex": "^data:"}}):
        url = await image_storage.upload_image(article["cover_image"], "articles")
        await config.db.articles.update_one({"id": article["id"]}, {"$set": {"cover_image": url}})
        migrated += 1
    print(f"Article covers migrated: {migrated}")


async def main():
    if not image_storage.is_configured():
        print("Cloudinary n'est pas configuré (voir backend/.env) - migration annulée.")
        return

    await migrate_webtoon_covers()
    await migrate_episode_images()
    await migrate_article_covers()


if __name__ == "__main__":
    asyncio.run(main())
