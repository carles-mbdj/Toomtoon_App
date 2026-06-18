#!/usr/bin/env python3
"""
Additional edge case tests for ToomToon API
"""

import requests
import json

BASE_URL = "https://african-webtoons.preview.emergentagent.com/api"

def test_edge_cases():
    """Test error cases and edge scenarios"""
    session = requests.Session()
    results = []
    
    print("🔧 Testing Edge Cases...")
    
    # Test invalid login
    print("❌ Testing Invalid Login...")
    response = session.post(f"{BASE_URL}/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "wrongpassword"
    })
    success = response.status_code == 401
    print(f"{'✅' if success else '❌'} Invalid Login: {response.status_code}")
    results.append(("Invalid Login", success, response.status_code))
    
    # Test duplicate registration
    print("🔄 Testing Duplicate Registration...")
    user_data = {
        "email": "duplicate.test@example.com",
        "password": "TestPass123!",
        "username": "DuplicateUser"
    }
    # First registration
    resp1 = session.post(f"{BASE_URL}/auth/register", json=user_data)
    # Second registration (should fail)
    resp2 = session.post(f"{BASE_URL}/auth/register", json=user_data)
    success = resp1.status_code == 200 and resp2.status_code == 400
    print(f"{'✅' if success else '❌'} Duplicate Registration: {resp1.status_code}, {resp2.status_code}")
    results.append(("Duplicate Registration", success, f"{resp1.status_code}, {resp2.status_code}"))
    
    # Test non-existent webtoon
    print("🚫 Testing Non-existent Webtoon...")
    response = session.get(f"{BASE_URL}/webtoons/non-existent-id")
    success = response.status_code == 404
    print(f"{'✅' if success else '❌'} Non-existent Webtoon: {response.status_code}")
    results.append(("Non-existent Webtoon", success, response.status_code))
    
    # Test non-existent episode
    print("🚫 Testing Non-existent Episode...")
    response = session.get(f"{BASE_URL}/episodes/non-existent-id")
    success = response.status_code == 404
    print(f"{'✅' if success else '❌'} Non-existent Episode: {response.status_code}")
    results.append(("Non-existent Episode", success, response.status_code))
    
    # Test unauthorized access to /auth/me
    print("🔒 Testing Unauthorized Access...")
    response = requests.get(f"{BASE_URL}/auth/me")  # No auth header
    success = response.status_code == 401
    print(f"{'✅' if success else '❌'} Unauthorized Access: {response.status_code}")
    results.append(("Unauthorized Access", success, response.status_code))
    
    # Test invalid subscription plan
    print("💳 Testing Invalid Subscription Plan...")
    # First login to get token
    login_resp = session.post(f"{BASE_URL}/auth/login", json={
        "email": "duplicate.test@example.com",
        "password": "TestPass123!"
    })
    if login_resp.status_code == 200:
        token = login_resp.json()['token']
        session.headers.update({'Authorization': f'Bearer {token}'})
        
        response = session.post(f"{BASE_URL}/subscriptions/subscribe", json={"plan": "invalid_plan"})
        success = response.status_code == 400
        print(f"{'✅' if success else '❌'} Invalid Subscription Plan: {response.status_code}")
        results.append(("Invalid Subscription Plan", success, response.status_code))
    else:
        print("❌ Could not test invalid subscription - login failed")
        results.append(("Invalid Subscription Plan", False, "login failed"))
    
    return results

if __name__ == "__main__":
    edge_results = test_edge_cases()
    
    print("\n" + "="*50)
    print("Edge Case Test Summary:")
    for test, success, details in edge_results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test} - {details}")
    
    passed = sum(1 for _, success, _ in edge_results if success)
    total = len(edge_results)
    print(f"\nEdge Cases: {passed}/{total} passed")