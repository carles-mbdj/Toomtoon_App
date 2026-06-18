#!/usr/bin/env python3
"""
Test premium episode access without subscription
"""

import requests
import json

BASE_URL = "https://african-webtoons.preview.emergentagent.com/api"

def test_premium_access_without_subscription():
    """Test accessing premium episodes without subscription"""
    session = requests.Session()
    
    print("🔒 Testing Premium Episode Access Without Subscription...")
    
    # Create a new user without subscription
    new_user_data = {
        "email": "no.subscription@example.com",
        "password": "TestPass123!",
        "username": "NoSubUser"
    }
    
    # Register and login
    reg_resp = session.post(f"{BASE_URL}/auth/register", json=new_user_data)
    if reg_resp.status_code != 200:
        print("❌ Failed to register user for premium test")
        return False
    
    token = reg_resp.json()['token']
    session.headers.update({'Authorization': f'Bearer {token}'})
    
    # Get episodes to find a premium one (episodes 5-8 are premium)
    webtoons_resp = session.get(f"{BASE_URL}/webtoons")
    if webtoons_resp.status_code != 200 or not webtoons_resp.json():
        print("❌ Failed to get webtoons")
        return False
    
    webtoon_id = webtoons_resp.json()[0]['id']
    episodes_resp = session.get(f"{BASE_URL}/webtoons/{webtoon_id}/episodes")
    if episodes_resp.status_code != 200 or not episodes_resp.json():
        print("❌ Failed to get episodes")
        return False
    
    episodes = episodes_resp.json()
    premium_episode = None
    for episode in episodes:
        if not episode['is_free']:  # Find a premium episode
            premium_episode = episode
            break
    
    if not premium_episode:
        print("❌ No premium episodes found")
        return False
    
    # Try to access premium episode without subscription
    response = session.get(f"{BASE_URL}/episodes/{premium_episode['id']}")
    success = response.status_code == 403  # Should be forbidden
    
    print(f"{'✅' if success else '❌'} Premium Episode Access Without Subscription: {response.status_code}")
    if response.status_code == 403:
        print(f"    Expected 403 Forbidden - Got: {response.json()}")
    
    return success

if __name__ == "__main__":
    result = test_premium_access_without_subscription()
    print(f"\nPremium Access Test: {'PASSED' if result else 'FAILED'}")