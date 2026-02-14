# Plan d'implémentation Backend FastAPI - vCard Platform

## Vue d'ensemble
Développement complet du backend FastAPI pour la plateforme vCard avec intégration AccountPE.

## Phase 1: Modèles de données (SQLAlchemy)

### 1.1 Modèle User (`backend/app/models/user.py`)
```python
- id: UUID (PK)
- email: String (unique, indexed)
- phone: String (unique, indexed)
- first_name: String
- last_name: String
- hashed_password: String
- kyc_status: Enum (PENDING, APPROVED, REJECTED)
- kyc_document_url: String (nullable)
- kyc_submitted_at: DateTime (nullable)
- is_active: Boolean (default True)
- created_at: DateTime
- updated_at: DateTime
- relationship: cards (1-to-many)
- relationship: transactions (1-to-many)
```

### 1.2 Modèle Card (`backend/app/models/card.py`)
```python
- id: UUID (PK)
- user_id: UUID (FK -> users.id, indexed)
- card_type: Enum (VISA, MASTERCARD)
- card_number_masked: String (ex: ****1234)
- card_number_full_encrypted: String (encrypted, AccountPE reference)
- status: Enum (ACTIVE, FROZEN, BLOCKED, EXPIRED)
- balance: Decimal (precision 10, scale 2)
- currency: String (default "USD")
- provider: String (default "AccountPE")
- provider_card_id: String (AccountPE card reference)
- expiry_date: String (MM/YY)
- cvv_encrypted: String (encrypted)
- created_at: DateTime
- updated_at: DateTime
- relationship: transactions (1-to-many)
```

### 1.3 Modèle Transaction (`backend/app/models/transaction.py`)
```python
- id: UUID (PK)
- card_id: UUID (FK -> cards.id, indexed)
- user_id: UUID (FK -> users.id, indexed)
- amount: Decimal (precision 10, scale 2)
- currency: String (default "USD")
- type: Enum (TOPUP, WITHDRAW, PURCHASE, REFUND)
- status: Enum (PENDING, COMPLETED, FAILED, CANCELLED)
- description: String (nullable)
- provider_transaction_id: String (AccountPE reference)
- metadata: JSON (nullable, extra provider data)
- created_at: DateTime
- updated_at: DateTime
```

### 1.4 Base et initialisation (`backend/app/models/__init__.py`)
- Importer Base depuis database.py
- Exporter tous les modèles pour Alembic
- Créer fonction init_models() pour créer les tables

## Phase 2: Schémas Pydantic

### 2.1 Schémas User (`backend/app/schemas/user.py`)
```python
- UserCreate: email, phone, first_name, last_name, password
- UserLogin: email, password
- UserResponse: id, email, phone, first_name, last_name, kyc_status, created_at
- UserUpdate: first_name, last_name, phone (tous optionnels)
- KYCSubmit: document_url, document_type
- KYCResponse: kyc_status, kyc_submitted_at
```

### 2.2 Schémas Card (`backend/app/schemas/card.py`)
```python
- CardPurchase: card_type (VISA/MASTERCARD), initial_balance
- CardResponse: id, card_type, card_number_masked, status, balance, currency, expiry_date, created_at
- CardAction: action type (pour freeze/unfreeze/block)
- CardListResponse: List[CardResponse]
```

### 2.3 Schémas Transaction (`backend/app/schemas/transaction.py`)
```python
- TopupRequest: card_id, amount, currency
- WithdrawRequest: card_id, amount, currency
- TransactionResponse: id, card_id, amount, currency, type, status, description, created_at
- TransactionListResponse: List[TransactionResponse], total_count, page, page_size
```

### 2.4 Schémas Auth (`backend/app/schemas/auth.py`)
```python
- Token: access_token, token_type, expires_in
- TokenData: user_id, email
```

## Phase 3: Services et utilitaires

### 3.1 Service AccountPE (`backend/app/services/accountpe.py`)
Compléter avec les méthodes:
```python
- async register_user(email, phone, first_name, last_name, password) -> dict
- async login_user(email, password) -> dict
- async submit_kyc(user_id, document_url, document_type) -> dict
- async purchase_card(user_id, card_type, initial_balance) -> dict
- async get_card_details(card_id) -> dict
- async freeze_card(card_id) -> dict
- async unfreeze_card(card_id) -> dict
- async block_card(card_id) -> dict
- async topup_card(card_id, amount, currency) -> dict
- async withdraw_from_card(card_id, amount, currency) -> dict
- async get_card_transactions(card_id, limit, offset) -> dict
```

### 3.2 Service Auth (`backend/app/services/auth.py`)
```python
- hash_password(password: str) -> str
- verify_password(plain_password: str, hashed_password: str) -> bool
- create_access_token(data: dict, expires_delta: timedelta) -> str
- verify_token(token: str) -> TokenData
- get_current_user(token: str, db: AsyncSession) -> User
```

### 3.3 Utilitaires (`backend/app/utils/`)
- `encryption.py`: Fonctions pour encrypt/decrypt card data
- `exceptions.py`: Exceptions personnalisées (CardNotFound, InsufficientBalance, etc.)

## Phase 4: Endpoints API

### 4.1 Auth endpoints (`backend/app/api/v1/auth.py`)
```python
POST /register
- Input: UserCreate
- Output: UserResponse + Token
- Logic: Créer user local + appeler AccountPE register

POST /login
- Input: UserLogin
- Output: Token
- Logic: Vérifier credentials + générer JWT
```

### 4.2 User endpoints (`backend/app/api/v1/users.py`)
```python
GET /me
- Auth: Required
- Output: UserResponse
- Logic: Retourner l'utilisateur courant

POST /kyc
- Auth: Required
- Input: KYCSubmit
- Output: KYCResponse
- Logic: Soumettre KYC à AccountPE + update user status

PATCH /me
- Auth: Required
- Input: UserUpdate
- Output: UserResponse
- Logic: Mettre à jour les infos user
```

### 4.3 Card endpoints (`backend/app/api/v1/cards.py`)
```python
POST /purchase
- Auth: Required
- Input: CardPurchase
- Output: CardResponse
- Logic: Appeler AccountPE + créer card en DB

GET /
- Auth: Required
- Output: CardListResponse
- Logic: Lister toutes les cartes de l'utilisateur

GET /{card_id}
- Auth: Required
- Output: CardResponse
- Logic: Détails d'une carte + vérifier ownership

POST /{card_id}/freeze
- Auth: Required
- Output: CardResponse
- Logic: Appeler AccountPE freeze + update status

POST /{card_id}/unfreeze
- Auth: Required
- Output: CardResponse
- Logic: Appeler AccountPE unfreeze + update status

POST /{card_id}/block
- Auth: Required
- Output: CardResponse
- Logic: Appeler AccountPE block + update status (irréversible)
```

### 4.4 Transaction endpoints (`backend/app/api/v1/transactions.py`)
```python
GET /cards/{card_id}/transactions
- Auth: Required
- Query params: limit, offset
- Output: TransactionListResponse
- Logic: Récupérer transactions depuis DB + AccountPE sync

POST /topup
- Auth: Required
- Input: TopupRequest
- Output: TransactionResponse
- Logic: Appeler AccountPE topup + créer transaction

POST /withdraw
- Auth: Required
- Input: WithdrawRequest
- Output: TransactionResponse
- Logic: Appeler AccountPE withdraw + créer transaction
```

### 4.5 Router principal (`backend/app/api/v1/__init__.py`)
```python
- Créer APIRouter avec prefix /api/v1
- Inclure tous les routers (auth, users, cards, transactions)
- Tags pour organisation Swagger
```

## Phase 5: Configuration finale

### 5.1 Mise à jour `backend/app/main.py`
```python
- Importer et inclure le router API v1
- Ajouter exception handlers globaux
- Ajouter middleware de logging
- Configurer startup/shutdown events (init DB)
```

### 5.2 Mise à jour `backend/app/config.py`
```python
- Ajouter JWT_SECRET_KEY
- Ajouter JWT_ALGORITHM (HS256)
- Ajouter ACCESS_TOKEN_EXPIRE_MINUTES (30)
- Ajouter ENCRYPTION_KEY pour les données sensibles
```

### 5.3 Dépendances manquantes
Vérifier si besoin d'ajouter à requirements.txt:
- python-multipart (pour file uploads)
- python-dotenv (pour .env)

## Phase 6: Tests basiques

### 6.1 Structure de tests (`backend/app/tests/`)
```
- conftest.py: Fixtures (test_db, test_client, test_user)
- test_auth.py: Tests register/login
- test_cards.py: Tests purchase/freeze/block
- test_transactions.py: Tests topup/withdraw
```

### 6.2 Tests essentiels
```python
- Test register avec données valides/invalides
- Test login avec credentials valides/invalides
- Test purchase card avec/sans auth
- Test card ownership (ne pas accéder aux cartes d'un autre user)
- Test topup/withdraw avec solde suffisant/insuffisant
```

## Ordre d'exécution

1. Créer tous les modèles SQLAlchemy (models/)
2. Créer tous les schémas Pydantic (schemas/)
3. Créer le service auth (services/auth.py)
4. Compléter le service AccountPE (services/accountpe.py)
5. Créer les endpoints auth (api/v1/auth.py)
6. Créer les endpoints users (api/v1/users.py)
7. Créer les endpoints cards (api/v1/cards.py)
8. Créer les endpoints transactions (api/v1/transactions.py)
9. Créer le router principal (api/v1/__init__.py)
10. Mettre à jour main.py pour inclure le router
11. Mettre à jour config.py avec les nouvelles variables
12. Créer les tests de base

## Points d'attention

- Utiliser async/await partout
- Dependency injection pour get_db et get_current_user
- Error handling avec HTTPException
- Validation Pydantic stricte
- Logging approprié
- Gestion des transactions DB (rollback sur erreur)
- Vérification ownership des ressources (cards, transactions)
- Encryption des données sensibles (card numbers, CVV)
- Rate limiting sur les endpoints sensibles (à ajouter en middleware)

## Livrables

- Code complet et fonctionnel dans backend/app/
- Tous les fichiers créés respectent les bonnes pratiques FastAPI
- Documentation Swagger auto-générée accessible via /docs
- Tests basiques passent avec pytest
- README.md mis à jour avec les instructions de setup et d'exécution
