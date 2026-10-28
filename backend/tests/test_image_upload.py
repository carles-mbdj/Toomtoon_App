"""Regression tests for the vague-6 fix replacing base64-in-MongoDB image
storage with Cloudinary-hosted URLs."""
import image_storage


FAKE_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA"


async def test_upload_requires_admin(client, user_headers):
    response = await client.post(
        "/api/admin/upload",
        json={"image": FAKE_DATA_URL, "folder": "covers"},
        headers=user_headers,
    )
    assert response.status_code == 403


async def test_upload_rejects_unknown_folder(client, admin_headers, monkeypatch):
    monkeypatch.setattr(image_storage, "is_configured", lambda: True)

    response = await client.post(
        "/api/admin/upload",
        json={"image": FAKE_DATA_URL, "folder": "not-a-real-folder"},
        headers=admin_headers,
    )
    assert response.status_code == 400


async def test_upload_returns_503_when_not_configured(client, admin_headers, monkeypatch):
    monkeypatch.setattr(image_storage, "is_configured", lambda: False)

    response = await client.post(
        "/api/admin/upload",
        json={"image": FAKE_DATA_URL, "folder": "covers"},
        headers=admin_headers,
    )
    assert response.status_code == 503


async def test_upload_returns_cloudinary_url(client, admin_headers, monkeypatch):
    monkeypatch.setattr(image_storage, "is_configured", lambda: True)
    monkeypatch.setattr(
        image_storage.cloudinary.uploader, "upload",
        lambda data, folder: {"secure_url": "https://res.cloudinary.com/demo/image/upload/v1/toomtoon/covers/x.png"}
    )

    response = await client.post(
        "/api/admin/upload",
        json={"image": FAKE_DATA_URL, "folder": "covers"},
        headers=admin_headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["url"] == "https://res.cloudinary.com/demo/image/upload/v1/toomtoon/covers/x.png"


async def test_upload_passes_through_an_already_hosted_url(client, admin_headers, monkeypatch):
    monkeypatch.setattr(image_storage, "is_configured", lambda: True)

    def fail_if_called(*args, **kwargs):
        raise AssertionError("should not re-upload an already-hosted URL")

    monkeypatch.setattr(image_storage.cloudinary.uploader, "upload", fail_if_called)

    existing_url = "https://res.cloudinary.com/demo/image/upload/v1/toomtoon/covers/already-there.png"
    response = await client.post(
        "/api/admin/upload",
        json={"image": existing_url, "folder": "covers"},
        headers=admin_headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["url"] == existing_url
