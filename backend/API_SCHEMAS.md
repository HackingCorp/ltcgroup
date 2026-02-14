# API Schemas Documentation - vCard Platform

Documentation complète des schemas Pydantic pour l'intégration frontend (Flutter, Web).

## Base URL
- **Development**: `http://localhost:8000/api/v1`
- **Production**: TBD

## Authentication

Tous les endpoints protégés nécessitent un header Authorization:
```
Authorization: Bearer <jwt_token>
```

---

## Auth Endpoints

### POST `/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "+33612345678",
  "first_name": "John",
  "last_name": "Doe",
  "password": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "phone": "+33612345678",
    "first_name": "John",
    "last_name": "Doe",
    "kyc_status": "PENDING",
    "created_at": "2026-02-14T18:00:00"
  },
  "token": {
    "access_token": "eyJhbGc...",
    "token_type": "bearer",
    "expires_in": 1800
  }
}
```

### POST `/auth/login`

**Query Parameters:**
- `email`: string (required)
- `password`: string (required)

**Response (200):**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

---

## User Endpoints

### GET `/users/me`
**Auth**: Required

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "phone": "+33612345678",
  "first_name": "John",
  "last_name": "Doe",
  "kyc_status": "PENDING",
  "created_at": "2026-02-14T18:00:00"
}
```

### PATCH `/users/me`
**Auth**: Required

**Request Body (all fields optional):**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "phone": "+33698765432"
}
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "phone": "+33698765432",
  "first_name": "Jane",
  "last_name": "Smith",
  "kyc_status": "PENDING",
  "created_at": "2026-02-14T18:00:00"
}
```

### POST `/users/kyc`
**Auth**: Required

**Request Body:**
```json
{
  "document_url": "https://storage.example.com/id-card.jpg",
  "document_type": "passport"
}
```

**Response (200):**
```json
{
  "kyc_status": "PENDING",
  "kyc_submitted_at": "2026-02-14T18:30:00"
}
```

---

## Card Endpoints

### POST `/cards/purchase`
**Auth**: Required

**Request Body:**
```json
{
  "card_type": "VISA",
  "initial_balance": 100.00
}
```

**Response (201):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "card_type": "VISA",
  "card_number_masked": "****1234",
  "status": "ACTIVE",
  "balance": 100.00,
  "currency": "USD",
  "expiry_date": "12/29",
  "created_at": "2026-02-14T19:00:00"
}
```

### GET `/cards/`
**Auth**: Required

**Response (200):**
```json
{
  "cards": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "card_type": "VISA",
      "card_number_masked": "****1234",
      "status": "ACTIVE",
      "balance": 100.00,
      "currency": "USD",
      "expiry_date": "12/29",
      "created_at": "2026-02-14T19:00:00"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "card_type": "MASTERCARD",
      "card_number_masked": "****5678",
      "status": "FROZEN",
      "balance": 250.50,
      "currency": "USD",
      "expiry_date": "11/28",
      "created_at": "2026-02-10T14:30:00"
    }
  ],
  "total": 2
}
```

### GET `/cards/{card_id}`
**Auth**: Required

**Response (200):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "card_type": "VISA",
  "card_number_masked": "****1234",
  "status": "ACTIVE",
  "balance": 100.00,
  "currency": "USD",
  "expiry_date": "12/29",
  "created_at": "2026-02-14T19:00:00"
}
```

### POST `/cards/{card_id}/freeze`
**Auth**: Required

**Response (200):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "card_type": "VISA",
  "card_number_masked": "****1234",
  "status": "FROZEN",
  "balance": 100.00,
  "currency": "USD",
  "expiry_date": "12/29",
  "created_at": "2026-02-14T19:00:00"
}
```

### POST `/cards/{card_id}/unfreeze`
**Auth**: Required

**Response (200):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "card_type": "VISA",
  "card_number_masked": "****1234",
  "status": "ACTIVE",
  "balance": 100.00,
  "currency": "USD",
  "expiry_date": "12/29",
  "created_at": "2026-02-14T19:00:00"
}
```

### POST `/cards/{card_id}/block`
**Auth**: Required

**Response (200):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "card_type": "VISA",
  "card_number_masked": "****1234",
  "status": "BLOCKED",
  "balance": 100.00,
  "currency": "USD",
  "expiry_date": "12/29",
  "created_at": "2026-02-14T19:00:00"
}
```

---

## Transaction Endpoints

### GET `/transactions/cards/{card_id}/transactions`
**Auth**: Required

**Query Parameters:**
- `limit`: int (default: 50, max: 100)
- `offset`: int (default: 0)

**Response (200):**
```json
{
  "transactions": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440003",
      "card_id": "660e8400-e29b-41d4-a716-446655440001",
      "amount": 50.00,
      "currency": "USD",
      "type": "TOPUP",
      "status": "COMPLETED",
      "description": "Top-up 50.0 USD",
      "created_at": "2026-02-14T20:00:00"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440004",
      "card_id": "660e8400-e29b-41d4-a716-446655440001",
      "amount": 25.00,
      "currency": "USD",
      "type": "PURCHASE",
      "status": "COMPLETED",
      "description": null,
      "created_at": "2026-02-14T19:30:00"
    }
  ],
  "total_count": 2,
  "page": 1,
  "page_size": 50
}
```

### POST `/transactions/topup`
**Auth**: Required

**Request Body:**
```json
{
  "card_id": "660e8400-e29b-41d4-a716-446655440001",
  "amount": 100.00,
  "currency": "USD"
}
```

**Response (201):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440005",
  "card_id": "660e8400-e29b-41d4-a716-446655440001",
  "amount": 100.00,
  "currency": "USD",
  "type": "TOPUP",
  "status": "COMPLETED",
  "description": "Top-up 100.0 USD",
  "created_at": "2026-02-14T21:00:00"
}
```

### POST `/transactions/withdraw`
**Auth**: Required

**Request Body:**
```json
{
  "card_id": "660e8400-e29b-41d4-a716-446655440001",
  "amount": 50.00,
  "currency": "USD"
}
```

**Response (201):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440006",
  "card_id": "660e8400-e29b-41d4-a716-446655440001",
  "amount": 50.00,
  "currency": "USD",
  "type": "WITHDRAW",
  "status": "COMPLETED",
  "description": "Withdrawal 50.0 USD",
  "created_at": "2026-02-14T21:15:00"
}
```

---

## Enums

### KYCStatus
- `PENDING` - KYC en attente de vérification
- `APPROVED` - KYC approuvé
- `REJECTED` - KYC rejeté

### CardType
- `VISA` - Carte Visa
- `MASTERCARD` - Carte Mastercard

### CardStatus
- `ACTIVE` - Carte active et utilisable
- `FROZEN` - Carte gelée temporairement (réversible)
- `BLOCKED` - Carte bloquée définitivement (irréversible)
- `EXPIRED` - Carte expirée

### TransactionType
- `TOPUP` - Rechargement de carte
- `WITHDRAW` - Retrait de fonds
- `PURCHASE` - Achat effectué avec la carte
- `REFUND` - Remboursement

### TransactionStatus
- `PENDING` - Transaction en cours
- `COMPLETED` - Transaction réussie
- `FAILED` - Transaction échouée
- `CANCELLED` - Transaction annulée

---

## Error Responses

Toutes les erreurs suivent le format:

```json
{
  "detail": "Error message description"
}
```

### Common HTTP Status Codes

- `200 OK` - Requête réussie
- `201 Created` - Ressource créée avec succès
- `400 Bad Request` - Données invalides
- `401 Unauthorized` - Non authentifié ou token invalide
- `403 Forbidden` - Accès interdit (KYC non approuvé, compte inactif, etc.)
- `404 Not Found` - Ressource non trouvée
- `500 Internal Server Error` - Erreur serveur
- `503 Service Unavailable` - Service AccountPE indisponible

### Exemple d'erreurs spécifiques

**Card not found:**
```json
{
  "detail": "Card 660e8400-e29b-41d4-a716-446655440001 not found"
}
```

**Insufficient balance:**
```json
{
  "detail": "Insufficient balance for this operation"
}
```

**Unauthorized card access:**
```json
{
  "detail": "You do not have permission to access this card"
}
```

**Card already blocked:**
```json
{
  "detail": "Card is already blocked and cannot be modified"
}
```

**User already exists:**
```json
{
  "detail": "User with this email already exists"
}
```

**Invalid credentials:**
```json
{
  "detail": "Invalid email or password"
}
```

---

## Notes d'implémentation

### Frontend (Flutter/Web)

1. **Stockage du token JWT**: Stocker le token en local storage ou secure storage
2. **Auto-refresh**: Le token expire après 30 minutes, implémenter une logique de refresh ou re-login
3. **Error handling**: Toutes les erreurs HTTP retournent un champ `detail` avec le message
4. **Dates**: Toutes les dates sont en format ISO 8601 UTC
5. **Decimal**: Les montants sont en Decimal avec 2 décimales (ex: 100.00)

### Flux utilisateur typique

1. Register → Obtenir token
2. Login → Obtenir token
3. Submit KYC → Attendre approbation
4. Purchase card → Créer une carte virtuelle
5. Topup → Ajouter des fonds
6. Transactions → Consulter l'historique

### Pagination

Pour les listes paginées (transactions), utiliser `limit` et `offset`:
- Page 1: `offset=0, limit=50`
- Page 2: `offset=50, limit=50`
- Page 3: `offset=100, limit=50`
