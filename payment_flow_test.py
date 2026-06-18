#!/usr/bin/env python3
"""
ToomToon Payment Flow Testing
Complete testing of the payment system as requested in the review
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://african-webtoons.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"

class PaymentFlowTester:
    def __init__(self):
        self.test_results = []
        self.user_token = None
        self.payment_intent_id = None
        
    def log_result(self, test_name, success, status_code, response_data, error=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "status_code": status_code,
            "response": response_data,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name} - Status: {status_code}")
        if error:
            print(f"   Error: {error}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        elif success and isinstance(response_data, dict):
            # Show key info for successful tests
            if "publishable_key" in response_data:
                print(f"   Publishable Key: {response_data['publishable_key'][:20]}...")
            elif "client_secret" in response_data:
                print(f"   Client Secret: {response_data['client_secret'][:20]}...")
            elif "plans" in response_data or isinstance(response_data, list):
                count = len(response_data) if isinstance(response_data, list) else len(response_data.get("plans", []))
                print(f"   Found {count} items")
        print()
    
    def test_payment_config(self):
        """Test GET /api/payments/config"""
        print("💳 Testing Payment Config (GET /api/payments/config)...")
        
        try:
            response = requests.get(f"{API_URL}/payments/config")
            
            success = response.status_code == 200
            if success:
                data = response.json()
                # Verify required fields
                required_fields = ["publishable_key", "supported_currencies", "apple_pay_enabled", "google_pay_enabled"]
                has_all_fields = all(field in data for field in required_fields)
                
                # Verify supported currencies
                expected_currencies = ["EUR", "USD", "XAF"]
                has_currencies = all(curr in data.get("supported_currencies", []) for curr in expected_currencies)
                
                success = has_all_fields and has_currencies
                
            self.log_result("Payment Config", success, response.status_code, 
                          response.json() if response.status_code == 200 else response.text)
            
        except Exception as e:
            self.log_result("Payment Config", False, 0, None, str(e))
    
    def test_subscription_plans(self):
        """Test GET /api/subscriptions/plans"""
        print("📋 Testing Subscription Plans (GET /api/subscriptions/plans)...")
        
        try:
            response = requests.get(f"{API_URL}/subscriptions/plans")
            
            success = response.status_code == 200
            if success:
                data = response.json()
                # Verify it's a list and has plans
                success = isinstance(data, list) and len(data) > 0
                
                if success and data:
                    # Verify first plan has required fields
                    plan = data[0]
                    required_fields = ["id", "name", "duration_days", "prices", "features"]
                    has_required_fields = all(field in plan for field in required_fields)
                    
                    # Verify prices has expected currencies
                    prices = plan.get("prices", {})
                    has_currency_prices = all(curr in prices for curr in ["EUR", "USD", "XAF"])
                    
                    success = has_required_fields and has_currency_prices
                
            self.log_result("Subscription Plans", success, response.status_code, 
                          response.json() if response.status_code == 200 else response.text)
            
            return response.json() if success else None
            
        except Exception as e:
            self.log_result("Subscription Plans", False, 0, None, str(e))
            return None
    
    def test_user_registration(self):
        """Test POST /api/auth/register"""
        print("👤 Testing User Registration (POST /api/auth/register)...")
        
        # Use timestamp to ensure unique email
        timestamp = int(datetime.now().timestamp())
        user_data = {
            "email": f"paytest{timestamp}@test.com",
            "password": "test123",
            "username": f"PayTestUser{timestamp}"
        }
        
        try:
            response = requests.post(f"{API_URL}/auth/register", json=user_data)
            
            success = response.status_code == 200
            if success:
                data = response.json()
                self.user_token = data.get("token")
                success = self.user_token is not None
                
            self.log_result("User Registration", success, response.status_code, 
                          response.json() if response.status_code == 200 else response.text)
            
            return success
            
        except Exception as e:
            self.log_result("User Registration", False, 0, None, str(e))
            return False
    
    def test_user_login(self):
        """Test POST /api/auth/login (fallback if registration fails)"""
        print("🔐 Testing User Login (POST /api/auth/login)...")
        
        # Try with existing test credentials
        login_data = {
            "email": "paytest@test.com",
            "password": "test123"
        }
        
        try:
            response = requests.post(f"{API_URL}/auth/login", json=login_data)
            
            success = response.status_code == 200
            if success:
                data = response.json()
                self.user_token = data.get("token")
                success = self.user_token is not None
                
            self.log_result("User Login", success, response.status_code, 
                          response.json() if response.status_code == 200 else response.text)
            
            return success
            
        except Exception as e:
            self.log_result("User Login", False, 0, None, str(e))
            return False
    
    def get_auth_headers(self):
        """Get headers with user token"""
        return {
            "Authorization": f"Bearer {self.user_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_payment_intent(self, plans):
        """Test POST /api/payments/create-intent"""
        print("💰 Testing Create Payment Intent (POST /api/payments/create-intent)...")
        
        if not plans:
            self.log_result("Create Payment Intent", False, 0, "No plans available", "No subscription plans found")
            return
        
        # Use first available plan
        plan_id = plans[0]["id"]
        
        payment_data = {
            "plan_id": plan_id,
            "currency": "EUR"
        }
        
        try:
            response = requests.post(
                f"{API_URL}/payments/create-intent",
                json=payment_data,
                headers=self.get_auth_headers()
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                # Verify required fields
                required_fields = ["client_secret", "payment_intent_id", "amount", "currency", "status"]
                has_all_fields = all(field in data for field in required_fields)
                
                if has_all_fields:
                    self.payment_intent_id = data.get("payment_intent_id")
                    success = self.payment_intent_id is not None
                else:
                    success = False
                
            self.log_result("Create Payment Intent", success, response.status_code, 
                          response.json() if response.status_code == 200 else response.text)
            
            return success
            
        except Exception as e:
            self.log_result("Create Payment Intent", False, 0, None, str(e))
            return False
    
    def test_payment_status(self):
        """Test GET /api/payments/{payment_intent_id}"""
        print("📊 Testing Payment Status (GET /api/payments/{payment_intent_id})...")
        
        if not self.payment_intent_id:
            self.log_result("Payment Status", False, 0, "No payment intent ID", "No payment intent created")
            return
        
        try:
            response = requests.get(
                f"{API_URL}/payments/{self.payment_intent_id}",
                headers=self.get_auth_headers()
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                # Verify status field exists
                has_status = "status" in data
                # Should be "pending" for new payment intent
                is_pending = data.get("status") == "pending"
                success = has_status and is_pending
                
            self.log_result("Payment Status", success, response.status_code, 
                          response.json() if response.status_code == 200 else response.text)
            
        except Exception as e:
            self.log_result("Payment Status", False, 0, None, str(e))
    
    def test_confirm_payment(self):
        """Test POST /api/payments/{payment_intent_id}/confirm"""
        print("✅ Testing Confirm Payment (POST /api/payments/{payment_intent_id}/confirm)...")
        
        if not self.payment_intent_id:
            self.log_result("Confirm Payment", False, 0, "No payment intent ID", "No payment intent created")
            return
        
        try:
            response = requests.post(
                f"{API_URL}/payments/{self.payment_intent_id}/confirm",
                headers=self.get_auth_headers()
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                # Should return success field
                has_success_field = "success" in data
                success = has_success_field
                
            self.log_result("Confirm Payment", success, response.status_code, 
                          response.json() if response.status_code == 200 else response.text)
            
            return success
            
        except Exception as e:
            self.log_result("Confirm Payment", False, 0, None, str(e))
            return False
    
    def test_user_after_payment(self):
        """Test GET /api/auth/me - Check user subscription after payment"""
        print("👤 Testing User After Payment (GET /api/auth/me)...")
        
        try:
            response = requests.get(
                f"{API_URL}/auth/me",
                headers=self.get_auth_headers()
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                # Check if user has subscription info
                has_subscription_type = "subscription_type" in data
                has_subscription_end = "subscription_end" in data
                success = has_subscription_type and has_subscription_end
                
                if success:
                    sub_type = data.get("subscription_type")
                    sub_end = data.get("subscription_end")
                    print(f"   Subscription Type: {sub_type}")
                    print(f"   Subscription End: {sub_end}")
                
            self.log_result("User After Payment", success, response.status_code, 
                          response.json() if response.status_code == 200 else response.text)
            
        except Exception as e:
            self.log_result("User After Payment", False, 0, None, str(e))
    
    def run_payment_flow_tests(self):
        """Run complete payment flow tests"""
        print("🚀 Starting ToomToon Payment Flow Tests")
        print("=" * 60)
        
        # Step 1: Get Payment Config
        self.test_payment_config()
        
        # Step 2: Get Subscription Plans
        plans = self.test_subscription_plans()
        
        # Step 3: User Registration (or login if exists)
        if not self.test_user_registration():
            # If registration fails, try login
            if not self.test_user_login():
                print("❌ Cannot proceed without user authentication")
                return self.test_results
        
        # Step 4: Create Payment Intent
        if self.test_create_payment_intent(plans):
            # Step 5: Check Payment Status
            self.test_payment_status()
            
            # Step 6: Confirm Payment
            if self.test_confirm_payment():
                # Step 7: Check User After Payment
                self.test_user_after_payment()
        
        # Summary
        print("=" * 60)
        print("📊 PAYMENT FLOW TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']} - HTTP {result['status_code']}")
            if result["error"]:
                print(f"   Error: {result['error']}")
            elif not result["success"] and result["response"]:
                print(f"   Response: {result['response']}")
        
        # Report any errors with HTTP codes and response bodies
        print("\n🔍 ERROR DETAILS:")
        errors_found = False
        for result in self.test_results:
            if not result["success"]:
                errors_found = True
                print(f"❌ {result['test']}")
                print(f"   HTTP Code: {result['status_code']}")
                print(f"   Response: {result['response']}")
                if result["error"]:
                    print(f"   Error: {result['error']}")
                print()
        
        if not errors_found:
            print("No errors found! All tests passed successfully.")
        
        return self.test_results

if __name__ == "__main__":
    tester = PaymentFlowTester()
    results = tester.run_payment_flow_tests()
    
    # Exit with error code if any tests failed
    failed_count = sum(1 for r in results if not r["success"])
    sys.exit(failed_count)