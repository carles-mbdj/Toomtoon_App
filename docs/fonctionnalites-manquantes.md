# Fonctionnalités manquantes avant mise en prod

Ce fichier liste ce qu'il reste à faire pour que ToomToon soit prêt à l'utilisation. Il est mis à jour à chaque session de travail : un point terminé est **retiré** de la liste, pas juste cochée — ce fichier ne doit contenir que ce qui reste à faire.

Dernière mise à jour : 2026-10-30

---

## 🔴 Bloquant — rien ne marche en prod sans ça

- [ ] **Hébergement backend** : tourne encore en local (`localhost`), aucun choix définitif (pistes : Render pour le backend, MongoDB Atlas pour la base).
- [ ] **Clés Stripe réelles** : `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` vides dans `backend/.env`.
- [ ] **SMTP configuré** : l'infrastructure d'envoi d'email existe (`backend/email_service.py`) mais `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM_EMAIL` sont vides → aucun email n'est réellement envoyé (ni confirmation d'abonnement, ni réinitialisation de mot de passe, qui reste seulement loggée côté serveur).
- [ ] **Clé Android RevenueCat réelle** (`goog_...`) à la place de la clé Test Store, une fois Google Play Console validé.
- [ ] **Produits créés dans Google Play Console** (`plan_1_month`, `plan_3_months`, `plan_12_months`) + RevenueCat lié au compte de service Google.
- [ ] **Build EAS `preview`/`production`** : le profil `development` actuel (dev client + Metro) ne suffit pas pour une vraie mise en prod ou un envoi en test fermé Play Console.

## 🟠 Sécurité / légal identifiés mais pas encore traités

- [ ] Token admin stocké en `localStorage` au lieu d'un cookie `HttpOnly` (vulnérable en cas de faille XSS).
- [ ] Suppression de compte accessible uniquement depuis l'app — Google Play exige aussi une option **web**, indépendante de l'app.
- [ ] Pages CGU / CGV / Politique de confidentialité pas encore publiées sur toomcomics.com — les liens dans l'app pointent vers des URLs provisoires (`frontend/src/constants/legal.ts`).
- [ ] Incohérence de prix entre les deux grilles tarifaires (flux de paiement historique vs flux Stripe Checkout réel) — l'ID a été corrigé mais pas les montants, décision business à trancher.
- [ ] Médiateur de la consommation pas encore désigné (obligatoire en France pour vendre à des consommateurs).
- [ ] Aucune vérification d'âge ni consentement parental pour les mineurs (la collection jeunesse est accessible sans contrôle).
- [ ] `delete_account` ne peut pas annuler un abonnement Google Play (Google est le marchand) — un avertissement est loggé pour le support, mais rien d'automatique.

## 🟡 Qualité / dette technique

- [ ] Ancien flux de paiement `PaymentIntent` (`create-intent`/`confirm`/`test-confirm`) : confirmé inutilisé par l'app réelle (elle passe par Stripe Checkout), à supprimer.
- [ ] Pas de monitoring d'erreurs (Sentry ou équivalent) ni de logs structurés — juste du texte brut aujourd'hui.
- [ ] Pas de sauvegardes de base de données prévues.
- [ ] Pas de journal des actions admin (audit log).
- [ ] Pas de Docker ni de déploiement automatisé (CI actuelle = tests + build, pas de déploiement).

## 🟢 Fonctionnalités reportées délibérément (pas des oublis)

- [ ] Connexion via compte Google (reportée le 2026-10-30).
- [ ] Téléchargement hors-ligne (reporté — actuellement juste un bouton "Fonctionnalité à venir" dans les réglages, aucun code derrière).

---

## Déjà fait (pour mémoire, retiré de la liste au fur et à mesure)

Authentification sécurisée (bcrypt, JWT court + refresh token révocable, rate limiting), webhooks Stripe et RevenueCat vérifiés et testés, stockage image Cloudinary, suppression de compte qui annule aussi Stripe, consentement CGV explicite à l'achat, formulaire d'inscription validé (email, robustesse du mot de passe, confirmation), 53 tests automatisés côté backend.
