"""Regression tests for comment likes/dislikes (mutually exclusive per
user) and the admin comments listing endpoint."""


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


async def test_comment_reflects_current_users_reaction(client, admin_headers, user_headers):
    webtoon = await create_webtoon(client, admin_headers)
    created = await client.post(
        "/api/comments", json={"webtoon_id": webtoon["id"], "content": "Super épisode !"}, headers=user_headers
    )
    assert created.status_code == 200, created.text
    comment_id = created.json()["id"]

    await client.post(f"/api/comments/{comment_id}/like", headers=user_headers)

    listing = await client.get(f"/api/comments?webtoon_id={webtoon['id']}", headers=user_headers)
    assert listing.status_code == 200
    comment = listing.json()[0]
    assert comment["likes"] == 1
    assert comment["liked_by_user"] is True
    assert comment["disliked_by_user"] is False


async def test_like_and_dislike_are_mutually_exclusive(client, admin_headers, user_headers):
    webtoon = await create_webtoon(client, admin_headers)
    created = await client.post(
        "/api/comments", json={"webtoon_id": webtoon["id"], "content": "Bon épisode"}, headers=user_headers
    )
    comment_id = created.json()["id"]

    like_response = await client.post(f"/api/comments/{comment_id}/like", headers=user_headers)
    assert like_response.json() == {"success": True, "action": "liked", "likes": 1, "dislikes": 0}

    # Disliking afterwards must remove the existing like.
    dislike_response = await client.post(f"/api/comments/{comment_id}/dislike", headers=user_headers)
    assert dislike_response.json() == {"success": True, "action": "disliked", "likes": 0, "dislikes": 1}

    # And liking again must remove the dislike.
    relike_response = await client.post(f"/api/comments/{comment_id}/like", headers=user_headers)
    assert relike_response.json() == {"success": True, "action": "liked", "likes": 1, "dislikes": 0}


async def test_admin_comments_requires_admin(client, user_headers):
    response = await client.get("/api/admin/comments", headers=user_headers)
    assert response.status_code == 403


async def test_admin_comments_lists_with_context(client, admin_headers, user_headers):
    webtoon = await create_webtoon(client, admin_headers)
    created = await client.post(
        "/api/comments", json={"webtoon_id": webtoon["id"], "content": "Hâte de la suite"}, headers=user_headers
    )
    comment_id = created.json()["id"]
    await client.post(f"/api/comments/{comment_id}/like", headers=user_headers)

    response = await client.get("/api/admin/comments", headers=admin_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total"] == 1
    comment = body["comments"][0]
    assert comment["content"] == "Hâte de la suite"
    assert comment["context_type"] == "webtoon"
    assert comment["context_title"] == webtoon["title"]
    assert comment["likes"] == 1
    assert comment["username"] == "reader"
