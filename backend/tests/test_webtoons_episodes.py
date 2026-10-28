async def create_webtoon(client, admin_headers, **overrides):
    payload = {
        "title": "Le Royaume de Kush",
        "author": "Amara Diallo",
        "genre": "Action",
        "description": "Une epopee africaine.",
        "status": "completed",
    }
    payload.update(overrides)
    response = await client.post("/api/admin/webtoons", json=payload, headers=admin_headers)
    assert response.status_code == 200, response.text
    return response.json()


async def create_episode(client, admin_headers, webtoon_id, **overrides):
    payload = {
        "webtoon_id": webtoon_id,
        "number": 1,
        "title": "Episode 1",
        "pages": ["page1_base64", "page2_base64"],
        "is_free": False,
    }
    payload.update(overrides)
    response = await client.post("/api/admin/episodes", json=payload, headers=admin_headers)
    assert response.status_code == 200, response.text
    return response.json()


async def test_webtoon_crud_requires_admin(client, user_headers):
    payload = {"title": "x", "author": "x", "genre": "x", "description": "x"}
    anonymous = await client.post("/api/admin/webtoons", json=payload)
    assert anonymous.status_code == 401

    as_user = await client.post("/api/admin/webtoons", json=payload, headers=user_headers)
    assert as_user.status_code == 403


async def test_episode_listing_does_not_leak_pages(client, admin_headers):
    """Regression test: GET /webtoons/{id}/episodes used to return the full
    `pages` array (the paid content itself) with no auth or premium check."""
    webtoon = await create_webtoon(client, admin_headers)
    await create_episode(client, admin_headers, webtoon["id"], is_free=False)

    response = await client.get(f"/api/webtoons/{webtoon['id']}/episodes")
    assert response.status_code == 200
    episodes = response.json()
    assert len(episodes) == 1
    assert episodes[0]["pages"] == []
    # page_count must still reflect the real number of pages so admin UIs
    # can show it without the listing leaking the page content itself.
    assert episodes[0]["page_count"] == 2


async def test_recent_episodes_does_not_leak_pages(client, admin_headers):
    webtoon = await create_webtoon(client, admin_headers)
    await create_episode(client, admin_headers, webtoon["id"], number=1, is_free=False)

    response = await client.get("/api/episodes/recent")
    assert response.status_code == 200
    episodes = response.json()
    assert len(episodes) == 1
    assert episodes[0]["pages"] == []
    assert episodes[0]["webtoon_title"] == webtoon["title"]


async def test_premium_episode_requires_auth(client, admin_headers, user_headers):
    webtoon = await create_webtoon(client, admin_headers)
    episode = await create_episode(client, admin_headers, webtoon["id"], is_free=False)

    anonymous = await client.get(f"/api/episodes/{episode['id']}")
    assert anonymous.status_code == 401

    as_user_without_subscription = await client.get(
        f"/api/episodes/{episode['id']}", headers=user_headers
    )
    assert as_user_without_subscription.status_code == 403


async def test_free_episode_accessible_without_auth(client, admin_headers):
    webtoon = await create_webtoon(client, admin_headers)
    episode = await create_episode(client, admin_headers, webtoon["id"], number=1, is_free=True)

    response = await client.get(f"/api/episodes/{episode['id']}")
    assert response.status_code == 200
    assert response.json()["pages"] == ["page1_base64", "page2_base64"]
