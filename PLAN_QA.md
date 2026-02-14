# Plan de Tests - vCard Platform QA

## Contexte
Créer une suite de tests complète pour les 3 workstreams du projet vCard Platform:
- **Backend (FastAPI)**: Tests unitaires et d'intégration avec pytest
- **Mobile (Flutter)**: Tests unitaires et widget tests
- **Web (Next.js)**: Tests E2E avec Playwright

## État actuel du code analysé

### Backend
- **Structure**: FastAPI app basique avec:
  - `/health` endpoint fonctionnel
  - AccountPE client pour intégration API vCard V2
  - Configuration via pydantic-settings
  - Database setup avec SQLAlchemy async
- **API v1**: Structure créée mais pas encore implémentée
- **Dépendances**: pytest sera à ajouter

### Web
- **Next.js app** avec:
  - API routes pour paiements (S3P Mobile Money, E-nkap)
  - Webhook handlers pour notifications de paiement
  - Database operations (orders, transactions)
- **Stack**: TypeScript, Next.js 16, PostgreSQL
- **Tests**: Aucun test existant, Playwright à configurer

### Mobile
- **Aucun code Flutter trouvé** dans le projet actuellement
- Tests à créer une fois le code mobile implémenté

## Phase 1: Setup des tests

### 1.1 Backend Tests (pytest)

**Fichiers à créer:**

1. **backend/tests/conftest.py**
   - Fixture: `test_client` (TestClient FastAPI)
   - Fixture: `test_db` (AsyncSession avec DB en mémoire SQLite)
   - Fixture: `mock_accountpe` (Mock du client AccountPE)
   - Fixture: `sample_user_data` (données de test)
   - Fixture: `sample_card_data` (données de test)

2. **backend/tests/test_health.py**
   - Test du endpoint `/health`
   - Vérifier status code 200
   - Vérifier response JSON format

3. **backend/tests/test_auth.py** (pour API v1 future)
   - Test `POST /api/v1/auth/register`
     - Cas nominal: création utilisateur
     - Cas erreur: email déjà existant
     - Cas erreur: données invalides
   - Test `POST /api/v1/auth/login`
     - Cas nominal: login réussi + JWT token
     - Cas erreur: credentials invalides

4. **backend/tests/test_cards.py** (pour API v1 future)
   - Test `POST /api/v1/cards/purchase`
     - Mock AccountPE API
     - Vérifier création carte
     - Vérifier sauvegarde en DB
   - Test `GET /api/v1/cards/{card_id}`
   - Test `POST /api/v1/cards/{card_id}/freeze`
   - Test `POST /api/v1/cards/{card_id}/topup`

5. **backend/tests/test_transactions.py** (pour API v1 future)
   - Test `GET /api/v1/cards/{card_id}/transactions`
   - Vérifier pagination
   - Vérifier filtres

6. **backend/tests/test_accountpe_client.py**
   - Test `health_check()` avec httpx mock
   - Test headers authentication
   - Test error handling

### 1.2 Web Tests (Playwright)

**Configuration:**

1. **web/tests/playwright.config.ts**
   - Setup base URL (http://localhost:3000)
   - Configuration browsers (chromium, firefox, webkit)
   - Screenshots on failure
   - Video recording en cas d'échec

**Tests E2E:**

2. **web/tests/e2e/vcard-purchase.spec.ts**
   - Navigation vers page vCard
   - Sélection type de carte (Visa/Mastercard)
   - Remplissage formulaire commande
   - Sélection méthode paiement (Mobile Money/E-nkap)
   - Vérification redirection paiement
   - Mock des API endpoints

3. **web/tests/e2e/vcard-recharge.spec.ts**
   - Login utilisateur
   - Accès dashboard cartes
   - Sélection carte à recharger
   - Remplissage montant
   - Processus de paiement

4. **web/tests/e2e/vcard-dashboard.spec.ts**
   - Login utilisateur
   - Affichage liste cartes
   - Détails d'une carte
   - Historique transactions
   - Actions: freeze/unfreeze

5. **web/tests/e2e/payment-flow.spec.ts**
   - Test flow Mobile Money (S3P)
   - Test flow E-nkap
   - Test webhook callbacks
   - Test status polling

### 1.3 Mobile Tests (Flutter)

**Note**: Ces tests seront créés mais ne pourront être exécutés que lorsque le code mobile sera implémenté.

1. **mobile/test/widget_test.dart**
   - Test basique de l'app Flutter
   - Vérifier que l'app démarre

2. **mobile/test/models/card_model_test.dart**
   - Test serialization/deserialization JSON
   - Test validation des champs

3. **mobile/test/models/transaction_model_test.dart**
   - Test serialization/deserialization JSON
   - Test calculs (montants, fees)

4. **mobile/test/services/api_service_test.dart**
   - Mock HTTP client
   - Test endpoints API
   - Test error handling
   - Test token refresh

5. **mobile/test/widgets/card_list_test.dart**
   - Test affichage liste cartes
   - Test tap sur carte
   - Test états vide/chargement/erreur

## Dépendances à ajouter

### Backend
```txt
pytest==8.3.4
pytest-asyncio==0.24.0
pytest-cov==6.0.0
httpx==0.27.2  # déjà présent
faker==33.1.0
```

### Web
```json
{
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@types/node": "^20"  // déjà présent
  }
}
```

### Mobile
```yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  mockito: ^5.4.4
  build_runner: ^2.4.13
```

## Stratégie d'implémentation

### Étape 1: Setup infrastructure (PRIORITÉ)
1. Installer pytest et dépendances backend
2. Créer `conftest.py` avec fixtures de base
3. Installer Playwright
4. Créer `playwright.config.ts`

### Étape 2: Tests basiques
5. Test `/health` endpoint (backend)
6. Test E2E navigation basique (web)

### Étape 3: Tests API backend
7. Tests auth endpoints (quand implémentés)
8. Tests cards endpoints (quand implémentés)
9. Tests AccountPE client

### Étape 4: Tests E2E web
10. Test purchase flow
11. Test dashboard
12. Test payment flows

### Étape 5: Tests mobile
13. Setup structure de tests
14. Tests à implémenter quand le code mobile sera prêt

## Critères de succès

- ✅ Pytest configuré et fonctionnel
- ✅ Playwright configuré et fonctionnel
- ✅ Au moins 1 test backend qui passe
- ✅ Au moins 1 test E2E qui passe
- ✅ Structure de tests mobile créée
- ✅ Coverage > 70% pour le code existant
- ✅ CI/CD ready (tests peuvent tourner en pipeline)

## Exclusions Phase 1

❌ Tests de performance/load testing
❌ Tests de sécurité (penetration testing)
❌ Tests d'intégration complète multi-services
❌ Tests visuels/snapshot testing
❌ Tests d'accessibilité (a11y)

Ces tests pourront être ajoutés en Phase 2 si nécessaire.
