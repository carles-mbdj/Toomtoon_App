#!/usr/bin/env python3
"""
ToomToon Backend Comprehensive Testing
Testing ALL API endpoints as requested in the review:

1. AUTHENTIFICATION (5 endpoints)
2. WEBTOONS CRUD (6 endpoints) 
3. EPISODES CRUD (6 endpoints)
4. GENRES CRUD (4 endpoints)
5. ARTICLES (TOOM-MAG) CRUD (5 endpoints)
6. COMMENTAIRES (3 endpoints)
7. ABONNEMENTS & PAIEMENTS (8 endpoints)
8. UTILISATEURS (ADMIN) (3 endpoints)
9. DASHBOARD (1 endpoint)
10. GESTION DES ERREURS (error handling tests)

Backend URL: https://african-webtoons.preview.emergentagent.com
Admin: admin@toomtoon.com / admin123
User: demo@test.com / password123
"""

import requests
import json
import sys
import base64
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://african-webtoons.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Credentials from review request
ADMIN_EMAIL = "admin@toomtoon.com"
ADMIN_PASSWORD = "admin123"
USER_EMAIL = "demo@test.com"
USER_PASSWORD = "password123"

class ToomToonComprehensiveTester:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.test_results = []
        self.test_webtoon_id = None
        self.test_episode_id = None
        self.test_genre_id = None
        self.test_article_id = None
        self.test_comment_id = None
        self.test_user_id = None
        
    def log_test(self, test_name, success, details="", http_code=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "http_code": http_code
        })
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")
        if http_code:
            print(f"    HTTP Code: {http_code}")
    
    def make_request(self, method, endpoint, data=None, headers=None, files=None):
        """Make HTTP request with error handling"""
        try:
            url = f"{API_BASE}{endpoint}"
            if headers is None:
                headers = {}
            
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=data)
            elif method.upper() == "POST":
                if files:
                    response = requests.post(url, data=data, headers=headers, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except Exception as e:
            print(f"Request error: {str(e)}")
            return None

    # ========== 1. AUTHENTIFICATION ==========
    
    def test_auth_register(self):
        """POST /api/auth/register - Inscription nouvel utilisateur"""
        test_user_data = {
            "email": "testuser@toomtoon.com",
            "password": "testpass123",
            "username": "TestUser"
        }
        
        response = self.make_request("POST", "/auth/register", test_user_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "token" in data:
                self.log_test("Auth Register", True, "Nouvel utilisateur créé avec succès", response.status_code)
                return True
            else:
                self.log_test("Auth Register", False, "Token manquant dans la réponse", response.status_code)
                return False
        elif response and response.status_code == 400:
            # User might already exist
            self.log_test("Auth Register", True, "Utilisateur existe déjà (comportement attendu)", response.status_code)
            return True
        else:
            self.log_test("Auth Register", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_auth_login(self):
        """POST /api/auth/login - Connexion utilisateur"""
        login_data = {
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "token" in data:
                self.user_token = data["token"]
                self.log_test("Auth Login", True, "Connexion utilisateur réussie", response.status_code)
                return True
            else:
                self.log_test("Auth Login", False, "Token manquant dans la réponse", response.status_code)
                return False
        else:
            self.log_test("Auth Login", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_auth_me(self):
        """GET /api/auth/me - Récupérer profil utilisateur"""
        if not self.user_token:
            self.log_test("Auth Me", False, "Token utilisateur manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.user_token}"}
        response = self.make_request("GET", "/auth/me", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if "email" in data:
                self.log_test("Auth Me", True, f"Profil récupéré: {data.get('email')}", response.status_code)
                return True
            else:
                self.log_test("Auth Me", False, "Email manquant dans le profil", response.status_code)
                return False
        else:
            self.log_test("Auth Me", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_auth_forgot_password(self):
        """POST /api/auth/forgot-password - Mot de passe oublié"""
        forgot_data = {
            "email": USER_EMAIL
        }
        
        response = self.make_request("POST", "/auth/forgot-password", forgot_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data:
                self.log_test("Auth Forgot Password", True, "Code de réinitialisation envoyé", response.status_code)
                return True
            else:
                self.log_test("Auth Forgot Password", False, "Message manquant dans la réponse", response.status_code)
                return False
        else:
            self.log_test("Auth Forgot Password", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_login(self):
        """POST /api/admin/login - Connexion admin"""
        admin_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        response = self.make_request("POST", "/auth/login", admin_data)  # Using regular login for admin
        
        if response and response.status_code == 200:
            data = response.json()
            if "token" in data:
                self.admin_token = data["token"]
                self.log_test("Admin Login", True, "Connexion admin réussie", response.status_code)
                return True
            else:
                self.log_test("Admin Login", False, "Token manquant dans la réponse", response.status_code)
                return False
        else:
            self.log_test("Admin Login", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False

    # ========== 2. WEBTOONS CRUD ==========
    
    def test_webtoons_list(self):
        """GET /api/webtoons - Liste tous les webtoons"""
        response = self.make_request("GET", "/webtoons")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                if data:
                    self.test_webtoon_id = data[0].get("id")
                self.log_test("Webtoons List", True, f"Liste de {len(data)} webtoons récupérée", response.status_code)
                return True
            else:
                self.log_test("Webtoons List", False, "Format de réponse invalide", response.status_code)
                return False
        else:
            self.log_test("Webtoons List", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_webtoons_featured(self):
        """GET /api/webtoons/featured - Webtoons en exclusivité"""
        response = self.make_request("GET", "/webtoons/featured")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Webtoons Featured", True, f"Liste de {len(data)} webtoons en exclusivité", response.status_code)
                return True
            else:
                self.log_test("Webtoons Featured", False, "Format de réponse invalide", response.status_code)
                return False
        else:
            self.log_test("Webtoons Featured", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_webtoon_detail(self):
        """GET /api/webtoons/{id} - Détails d'un webtoon"""
        if not self.test_webtoon_id:
            self.log_test("Webtoon Detail", False, "ID de webtoon manquant")
            return False
        
        response = self.make_request("GET", f"/webtoons/{self.test_webtoon_id}")
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "title" in data:
                self.log_test("Webtoon Detail", True, f"Détails du webtoon: {data.get('title')}", response.status_code)
                return True
            else:
                self.log_test("Webtoon Detail", False, "Champs manquants dans les détails", response.status_code)
                return False
        else:
            self.log_test("Webtoon Detail", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_create_webtoon(self):
        """POST /api/admin/webtoons - Créer un webtoon"""
        if not self.admin_token:
            self.log_test("Admin Create Webtoon", False, "Token admin manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        webtoon_data = {
            "title": "Test Webtoon",
            "description": "Description du webtoon de test",
            "author": "Auteur Test",
            "genre": "Action",
            "status": "ongoing",
            "is_featured": False,
            "diffusion_day": "lundi"
        }
        
        response = self.make_request("POST", "/admin/webtoons", webtoon_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data:
                self.test_webtoon_id = data["id"]
                self.log_test("Admin Create Webtoon", True, f"Webtoon créé: {data.get('title')}", response.status_code)
                return True
            else:
                self.log_test("Admin Create Webtoon", False, "ID manquant dans la réponse", response.status_code)
                return False
        else:
            self.log_test("Admin Create Webtoon", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_update_webtoon(self):
        """PUT /api/admin/webtoons/{id} - Modifier un webtoon"""
        if not self.admin_token or not self.test_webtoon_id:
            self.log_test("Admin Update Webtoon", False, "Token admin ou ID webtoon manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        update_data = {
            "title": "Test Webtoon Modifié",
            "description": "Description modifiée",
            "author": "Auteur Test",
            "genre": "Action",
            "status": "ongoing",
            "is_featured": True,
            "diffusion_day": "mardi"
        }
        
        response = self.make_request("PUT", f"/admin/webtoons/{self.test_webtoon_id}", update_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("title") == "Test Webtoon Modifié":
                self.log_test("Admin Update Webtoon", True, "Webtoon modifié avec succès", response.status_code)
                return True
            else:
                self.log_test("Admin Update Webtoon", False, "Modification non appliquée", response.status_code)
                return False
        else:
            self.log_test("Admin Update Webtoon", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_delete_webtoon(self):
        """DELETE /api/admin/webtoons/{id} - Supprimer un webtoon"""
        if not self.admin_token or not self.test_webtoon_id:
            self.log_test("Admin Delete Webtoon", False, "Token admin ou ID webtoon manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.make_request("DELETE", f"/admin/webtoons/{self.test_webtoon_id}", headers=headers)
        
        if response and response.status_code == 200:
            self.log_test("Admin Delete Webtoon", True, "Webtoon supprimé avec succès", response.status_code)
            return True
        else:
            self.log_test("Admin Delete Webtoon", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False

    # ========== 3. EPISODES CRUD ==========
    
    def test_webtoon_episodes(self):
        """GET /api/webtoons/{id}/episodes - Épisodes d'un webtoon"""
        if not self.test_webtoon_id:
            # Use first available webtoon
            webtoons_response = self.make_request("GET", "/webtoons")
            if webtoons_response and webtoons_response.status_code == 200:
                webtoons = webtoons_response.json()
                if webtoons:
                    self.test_webtoon_id = webtoons[0].get("id")
        
        if not self.test_webtoon_id:
            self.log_test("Webtoon Episodes", False, "ID de webtoon manquant")
            return False
        
        response = self.make_request("GET", f"/webtoons/{self.test_webtoon_id}/episodes")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                if data:
                    self.test_episode_id = data[0].get("id")
                self.log_test("Webtoon Episodes", True, f"Liste de {len(data)} épisodes récupérée", response.status_code)
                return True
            else:
                self.log_test("Webtoon Episodes", False, "Format de réponse invalide", response.status_code)
                return False
        else:
            self.log_test("Webtoon Episodes", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_episode_detail(self):
        """GET /api/episodes/{id} - Détails d'un épisode"""
        if not self.test_episode_id:
            self.log_test("Episode Detail", False, "ID d'épisode manquant")
            return False
        
        response = self.make_request("GET", f"/episodes/{self.test_episode_id}")
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "title" in data:
                self.log_test("Episode Detail", True, f"Détails de l'épisode: {data.get('title')}", response.status_code)
                return True
            else:
                self.log_test("Episode Detail", False, "Champs manquants dans les détails", response.status_code)
                return False
        else:
            self.log_test("Episode Detail", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_episodes_recent(self):
        """GET /api/episodes/recent - Épisodes récents"""
        response = self.make_request("GET", "/episodes/recent")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Episodes Recent", True, f"Liste de {len(data)} épisodes récents", response.status_code)
                return True
            else:
                self.log_test("Episodes Recent", False, "Format de réponse invalide", response.status_code)
                return False
        else:
            self.log_test("Episodes Recent", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_create_episode(self):
        """POST /api/admin/episodes - Créer un épisode"""
        if not self.admin_token or not self.test_webtoon_id:
            self.log_test("Admin Create Episode", False, "Token admin ou ID webtoon manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        episode_data = {
            "webtoon_id": self.test_webtoon_id,
            "title": "Épisode Test",
            "episode_number": 999,
            "is_free": True,
            "pages": []
        }
        
        response = self.make_request("POST", "/admin/episodes", episode_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data:
                self.test_episode_id = data["id"]
                self.log_test("Admin Create Episode", True, f"Épisode créé: {data.get('title')}", response.status_code)
                return True
            else:
                self.log_test("Admin Create Episode", False, "ID manquant dans la réponse", response.status_code)
                return False
        else:
            self.log_test("Admin Create Episode", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_update_episode(self):
        """PUT /api/admin/episodes/{id} - Modifier un épisode"""
        if not self.admin_token or not self.test_episode_id:
            self.log_test("Admin Update Episode", False, "Token admin ou ID épisode manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        update_data = {
            "title": "Épisode Test Modifié",
            "episode_number": 999,
            "is_free": False,
            "pages": []
        }
        
        response = self.make_request("PUT", f"/admin/episodes/{self.test_episode_id}", update_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("title") == "Épisode Test Modifié":
                self.log_test("Admin Update Episode", True, "Épisode modifié avec succès", response.status_code)
                return True
            else:
                self.log_test("Admin Update Episode", False, "Modification non appliquée", response.status_code)
                return False
        else:
            self.log_test("Admin Update Episode", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_delete_episode(self):
        """DELETE /api/admin/episodes/{id} - Supprimer un épisode"""
        if not self.admin_token or not self.test_episode_id:
            self.log_test("Admin Delete Episode", False, "Token admin ou ID épisode manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.make_request("DELETE", f"/admin/episodes/{self.test_episode_id}", headers=headers)
        
        if response and response.status_code == 200:
            self.log_test("Admin Delete Episode", True, "Épisode supprimé avec succès", response.status_code)
            return True
        else:
            self.log_test("Admin Delete Episode", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False

    # ========== 4. GENRES CRUD ==========
    
    def test_genres_list(self):
        """GET /api/genres - Liste des genres"""
        response = self.make_request("GET", "/genres")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                if data:
                    self.test_genre_id = data[0].get("id")
                self.log_test("Genres List", True, f"Liste de {len(data)} genres récupérée", response.status_code)
                return True
            else:
                self.log_test("Genres List", False, "Format de réponse invalide", response.status_code)
                return False
        else:
            self.log_test("Genres List", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_create_genre(self):
        """POST /api/admin/genres - Créer un genre"""
        if not self.admin_token:
            self.log_test("Admin Create Genre", False, "Token admin manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        genre_data = {
            "name": "Genre Test"
        }
        
        response = self.make_request("POST", "/admin/genres", genre_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data:
                self.test_genre_id = data["id"]
                self.log_test("Admin Create Genre", True, f"Genre créé: {data.get('name')}", response.status_code)
                return True
            else:
                self.log_test("Admin Create Genre", False, "ID manquant dans la réponse", response.status_code)
                return False
        else:
            self.log_test("Admin Create Genre", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_update_genre(self):
        """PUT /api/admin/genres/{id} - Modifier un genre"""
        if not self.admin_token or not self.test_genre_id:
            self.log_test("Admin Update Genre", False, "Token admin ou ID genre manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        update_data = {
            "name": "Genre Test Modifié"
        }
        
        response = self.make_request("PUT", f"/admin/genres/{self.test_genre_id}", update_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("name") == "Genre Test Modifié":
                self.log_test("Admin Update Genre", True, "Genre modifié avec succès", response.status_code)
                return True
            else:
                self.log_test("Admin Update Genre", False, "Modification non appliquée", response.status_code)
                return False
        else:
            self.log_test("Admin Update Genre", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_delete_genre(self):
        """DELETE /api/admin/genres/{id} - Supprimer un genre"""
        if not self.admin_token or not self.test_genre_id:
            self.log_test("Admin Delete Genre", False, "Token admin ou ID genre manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.make_request("DELETE", f"/admin/genres/{self.test_genre_id}", headers=headers)
        
        if response and response.status_code in [200, 400]:  # 400 if genre has webtoons
            if response.status_code == 200:
                self.log_test("Admin Delete Genre", True, "Genre supprimé avec succès", response.status_code)
            else:
                self.log_test("Admin Delete Genre", True, "Genre protégé (a des webtoons associés)", response.status_code)
            return True
        else:
            self.log_test("Admin Delete Genre", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False

    # ========== 5. ARTICLES (TOOM-MAG) CRUD ==========
    
    def test_articles_list(self):
        """GET /api/articles - Liste des articles"""
        response = self.make_request("GET", "/articles")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                if data:
                    self.test_article_id = data[0].get("id")
                self.log_test("Articles List", True, f"Liste de {len(data)} articles récupérée", response.status_code)
                return True
            else:
                self.log_test("Articles List", False, "Format de réponse invalide", response.status_code)
                return False
        else:
            self.log_test("Articles List", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_article_detail(self):
        """GET /api/articles/{id} - Détails d'un article"""
        if not self.test_article_id:
            self.log_test("Article Detail", False, "ID d'article manquant")
            return False
        
        response = self.make_request("GET", f"/articles/{self.test_article_id}")
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "title" in data:
                self.log_test("Article Detail", True, f"Détails de l'article: {data.get('title')}", response.status_code)
                return True
            else:
                self.log_test("Article Detail", False, "Champs manquants dans les détails", response.status_code)
                return False
        else:
            self.log_test("Article Detail", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_create_article(self):
        """POST /api/admin/articles - Créer un article"""
        if not self.admin_token:
            self.log_test("Admin Create Article", False, "Token admin manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        article_data = {
            "title": "Article Test",
            "content": "Contenu de l'article de test",
            "author": "Auteur Test",
            "category": "news",
            "featured": False
        }
        
        response = self.make_request("POST", "/admin/articles", article_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data:
                self.test_article_id = data["id"]
                self.log_test("Admin Create Article", True, f"Article créé: {data.get('title')}", response.status_code)
                return True
            else:
                self.log_test("Admin Create Article", False, "ID manquant dans la réponse", response.status_code)
                return False
        else:
            self.log_test("Admin Create Article", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_update_article(self):
        """PUT /api/admin/articles/{id} - Modifier un article"""
        if not self.admin_token or not self.test_article_id:
            self.log_test("Admin Update Article", False, "Token admin ou ID article manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        update_data = {
            "title": "Article Test Modifié",
            "content": "Contenu modifié",
            "author": "Auteur Test",
            "category": "interview",
            "featured": True
        }
        
        response = self.make_request("PUT", f"/admin/articles/{self.test_article_id}", update_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("title") == "Article Test Modifié":
                self.log_test("Admin Update Article", True, "Article modifié avec succès", response.status_code)
                return True
            else:
                self.log_test("Admin Update Article", False, "Modification non appliquée", response.status_code)
                return False
        elif response and response.status_code == 422:
            self.log_test("Admin Update Article", False, "Erreur 422: Tous les champs requis (problème connu)", response.status_code)
            return False
        else:
            self.log_test("Admin Update Article", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_delete_article(self):
        """DELETE /api/admin/articles/{id} - Supprimer un article"""
        if not self.admin_token or not self.test_article_id:
            self.log_test("Admin Delete Article", False, "Token admin ou ID article manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.make_request("DELETE", f"/admin/articles/{self.test_article_id}", headers=headers)
        
        if response and response.status_code == 200:
            self.log_test("Admin Delete Article", True, "Article supprimé avec succès", response.status_code)
            return True
        else:
            self.log_test("Admin Delete Article", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False

    # ========== 6. COMMENTAIRES ==========
    
    def test_comments_get(self):
        """GET /api/comments?webtoon_id={id} - Commentaires d'un webtoon"""
        if not self.test_webtoon_id:
            # Get first webtoon
            webtoons_response = self.make_request("GET", "/webtoons")
            if webtoons_response and webtoons_response.status_code == 200:
                webtoons = webtoons_response.json()
                if webtoons:
                    self.test_webtoon_id = webtoons[0].get("id")
        
        if not self.test_webtoon_id:
            self.log_test("Comments Get", False, "ID de webtoon manquant")
            return False
        
        response = self.make_request("GET", "/comments", {"webtoon_id": self.test_webtoon_id})
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Comments Get", True, f"Liste de {len(data)} commentaires récupérée", response.status_code)
                return True
            else:
                self.log_test("Comments Get", False, "Format de réponse invalide", response.status_code)
                return False
        else:
            self.log_test("Comments Get", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_comments_create(self):
        """POST /api/comments - Créer un commentaire"""
        if not self.user_token or not self.test_webtoon_id:
            self.log_test("Comments Create", False, "Token utilisateur ou ID webtoon manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.user_token}"}
        comment_data = {
            "content": "Commentaire de test",
            "webtoon_id": self.test_webtoon_id
        }
        
        response = self.make_request("POST", "/comments", comment_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data:
                self.test_comment_id = data["id"]
                self.log_test("Comments Create", True, "Commentaire créé avec succès", response.status_code)
                return True
            else:
                self.log_test("Comments Create", False, "ID manquant dans la réponse", response.status_code)
                return False
        else:
            self.log_test("Comments Create", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_comments_delete(self):
        """DELETE /api/comments/{id} - Supprimer un commentaire"""
        if not self.admin_token or not self.test_comment_id:
            self.log_test("Comments Delete", False, "Token admin ou ID commentaire manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.make_request("DELETE", f"/comments/{self.test_comment_id}", headers=headers)
        
        if response and response.status_code == 200:
            self.log_test("Comments Delete", True, "Commentaire supprimé avec succès", response.status_code)
            return True
        else:
            self.log_test("Comments Delete", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False

    # ========== 7. ABONNEMENTS & PAIEMENTS ==========
    
    def test_subscription_plans(self):
        """GET /api/subscriptions/plans - Liste des plans"""
        response = self.make_request("GET", "/subscriptions/plans")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Subscription Plans", True, f"Liste de {len(data)} plans d'abonnement", response.status_code)
                return True
            else:
                self.log_test("Subscription Plans", False, "Format de réponse invalide", response.status_code)
                return False
        else:
            self.log_test("Subscription Plans", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_payments_config(self):
        """GET /api/payments/config - Config Stripe"""
        response = self.make_request("GET", "/payments/config")
        
        if response and response.status_code == 200:
            data = response.json()
            if "publishable_key" in data:
                self.log_test("Payments Config", True, "Configuration Stripe récupérée", response.status_code)
                return True
            else:
                self.log_test("Payments Config", False, "Clé publique manquante", response.status_code)
                return False
        else:
            self.log_test("Payments Config", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_payments_create_intent(self):
        """POST /api/payments/create-intent - Créer un paiement"""
        if not self.user_token:
            self.log_test("Payments Create Intent", False, "Token utilisateur manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.user_token}"}
        payment_data = {
            "plan_id": "plan_1_month",
            "currency": "EUR"
        }
        
        response = self.make_request("POST", "/payments/create-intent", payment_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if "client_secret" in data:
                self.log_test("Payments Create Intent", True, "Intention de paiement créée", response.status_code)
                return True
            else:
                self.log_test("Payments Create Intent", False, "Client secret manquant", response.status_code)
                return False
        else:
            self.log_test("Payments Create Intent", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_subscription_plans(self):
        """GET /api/admin/subscription-plans - Plans admin"""
        if not self.admin_token:
            self.log_test("Admin Subscription Plans", False, "Token admin manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.make_request("GET", "/admin/subscription-plans", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Admin Subscription Plans", True, f"Plans admin: {len(data)} plans", response.status_code)
                return True
            else:
                self.log_test("Admin Subscription Plans", False, "Format de réponse invalide", response.status_code)
                return False
        else:
            self.log_test("Admin Subscription Plans", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_payments(self):
        """GET /api/admin/payments - Historique paiements"""
        if not self.admin_token:
            self.log_test("Admin Payments", False, "Token admin manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.make_request("GET", "/admin/payments", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if "total" in data and "payments" in data:
                self.log_test("Admin Payments", True, f"Historique: {data.get('total')} paiements", response.status_code)
                return True
            else:
                self.log_test("Admin Payments", False, "Structure de réponse invalide", response.status_code)
                return False
        else:
            self.log_test("Admin Payments", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False

    # ========== 8. UTILISATEURS (ADMIN) ==========
    
    def test_admin_users(self):
        """GET /api/admin/users - Liste utilisateurs"""
        if not self.admin_token:
            self.log_test("Admin Users", False, "Token admin manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.make_request("GET", "/admin/users", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                if data and isinstance(data[0], dict):
                    self.test_user_id = data[0].get("id")
                self.log_test("Admin Users", True, f"Liste de {len(data)} utilisateurs", response.status_code)
                return True
            elif isinstance(data, dict) and "users" in data:
                users = data.get("users", [])
                if users and isinstance(users[0], dict):
                    self.test_user_id = users[0].get("id")
                self.log_test("Admin Users", True, f"Liste de {len(users)} utilisateurs", response.status_code)
                return True
            else:
                self.log_test("Admin Users", False, f"Format de réponse invalide: {type(data)}", response.status_code)
                return False
        else:
            self.log_test("Admin Users", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_user_subscription(self):
        """PUT /api/admin/users/{id}/subscription - Modifier abonnement"""
        if not self.admin_token or not self.test_user_id:
            self.log_test("Admin User Subscription", False, "Token admin ou ID utilisateur manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        subscription_data = {
            "plan_id": "plan_1_month",
            "active": True
        }
        
        response = self.make_request("PUT", f"/admin/users/{self.test_user_id}/subscription", subscription_data, headers)
        
        if response and response.status_code == 200:
            self.log_test("Admin User Subscription", True, "Abonnement utilisateur modifié", response.status_code)
            return True
        else:
            self.log_test("Admin User Subscription", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False
    
    def test_admin_delete_user(self):
        """DELETE /api/admin/users/{id} - Supprimer utilisateur"""
        if not self.admin_token:
            self.log_test("Admin Delete User", False, "Token admin manquant")
            return False
        
        # Create a test user to delete
        test_user_data = {
            "email": "delete_test@toomtoon.com",
            "password": "testpass123",
            "username": "DeleteTestUser"
        }
        
        create_response = self.make_request("POST", "/auth/register", test_user_data)
        if not create_response or create_response.status_code != 200:
            self.log_test("Admin Delete User", False, "Impossible de créer un utilisateur de test")
            return False
        
        # Get user ID from admin users list
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        users_response = self.make_request("GET", "/admin/users", headers=headers)
        
        if not users_response or users_response.status_code != 200:
            self.log_test("Admin Delete User", False, "Impossible de récupérer la liste des utilisateurs")
            return False
        
        users_data = users_response.json()
        users = []
        
        # Handle different response formats
        if isinstance(users_data, list):
            users = users_data
        elif isinstance(users_data, dict) and "users" in users_data:
            users = users_data.get("users", [])
        
        delete_user_id = None
        for user in users:
            if isinstance(user, dict) and user.get("email") == "delete_test@toomtoon.com":
                delete_user_id = user.get("id")
                break
        
        if not delete_user_id:
            self.log_test("Admin Delete User", False, "Utilisateur de test non trouvé")
            return False
        
        # Delete the user
        response = self.make_request("DELETE", f"/admin/users/{delete_user_id}", headers=headers)
        
        if response and response.status_code == 200:
            self.log_test("Admin Delete User", True, "Utilisateur supprimé avec succès", response.status_code)
            return True
        else:
            self.log_test("Admin Delete User", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False

    # ========== 9. DASHBOARD ==========
    
    def test_admin_stats(self):
        """GET /api/admin/stats - Statistiques"""
        if not self.admin_token:
            self.log_test("Admin Stats", False, "Token admin manquant")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.make_request("GET", "/admin/stats", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, dict):
                self.log_test("Admin Stats", True, f"Statistiques récupérées: {len(data)} métriques", response.status_code)
                return True
            else:
                self.log_test("Admin Stats", False, "Format de réponse invalide", response.status_code)
                return False
        else:
            self.log_test("Admin Stats", False, f"Erreur: {response.text if response else 'No response'}", response.status_code if response else None)
            return False

    # ========== 10. GESTION DES ERREURS ==========
    
    def test_error_handling(self):
        """Test des cas d'erreur (404, 401, 403, 400)"""
        error_tests = []
        
        # Test 404 - Ressource non trouvée
        response = self.make_request("GET", "/webtoons/nonexistent-id")
        if response and response.status_code == 404:
            error_tests.append(("404 Not Found", True))
        else:
            error_tests.append(("404 Not Found", False))
        
        # Test 401 - Non authentifié
        response = self.make_request("GET", "/auth/me")
        if response and response.status_code == 401:
            error_tests.append(("401 Unauthorized", True))
        else:
            error_tests.append(("401 Unauthorized", False))
        
        # Test 403 - Accès interdit (admin endpoint sans token admin)
        headers = {"Authorization": f"Bearer {self.user_token}"} if self.user_token else {}
        response = self.make_request("GET", "/admin/users", headers=headers)
        if response and response.status_code in [401, 403]:
            error_tests.append(("403 Forbidden", True))
        else:
            error_tests.append(("403 Forbidden", False))
        
        # Test 400 - Données invalides
        response = self.make_request("POST", "/auth/login", {"email": "invalid"})
        if response and response.status_code == 400:
            error_tests.append(("400 Bad Request", True))
        else:
            error_tests.append(("400 Bad Request", False))
        
        # Log results
        passed_errors = sum(1 for _, success in error_tests if success)
        total_errors = len(error_tests)
        
        for test_name, success in error_tests:
            self.log_test(f"Error Handling - {test_name}", success)
        
        overall_success = passed_errors == total_errors
        self.log_test("Error Handling Overall", overall_success, f"{passed_errors}/{total_errors} error cases handled correctly")
        
        return overall_success

    def run_all_tests(self):
        """Exécuter tous les tests"""
        print("=" * 80)
        print("TOOMTOON - TESTS COMPLETS ET EXHAUSTIFS DE L'API")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Admin: {ADMIN_EMAIL}")
        print(f"User: {USER_EMAIL}")
        print("=" * 80)
        
        # Setup authentication
        print("\n🔐 SETUP - AUTHENTIFICATION")
        print("-" * 40)
        self.test_admin_login()
        self.test_auth_login()
        
        # 1. AUTHENTIFICATION
        print("\n1️⃣ AUTHENTIFICATION")
        print("-" * 40)
        self.test_auth_register()
        self.test_auth_me()
        self.test_auth_forgot_password()
        
        # 2. WEBTOONS CRUD
        print("\n2️⃣ WEBTOONS CRUD")
        print("-" * 40)
        self.test_webtoons_list()
        self.test_webtoons_featured()
        self.test_webtoon_detail()
        self.test_admin_create_webtoon()
        self.test_admin_update_webtoon()
        self.test_admin_delete_webtoon()
        
        # 3. EPISODES CRUD
        print("\n3️⃣ EPISODES CRUD")
        print("-" * 40)
        self.test_webtoon_episodes()
        self.test_episode_detail()
        self.test_episodes_recent()
        self.test_admin_create_episode()
        self.test_admin_update_episode()
        self.test_admin_delete_episode()
        
        # 4. GENRES CRUD
        print("\n4️⃣ GENRES CRUD")
        print("-" * 40)
        self.test_genres_list()
        self.test_admin_create_genre()
        self.test_admin_update_genre()
        self.test_admin_delete_genre()
        
        # 5. ARTICLES (TOOM-MAG) CRUD
        print("\n5️⃣ ARTICLES (TOOM-MAG) CRUD")
        print("-" * 40)
        self.test_articles_list()
        self.test_article_detail()
        self.test_admin_create_article()
        self.test_admin_update_article()
        self.test_admin_delete_article()
        
        # 6. COMMENTAIRES
        print("\n6️⃣ COMMENTAIRES")
        print("-" * 40)
        self.test_comments_get()
        self.test_comments_create()
        self.test_comments_delete()
        
        # 7. ABONNEMENTS & PAIEMENTS
        print("\n7️⃣ ABONNEMENTS & PAIEMENTS")
        print("-" * 40)
        self.test_subscription_plans()
        self.test_payments_config()
        self.test_payments_create_intent()
        self.test_admin_subscription_plans()
        self.test_admin_payments()
        
        # 8. UTILISATEURS (ADMIN)
        print("\n8️⃣ UTILISATEURS (ADMIN)")
        print("-" * 40)
        self.test_admin_users()
        self.test_admin_user_subscription()
        self.test_admin_delete_user()
        
        # 9. DASHBOARD
        print("\n9️⃣ DASHBOARD")
        print("-" * 40)
        self.test_admin_stats()
        
        # 10. GESTION DES ERREURS
        print("\n🔟 GESTION DES ERREURS")
        print("-" * 40)
        self.test_error_handling()
        
        # RÉSUMÉ FINAL
        print("\n" + "=" * 80)
        print("RÉSUMÉ FINAL DES TESTS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        # Group results by category
        categories = {
            "AUTHENTIFICATION": [],
            "WEBTOONS CRUD": [],
            "EPISODES CRUD": [],
            "GENRES CRUD": [],
            "ARTICLES CRUD": [],
            "COMMENTAIRES": [],
            "ABONNEMENTS & PAIEMENTS": [],
            "UTILISATEURS (ADMIN)": [],
            "DASHBOARD": [],
            "GESTION DES ERREURS": []
        }
        
        for result in self.test_results:
            test_name = result["test"]
            if "Auth" in test_name or "Admin Login" in test_name:
                categories["AUTHENTIFICATION"].append(result)
            elif "Webtoon" in test_name:
                categories["WEBTOONS CRUD"].append(result)
            elif "Episode" in test_name:
                categories["EPISODES CRUD"].append(result)
            elif "Genre" in test_name:
                categories["GENRES CRUD"].append(result)
            elif "Article" in test_name:
                categories["ARTICLES CRUD"].append(result)
            elif "Comment" in test_name:
                categories["COMMENTAIRES"].append(result)
            elif "Subscription" in test_name or "Payment" in test_name:
                categories["ABONNEMENTS & PAIEMENTS"].append(result)
            elif "Admin User" in test_name:
                categories["UTILISATEURS (ADMIN)"].append(result)
            elif "Stats" in test_name:
                categories["DASHBOARD"].append(result)
            elif "Error" in test_name:
                categories["GESTION DES ERREURS"].append(result)
        
        # Print results by category
        for category, results in categories.items():
            if results:
                print(f"\n{category}:")
                for result in results:
                    status = "✅ PASS" if result["success"] else "❌ FAIL"
                    print(f"  {status} - {result['test']}")
                    if not result["success"] and result["details"]:
                        print(f"    ❌ {result['details']}")
                        if result["http_code"]:
                            print(f"    📊 Code HTTP: {result['http_code']}")
        
        print(f"\n📊 RÉSULTATS GLOBAUX: {passed}/{total} tests réussis ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS!")
            return True
        else:
            print("⚠️ CERTAINS TESTS ONT ÉCHOUÉ - VOIR DÉTAILS CI-DESSUS")
            return False

def main():
    """Exécution principale des tests"""
    tester = ToomToonComprehensiveTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()