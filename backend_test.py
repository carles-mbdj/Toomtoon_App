#!/usr/bin/env python3
"""
Backend API Testing for ToomToon - Critical Endpoints Re-testing
Testing the specific endpoints that had errors previously
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://african-webtoons.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"

# Admin credentials from review request
ADMIN_EMAIL = "admin@toomtoon.com"
ADMIN_PASSWORD = "admin123"

class ToomToonTester:
    def __init__(self):
        self.admin_token = None
        self.test_results = []
        
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
        print()
    
    def admin_login(self):
        """Login as admin to get token"""
        print("🔐 Admin Login...")
        try:
            response = requests.post(f"{API_URL}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("token")
                self.log_result("Admin Login", True, response.status_code, data)
                return True
            else:
                self.log_result("Admin Login", False, response.status_code, response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Login", False, 0, None, str(e))
            return False
    
    def get_headers(self):
        """Get headers with admin token"""
        return {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_article_update(self):
        """Test PUT /api/admin/articles/{id} - Should return Article without ObjectId error"""
        print("📝 Testing Article Update (PUT /api/admin/articles/{id})...")
        
        try:
            # First get an article to update
            response = requests.get(f"{API_URL}/articles")
            if response.status_code != 200:
                self.log_result("Article Update - Get Articles", False, response.status_code, response.text)
                return
            
            articles = response.json()
            if not articles:
                self.log_result("Article Update - No Articles Found", False, 404, "No articles to update")
                return
            
            article_id = articles[0]["id"]
            
            # Update the article
            update_data = {
                "title": "Article Mis à Jour - Test",
                "subtitle": "Sous-titre mis à jour",
                "content": "Contenu mis à jour pour le test",
                "category": "news",
                "author": "ToomToon",
                "featured": False
            }
            
            response = requests.put(
                f"{API_URL}/admin/articles/{article_id}",
                json=update_data,
                headers=self.get_headers()
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                # Check if response contains proper article data without ObjectId issues
                has_required_fields = all(field in data for field in ["id", "title", "content"])
                success = has_required_fields
                
            self.log_result("Article Update", success, response.status_code, 
                          response.json() if success else response.text)
            
        except Exception as e:
            self.log_result("Article Update", False, 0, None, str(e))
    
    def test_user_subscription_update(self):
        """Test PUT /api/admin/users/{id}/subscription - Should work with new plan system"""
        print("👤 Testing User Subscription Update (PUT /api/admin/users/{id}/subscription)...")
        
        try:
            # First get a user to update
            response = requests.get(f"{API_URL}/admin/users", headers=self.get_headers())
            if response.status_code != 200:
                self.log_result("User Subscription Update - Get Users", False, response.status_code, response.text)
                return
            
            users_data = response.json()
            users = users_data.get("users", [])
            if not users:
                self.log_result("User Subscription Update - No Users Found", False, 404, "No users to update")
                return
            
            # Find a non-admin user
            user_id = None
            for user in users:
                if not user.get("is_admin", False):
                    user_id = user["id"]
                    break
            
            if not user_id:
                self.log_result("User Subscription Update - No Non-Admin Users", False, 404, "No non-admin users found")
                return
            
            # Test updating to plan_1_month
            response = requests.put(
                f"{API_URL}/admin/users/{user_id}/subscription?plan=plan_1_month",
                headers=self.get_headers()
            )
            
            success = response.status_code == 200
            self.log_result("User Subscription Update (plan_1_month)", success, response.status_code, 
                          response.json() if success else response.text)
            
            # Test updating to none (remove subscription)
            response = requests.put(
                f"{API_URL}/admin/users/{user_id}/subscription?plan=none",
                headers=self.get_headers()
            )
            
            success = response.status_code == 200
            self.log_result("User Subscription Update (none)", success, response.status_code, 
                          response.json() if success else response.text)
            
        except Exception as e:
            self.log_result("User Subscription Update", False, 0, None, str(e))
    
    def test_episode_crud(self):
        """Test Episodes CRUD with correct 'number' field format"""
        print("🎬 Testing Episodes CRUD (POST /api/admin/episodes)...")
        
        try:
            # First get a webtoon to create episode for
            response = requests.get(f"{API_URL}/webtoons")
            if response.status_code != 200:
                self.log_result("Episode CRUD - Get Webtoons", False, response.status_code, response.text)
                return
            
            webtoons = response.json()
            if not webtoons:
                self.log_result("Episode CRUD - No Webtoons Found", False, 404, "No webtoons found")
                return
            
            webtoon_id = webtoons[0]["id"]
            
            # Create episode with correct format (number field, not episode_number)
            episode_data = {
                "webtoon_id": webtoon_id,
                "number": 999,  # Using 'number' field as specified
                "title": "Episode Test - Numéro Correct",
                "is_free": True
            }
            
            response = requests.post(
                f"{API_URL}/episodes",  # Note: using /episodes not /admin/episodes
                json=episode_data,
                headers=self.get_headers()
            )
            
            success = response.status_code == 200
            episode_id = None
            if success:
                data = response.json()
                episode_id = data.get("id")
                
            self.log_result("Episode Creation (number field)", success, response.status_code, 
                          response.json() if success else response.text)
            
            # Test getting the created episode
            if episode_id:
                response = requests.get(f"{API_URL}/episodes/{episode_id}")
                success = response.status_code == 200
                self.log_result("Episode Retrieval", success, response.status_code, 
                              response.json() if success else response.text)
            
        except Exception as e:
            self.log_result("Episode CRUD", False, 0, None, str(e))
    
    def test_user_deletion(self):
        """Test DELETE /api/admin/users/{id} - Should work without timeout"""
        print("🗑️ Testing User Deletion (DELETE /api/admin/users/{id})...")
        
        try:
            # Create a test user first
            test_user_data = {
                "email": f"testuser_{datetime.now().timestamp()}@test.com",
                "password": "testpass123",
                "username": "TestUser"
            }
            
            response = requests.post(f"{API_URL}/auth/register", json=test_user_data)
            if response.status_code != 200:
                self.log_result("User Deletion - Create Test User", False, response.status_code, response.text)
                return
            
            user_data = response.json()
            user_id = user_data.get("id")
            
            # Delete the test user
            response = requests.delete(
                f"{API_URL}/admin/users/{user_id}",
                headers=self.get_headers()
            )
            
            success = response.status_code == 200
            self.log_result("User Deletion", success, response.status_code, 
                          response.json() if success else response.text)
            
        except Exception as e:
            self.log_result("User Deletion", False, 0, None, str(e))
    
    def test_french_error_messages(self):
        """Test that error messages are in French"""
        print("🇫🇷 Testing French Error Messages...")
        
        # Test 404 error
        try:
            response = requests.get(f"{API_URL}/webtoons/nonexistent-id")
            if response.status_code == 404:
                error_msg = response.json().get("detail", "")
                is_french = "non trouvé" in error_msg.lower()
                self.log_result("French 404 Error", is_french, response.status_code, 
                              f"Message: {error_msg}")
            else:
                self.log_result("French 404 Error", False, response.status_code, "Expected 404")
        except Exception as e:
            self.log_result("French 404 Error", False, 0, None, str(e))
        
        # Test 401 error (unauthorized)
        try:
            response = requests.get(f"{API_URL}/admin/stats")  # Admin endpoint without auth
            if response.status_code == 401:
                error_msg = response.json().get("detail", "")
                is_french = "non authentifié" in error_msg.lower()
                self.log_result("French 401 Error", is_french, response.status_code, 
                              f"Message: {error_msg}")
            else:
                self.log_result("French 401 Error", False, response.status_code, "Expected 401")
        except Exception as e:
            self.log_result("French 401 Error", False, 0, None, str(e))
        
        # Test 403 error (access denied)
        try:
            # Login as regular user first
            regular_user_data = {
                "email": f"regular_{datetime.now().timestamp()}@test.com",
                "password": "testpass123",
                "username": "RegularUser"
            }
            
            reg_response = requests.post(f"{API_URL}/auth/register", json=regular_user_data)
            if reg_response.status_code == 200:
                reg_token = reg_response.json().get("token")
                
                # Try to access admin endpoint with regular user token
                response = requests.get(
                    f"{API_URL}/admin/stats",
                    headers={"Authorization": f"Bearer {reg_token}"}
                )
                
                if response.status_code == 403:
                    error_msg = response.json().get("detail", "")
                    is_french = "accès" in error_msg.lower() and ("refusé" in error_msg.lower() or "requis" in error_msg.lower())
                    self.log_result("French 403 Error", is_french, response.status_code, 
                                  f"Message: {error_msg}")
                else:
                    self.log_result("French 403 Error", False, response.status_code, "Expected 403")
            else:
                self.log_result("French 403 Error", False, reg_response.status_code, "Could not create test user")
                
        except Exception as e:
            self.log_result("French 403 Error", False, 0, None, str(e))
    
    def run_critical_tests(self):
        """Run all critical tests from the review request"""
        print("🚀 Starting Critical Backend Tests for ToomToon")
        print("=" * 60)
        
        # Login first
        if not self.admin_login():
            print("❌ Cannot proceed without admin login")
            return
        
        # Run critical tests
        self.test_article_update()
        self.test_user_subscription_update()
        self.test_episode_crud()
        self.test_user_deletion()
        self.test_french_error_messages()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
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
        
        return self.test_results

if __name__ == "__main__":
    tester = ToomToonTester()
    results = tester.run_critical_tests()
    
    # Exit with error code if any tests failed
    failed_count = sum(1 for r in results if not r["success"])
    sys.exit(failed_count)