#!/usr/bin/env python3
"""
Detailed Payment Flow Investigation
Testing to understand the payment confirmation behavior
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "https://african-webtoons.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"

def detailed_payment_test():
    print("🔍 DETAILED PAYMENT FLOW INVESTIGATION")
    print("=" * 60)
    
    # Step 1: Register user
    timestamp = int(datetime.now().timestamp())
    user_data = {
        "email": f"detailtest{timestamp}@test.com",
        "password": "test123",
        "username": f"DetailTestUser{timestamp}"
    }
    
    print("1. Registering user...")
    response = requests.post(f"{API_URL}/auth/register", json=user_data)
    if response.status_code != 200:
        print(f"❌ Registration failed: {response.status_code} - {response.text}")
        return
    
    user_token = response.json().get("token")
    headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
    print(f"✅ User registered successfully")
    
    # Step 2: Get subscription plans
    print("\n2. Getting subscription plans...")
    response = requests.get(f"{API_URL}/subscriptions/plans")
    if response.status_code != 200:
        print(f"❌ Failed to get plans: {response.status_code} - {response.text}")
        return
    
    plans = response.json()
    plan_id = plans[0]["id"]
    print(f"✅ Found {len(plans)} plans, using: {plan_id}")
    
    # Step 3: Create payment intent
    print("\n3. Creating payment intent...")
    payment_data = {"plan_id": plan_id, "currency": "EUR"}
    response = requests.post(f"{API_URL}/payments/create-intent", json=payment_data, headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to create payment intent: {response.status_code} - {response.text}")
        return
    
    payment_response = response.json()
    payment_intent_id = payment_response.get("payment_intent_id")
    client_secret = payment_response.get("client_secret")
    print(f"✅ Payment intent created: {payment_intent_id}")
    print(f"   Client Secret: {client_secret[:20]}...")
    print(f"   Amount: {payment_response.get('amount')} {payment_response.get('currency')}")
    print(f"   Status: {payment_response.get('status')}")
    
    # Step 4: Check payment status before confirmation
    print("\n4. Checking payment status before confirmation...")
    response = requests.get(f"{API_URL}/payments/{payment_intent_id}", headers=headers)
    if response.status_code == 200:
        status_data = response.json()
        print(f"✅ Payment status: {status_data.get('status')}")
        print(f"   Full response: {json.dumps(status_data, indent=2)}")
    else:
        print(f"❌ Failed to get payment status: {response.status_code} - {response.text}")
    
    # Step 5: Attempt to confirm payment
    print("\n5. Attempting to confirm payment...")
    response = requests.post(f"{API_URL}/payments/{payment_intent_id}/confirm", headers=headers)
    print(f"   HTTP Status: {response.status_code}")
    
    if response.status_code == 200:
        confirm_data = response.json()
        print(f"✅ Confirmation response: {json.dumps(confirm_data, indent=2)}")
    else:
        print(f"❌ Confirmation failed: {response.text}")
        try:
            error_data = response.json()
            print(f"   Error details: {json.dumps(error_data, indent=2)}")
        except:
            pass
    
    # Step 6: Check user subscription status after confirmation
    print("\n6. Checking user subscription after confirmation...")
    response = requests.get(f"{API_URL}/auth/me", headers=headers)
    if response.status_code == 200:
        user_data = response.json()
        print(f"✅ User subscription status:")
        print(f"   Subscription Type: {user_data.get('subscription_type')}")
        print(f"   Subscription End: {user_data.get('subscription_end')}")
        print(f"   Full user data: {json.dumps(user_data, indent=2)}")
    else:
        print(f"❌ Failed to get user data: {response.status_code} - {response.text}")
    
    # Step 7: Check payment status after confirmation
    print("\n7. Checking payment status after confirmation...")
    response = requests.get(f"{API_URL}/payments/{payment_intent_id}", headers=headers)
    if response.status_code == 200:
        final_status = response.json()
        print(f"✅ Final payment status: {json.dumps(final_status, indent=2)}")
    else:
        print(f"❌ Failed to get final payment status: {response.status_code} - {response.text}")

if __name__ == "__main__":
    detailed_payment_test()