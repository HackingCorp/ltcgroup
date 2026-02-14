# LTC Group vCard API - Backend

Backend FastAPI pour la plateforme vCard avec intégration AccountPE.

## Architecture

```
backend/
├── app/
│   ├── api/v1/          # Endpoints API
│   │   ├── auth.py      # POST /register, /login
│   │   ├── users.py     # GET /me, POST /kyc, PATCH /me
│   │   ├── cards.py     # Purchase, list, freeze, unfreeze, block
│   │   └── transactions.py  # Topup, withdraw, list transactions
│   ├── models/          # Modèles SQLAlchemy
│   │   ├── user.py      # User, KYCStatus
│   │   ├── card.py      # Card, CardType, CardStatus
│   │   └── transaction.py  # Transaction, TransactionType, TransactionStatus
│   ├── schemas/         # Schémas Pydantic
│   │   ├── auth.py      # Token, TokenData
│   │   ├── user.py      # UserCreate, UserResponse, etc.
│   │   ├── card.py      # CardPurchase, CardResponse, etc.
│   │   └── transaction.py  # TopupRequest, TransactionResponse, etc.
│   ├── services/        # Services métier
│   │   ├── auth.py      # JWT, password hashing, get_current_user
│   │   └── accountpe.py # Client HTTP AccountPE
│   ├── utils/           # Utilitaires
│   │   └── exceptions.py  # Exceptions personnalisées
│   ├── config.py        # Configuration Pydantic
│   ├── database.py      # SQLAlchemy async setup
│   └── main.py          # Application FastAPI
├── Dockerfile
├── requirements.txt
└── README.md
```

## Installation

### 1. Variables d'environnement

Copier le fichier `.env.example` vers `.env` et configurer les valeurs:

```bash
cp .env.example .env
```

### 2. Installation des dépendances

```bash
pip install -r requirements.txt
```

### 3. Démarrage de la base de données

```bash
docker-compose up -d postgres redis
```

### 4. Lancement du serveur

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Documentation API

Une fois le serveur lancé, la documentation Swagger est accessible à:
- http://localhost:8000/docs (Swagger UI)
- http://localhost:8000/redoc (ReDoc)

## Endpoints principaux

### Authentication
- `POST /api/v1/auth/register` - Créer un compte utilisateur
- `POST /api/v1/auth/login` - Se connecter et obtenir un JWT token

### Users
- `GET /api/v1/users/me` - Obtenir le profil utilisateur
- `PATCH /api/v1/users/me` - Mettre à jour le profil
- `POST /api/v1/users/kyc` - Soumettre des documents KYC

### Cards
- `POST /api/v1/cards/purchase` - Acheter une nouvelle carte virtuelle
- `GET /api/v1/cards/` - Lister toutes les cartes de l'utilisateur
- `GET /api/v1/cards/{card_id}` - Obtenir les détails d'une carte
- `POST /api/v1/cards/{card_id}/freeze` - Geler une carte
- `POST /api/v1/cards/{card_id}/unfreeze` - Dégeler une carte
- `POST /api/v1/cards/{card_id}/block` - Bloquer une carte (irréversible)

### Transactions
- `GET /api/v1/transactions/cards/{card_id}/transactions` - Historique des transactions
- `POST /api/v1/transactions/topup` - Recharger une carte
- `POST /api/v1/transactions/withdraw` - Retirer des fonds

## Modèles de données

### User
- KYC status: PENDING, APPROVED, REJECTED
- Relationships: cards, transactions

### Card
- Types: VISA, MASTERCARD
- Status: ACTIVE, FROZEN, BLOCKED, EXPIRED
- Balance tracking
- Encrypted card details

### Transaction
- Types: TOPUP, WITHDRAW, PURCHASE, REFUND
- Status: PENDING, COMPLETED, FAILED, CANCELLED
- Linked to card and user

## Sécurité

- JWT authentication sur tous les endpoints protégés
- Password hashing avec bcrypt
- Validation des ownership (utilisateur ne peut accéder qu'à ses propres cartes)
- Encryption des données sensibles (numéros de carte, CVV)
- CORS configuré pour les origines autorisées

## Tests

```bash
pytest app/tests/
```

## Docker

Build et run avec Docker:

```bash
docker build -t ltc-vcard-api .
docker run -p 8000:8000 --env-file .env ltc-vcard-api
```

## Intégration AccountPE

Le service `AccountPEClient` gère toutes les communications avec l'API AccountPE:
- Authentification via Bearer token
- Timeout configuré à 30s
- Error handling avec HTTPException

Tous les appels AccountPE sont en async pour ne pas bloquer le serveur.

## Bonnes pratiques implémentées

- Async/await partout
- Dependency injection (get_db, get_current_user)
- Error handling avec exceptions personnalisées
- Validation Pydantic stricte
- Logging approprié
- Transaction DB avec rollback automatique sur erreur
- Separation of concerns (models, schemas, services, endpoints)
