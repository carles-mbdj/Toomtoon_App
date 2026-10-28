"""Cloudinary-backed image storage: replaces the old pattern of storing
raw base64 image data inline in MongoDB documents."""
import asyncio

import cloudinary.uploader

import config

ALLOWED_FOLDERS = {"covers", "thumbnails", "pages", "articles"}


class ImageStorageNotConfigured(Exception):
    pass


def is_configured() -> bool:
    return bool(config.CLOUDINARY_CLOUD_NAME and config.CLOUDINARY_API_KEY and config.CLOUDINARY_API_SECRET)


async def upload_image(data: str, folder: str) -> str:
    """Upload a base64 data URL to Cloudinary and return its HTTPS URL.

    A value that's already an http(s) URL is passed through unchanged, so
    re-saving a record whose image didn't change doesn't re-upload it.
    """
    if data.startswith("http://") or data.startswith("https://"):
        return data

    if not is_configured():
        raise ImageStorageNotConfigured("Cloudinary n'est pas configuré")

    if folder not in ALLOWED_FOLDERS:
        raise ValueError(f"Dossier invalide: {folder}")

    # cloudinary.uploader.upload is a blocking network call; run it off
    # the event loop so one slow upload doesn't stall every other request.
    result = await asyncio.to_thread(
        cloudinary.uploader.upload, data, folder=f"toomtoon/{folder}"
    )
    return result["secure_url"]
