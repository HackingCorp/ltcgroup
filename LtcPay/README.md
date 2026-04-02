# LtcPay - Payment Gateway

LtcPay is a payment gateway built on **TouchPay** that enables merchants to accept mobile money payments (Orange Money, MTN Money) and bank card payments in Central Africa (XAF/XOF currency).

## Architecture

```
  Merchant Server                   LtcPay                      TouchPay
  +-------------+    API Key Auth   +------------------+         +-----------+
  |             |  ---- POST -----> | FastAPI Backend   |-------->| Payment   |
  | (Your app)  |  <--- JSON ----  | /api/v1/payments  |         | Gateway   |
  +------+------+                   +--------+---------+         +-----+-----+
         |                                   |                         |
         | 4. Webhook                        | 2. Redirect             | 3. Callback
         |    notification                   |    customer             |    webhook
         |                                   v                         |
         |                          +--------+---------+               |
         +<------------------------ | /pay/{reference}  | <------------+
                                    | (Checkout page)   |
                                    +------------------+
                                             |
                                     +-------+-------+
                                     |               |
                                 PostgreSQL       Redis
```

**Stack:**
- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), asyncpg
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Payment Provider:** TouchPay SDK (JS) + webhook callbacks
- **Auth:** API Key + HMAC-SHA256 signed secrets
- **Containerization:** Docker & Docker Compose

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### 1. Clone and configure

```bash
cd LtcPay
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your TouchPay credentials (see [TouchPay Configuration](#touchpay-configuration)).

### 2. Start with Docker Compose

```bash
docker-compose up -d
```

This starts three services:

| Service  | Container          | Host Port | Description          |
|----------|--------------------|-----------|----------------------|
| Backend  | `ltcpay-backend`   | 8001      | FastAPI API server   |
| Database | `ltcpay-postgres`  | 5437      | PostgreSQL 16        |
| Redis    | `ltcpay-redis`     | 6383      | Redis 7 (cache)      |

### 3. Verify

```bash
curl http://localhost:8001/health
# {"status":"healthy"}

curl http://localhost:8001/
# {"name":"LtcPay","version":"1.0.0","status":"running"}
```

### 4. Interactive API Docs

FastAPI auto-generates interactive documentation:

- **Swagger UI:** http://localhost:8001/docs
- **ReDoc:** http://localhost:8001/redoc

## Local Development (without Docker)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: set DATABASE_URL to your local PostgreSQL

# Initialize database
python scripts/init_db.py --seed

# Run the server
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Running Tests

```bash
pip install -r requirements-test.txt
pytest
```

## TouchPay Configuration

To accept payments, you need a TouchPay merchant account. Set these variables in your `.env`:

```bash
# Your TouchPay merchant ID (provided by TouchPay)
TOUCHPAY_MERCHANT_ID=your_merchant_id

# Secret key for webhook signature verification
TOUCHPAY_SECRET=your_touchpay_secret

# TouchPay JavaScript SDK URL (default is production)
TOUCHPAY_SDK_URL=https://touchpay.gutouch.com/touchpayv2/sdk/touchpay.js

# URL where TouchPay will send payment notifications
TOUCHPAY_CALLBACK_URL=https://your-domain.com/api/v1/callbacks/touchpay

# URL where customers are redirected after payment
TOUCHPAY_RETURN_URL=https://your-domain.com/payment/status
```

**Important:** In production, `TOUCHPAY_SECRET` must be set. In development mode, signature verification is skipped.

## API Reference

Base URL: `http://localhost:8001/api/v1`

### Authentication

Merchant API endpoints require two headers:

```
X-API-Key: ltcpay_live_abc123...
X-API-Secret: your_raw_api_secret
```

Credentials are provided when you register a merchant.

---

### Merchant Registration

#### Register Merchant

```
POST /api/v1/merchants/register
```

**cURL Example:**
```bash
curl -X POST http://localhost:8001/api/v1/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Business",
    "email": "contact@mybusiness.com",
    "website": "https://mybusiness.com",
    "webhook_url": "https://mybusiness.com/ltcpay-webhook"
  }'
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Business",
  "email": "contact@mybusiness.com",
  "website": "https://mybusiness.com",
  "webhook_url": "https://mybusiness.com/ltcpay-webhook",
  "api_key": "ltcpay_live_a1b2c3d4e5f6...",
  "is_active": true,
  "is_test_mode": true,
  "created_at": "2026-04-02T12:00:00Z"
}
```

Save `api_key` and the `api_secret` from the registration response -- the secret is shown only once.

#### Get Merchant Credentials

```
GET /api/v1/merchants/{merchant_id}/credentials
```

**cURL Example:**
```bash
curl http://localhost:8001/api/v1/merchants/550e8400-e29b-41d4-a716-446655440000/credentials
```

---

### Payments (Merchant API -- Authenticated)

#### Create Payment

```
POST /api/v1/payments
```

**cURL Example:**
```bash
curl -X POST http://localhost:8001/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ltcpay_live_a1b2c3d4e5f6..." \
  -H "X-API-Secret: your_api_secret" \
  -d '{
    "amount": 5000,
    "currency": "XAF",
    "merchant_reference": "ORDER-1234",
    "description": "Achat de produits",
    "customer_name": "Jean Dupont",
    "customer_email": "jean@example.com",
    "customer_phone": "237670000000",
    "callback_url": "https://mybusiness.com/webhook",
    "return_url": "https://mybusiness.com/thank-you"
  }'
```

**Response (201):**
```json
{
  "payment_id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
  "reference": "PAY-A1B2C3D4E5F67890",
  "amount": "5000.00",
  "currency": "XAF",
  "status": "PENDING",
  "payment_url": "http://localhost:8001/pay/PAY-A1B2C3D4E5F67890",
  "created_at": "2026-04-02T12:00:00Z"
}
```

Redirect the customer to `payment_url` to complete payment.

#### Get Payment Details

```
GET /api/v1/payments/{reference}
```

**cURL Example:**
```bash
curl http://localhost:8001/api/v1/payments/PAY-A1B2C3D4E5F67890 \
  -H "X-API-Key: ltcpay_live_a1b2c3d4e5f6..." \
  -H "X-API-Secret: your_api_secret"
```

#### List Payments (Paginated)

```
GET /api/v1/payments?page=1&page_size=20&status=COMPLETED
```

**cURL Example:**
```bash
curl "http://localhost:8001/api/v1/payments?page=1&page_size=10&status=COMPLETED" \
  -H "X-API-Key: ltcpay_live_a1b2c3d4e5f6..." \
  -H "X-API-Secret: your_api_secret"
```

**Response:**
```json
{
  "payments": [ ... ],
  "total_count": 42,
  "page": 1,
  "page_size": 10
}
```

**Payment Statuses:** `PENDING`, `COMPLETED`, `FAILED`, `EXPIRED`, `CANCELLED`, `REFUNDED`

**Supported Currencies:** `XAF`, `XOF`, `EUR`, `USD`

**Payment Methods:** `MOBILE_MONEY`, `BANK_CARD`

---

### Checkout Page

```
GET /pay/{reference}
```

Customer-facing HTML page with the TouchPay SDK embedded. When the payment is still `PENDING`, the SDK renders the payment form. For terminal states (COMPLETED, FAILED, etc.), a status page is shown.

---

### TouchPay Webhook (Callback)

```
POST /api/v1/callbacks/touchpay
```

Receives payment notifications from TouchPay. Features:
- HMAC-SHA256 signature verification (via `X-TouchPay-Signature` header)
- Idempotent processing (safe to receive duplicate callbacks)
- Atomic status updates with optimistic locking
- Automatic merchant notification on terminal states

---

### Merchant Webhook Notifications

When a payment reaches a terminal state (COMPLETED, FAILED, CANCELLED), LtcPay sends a POST request to your `webhook_url` with:

**Headers:**
```
Content-Type: application/json
X-LtcPay-Signature: <hmac-sha256-hex>
X-LtcPay-Event: payment.status_changed
X-LtcPay-Delivery-Id: PAY-xxx-1712044800
User-Agent: LtcPay-Webhook/1.0
```

**Payload:**
```json
{
  "event": "payment.status_changed",
  "data": {
    "payment_id": "a1b2c3d4-...",
    "reference": "PAY-A1B2C3D4E5F67890",
    "merchant_reference": "ORDER-1234",
    "amount": 5000.0,
    "fee": 75.0,
    "currency": "XAF",
    "status": "COMPLETED",
    "method": "MOBILE_MONEY",
    "customer_name": "Jean Dupont",
    "customer_phone": "237670000000",
    "completed_at": "2026-04-02T12:05:00Z",
    "created_at": "2026-04-02T12:00:00Z"
  },
  "timestamp": "2026-04-02T12:05:01Z"
}
```

**Signature Verification (Python example):**
```python
import hmac, hashlib

def verify_signature(payload_bytes: bytes, signature: str, webhook_secret: str) -> bool:
    expected = hmac.new(
        webhook_secret.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```

**Retry Policy:** Exponential backoff up to 5 attempts (2s, 4s, 8s, 16s, 32s). Return HTTP 2xx to acknowledge.

## Merchant Integration Guide

See [PAYMENT_FLOW.md](docs/PAYMENT_FLOW.md) for the complete payment flow diagram and detailed step-by-step guide.

### Quick Integration Steps

1. **Register** -- `POST /api/v1/merchants/register` to get your `api_key` and `api_secret`
2. **Create Payment** -- `POST /api/v1/payments` with `X-API-Key` + `X-API-Secret` headers
3. **Redirect Customer** -- Send the customer to `payment_url` from the response
4. **Receive Webhook** -- Listen for POST on your `webhook_url` with the payment result
5. **Verify Signature** -- Validate `X-LtcPay-Signature` using your `webhook_secret`
6. **Confirm (optional)** -- `GET /api/v1/payments/{reference}` to double-check status

## Administration Scripts

Run from the `backend/` directory:

```bash
# Initialize database (create tables)
python scripts/init_db.py

# Initialize + seed demo merchant
python scripts/init_db.py --seed

# Merchant management
python scripts/manage_merchants.py create --name "Acme Corp" --email "acme@example.com"
python scripts/manage_merchants.py list
python scripts/manage_merchants.py deactivate --email "acme@example.com"
python scripts/manage_merchants.py activate --email "acme@example.com"
python scripts/manage_merchants.py rotate-keys --email "acme@example.com"

# Simulate TouchPay webhook
python scripts/test_webhook.py --reference PAY-XXXX --status success
python scripts/test_webhook.py --reference PAY-XXXX --status failed

# Health check (API + DB + Redis)
python scripts/healthcheck.py
```

## Environment Variables

| Variable                       | Default                                  | Description                              |
|--------------------------------|------------------------------------------|------------------------------------------|
| `ENVIRONMENT`                  | `development`                            | `development` or `production`            |
| `DATABASE_URL`                 | `postgresql+asyncpg://ltcpay:...@.../ltcpay` | PostgreSQL async connection string  |
| `REDIS_URL`                    | `redis://localhost:6379/1`               | Redis connection string                  |
| `JWT_SECRET_KEY`               | (auto-generated in dev)                  | Secret key for JWT token signing         |
| `SECRET_KEY`                   | (synced from JWT_SECRET_KEY)             | General signing key                      |
| `CORS_ORIGINS`                 | `http://localhost:3000,...`               | Comma-separated allowed origins          |
| `TOUCHPAY_MERCHANT_ID`        | (empty)                                  | TouchPay merchant ID                     |
| `TOUCHPAY_SECRET`              | (empty)                                  | TouchPay webhook HMAC secret             |
| `TOUCHPAY_SDK_URL`             | `https://touchpay.../touchpay.js`        | TouchPay JavaScript SDK URL              |
| `TOUCHPAY_CALLBACK_URL`       | (empty)                                  | Default TouchPay callback URL            |
| `TOUCHPAY_RETURN_URL`         | (empty)                                  | Default return URL after payment         |
| `BASE_URL`                     | `http://localhost:8001`                  | Public-facing URL of this service        |
| `WEBHOOK_BASE_URL`            | `http://localhost:8001`                  | Base URL for payment page links          |
| `MIN_PAYMENT_AMOUNT`          | `100.0`                                  | Minimum payment amount                   |
| `MAX_PAYMENT_AMOUNT`          | `10000000.0`                             | Maximum payment amount                   |
| `PAYMENT_LINK_EXPIRY_MINUTES` | `30`                                     | Payment link validity duration           |
| `MERCHANT_WEBHOOK_TIMEOUT`    | `30`                                     | Merchant webhook request timeout (sec)   |
| `MERCHANT_WEBHOOK_MAX_RETRIES`| `5`                                      | Max webhook delivery retry attempts      |

## Project Structure

```
LtcPay/
  docker-compose.yml                    # Docker services (backend, db, redis)
  README.md                             # This file
  docs/
    PAYMENT_FLOW.md                     # Payment flow documentation
  backend/
    Dockerfile                          # Backend container image
    requirements.txt                    # Python dependencies
    requirements-test.txt               # Test dependencies
    pytest.ini                          # Pytest configuration
    .env.example                        # Environment variable template
    app/
      main.py                           # FastAPI app + checkout page route
      core/
        config.py                       # Pydantic settings (env vars)
        database.py                     # SQLAlchemy async engine + session
        security.py                     # Auth, JWT, HMAC, key generation
      models/
        merchant.py                     # Merchant model (API keys, webhooks)
        payment.py                      # Payment model (amounts, status, tracking)
        transaction.py                  # Legacy transaction model
      schemas/
        payment.py                      # Request/response schemas (Pydantic)
        merchant.py                     # Merchant schemas
      api/v1/
        router.py                       # Route aggregation
        payments.py                     # Merchant payment API (authenticated)
        merchants.py                    # Merchant registration
        endpoints/
          callbacks.py                  # TouchPay webhook handler
      services/
        touchpay_service.py             # TouchPay SDK config + verification
        notification.py                 # Merchant webhook notifications
        auth.py                         # API key auth (legacy)
      templates/
        checkout.html                   # TouchPay SDK payment page
        payment_status.html             # Post-payment status page
      static/css/
        checkout.css                    # Checkout page styles
    scripts/
      init_db.py                        # Database initialization
      manage_merchants.py               # Merchant CLI management
      test_webhook.py                   # Webhook simulation tool
      healthcheck.py                    # Service health checker
    tests/
      conftest.py                       # Test fixtures + async test client
      test_app.py                       # Root/health endpoint tests
      test_payments.py                  # Payment API tests
      test_callbacks.py                 # Webhook handler tests
      test_merchants.py                 # Merchant API tests
      test_transactions.py              # Transaction endpoint tests
      test_touchpay_service.py          # TouchPay service unit tests
      test_security.py                  # Security utility tests
```

## License

Proprietary - LTC Group
