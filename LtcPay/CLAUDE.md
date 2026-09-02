# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is LtcPay

A payment gateway built on TouchPay for Central African mobile money (Orange Money, MTN Money) and bank cards. XAF/XOF currencies. Two sub-projects:

- **`backend/`** — FastAPI payment API + TouchPay integration
- **`WebLTcPay/`** — Next.js merchant dashboard

## Development Commands

### Docker (full stack)

```bash
docker-compose up -d                              # Start all: backend, db, redis, web
docker-compose up -d --force-recreate backend      # Reload backend code changes
docker-compose logs -f backend                     # Tail backend logs
docker-compose down -v                             # Stop + wipe volumes
```

`docker-compose restart` does NOT pick up code changes — always use `--force-recreate`.

**Do not move `docker-compose.yml`.** Dokploy deploys it in place, with
`--env-file LtcPay/.env -f LtcPay/docker-compose.yml` and no `--project-directory`,
so Compose derives the project directory from the file's own location — which is
what makes `./backend` and `./WebLTcPay` resolve. Moving the file to the repo root
breaks both the build contexts and the `.env` lookup, and every `${VAR:-default}`
then silently falls back (WEBHOOK_BASE_URL becomes http://localhost:8001, all
secrets empty). Dokploy changed this invocation twice on 2026-09-01/02, so if a
deploy suddenly fails, read the command it printed before touching the repo.

Backend source is volume-mounted (`./backend/app:/app/app`), so file edits are visible inside the container after recreate.

**Ports:** Backend :8001, Web :3000, Postgres :5437, Redis :6383

### Backend (local)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env                  # Then edit .env
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Backend tests

```bash
cd backend
pip install -r requirements-test.txt
pytest                                # All tests
pytest tests/test_payments.py         # Single file
pytest tests/test_payments.py::test_create_payment -v  # Single test
pytest --lf                           # Re-run last failures
```

pytest.ini sets `asyncio_mode = auto`, so async tests work without explicit markers.

### Web dashboard

```bash
cd WebLTcPay
npm install
npm run dev           # Dev server on :3000
npm run build         # Production build
npm run lint          # ESLint
npm run type-check    # tsc --noEmit
npm test              # Jest
```

### Database migrations (Alembic)

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1
```

### Admin scripts

```bash
cd backend
python scripts/init_db.py --seed                          # Create tables + seed demo merchant
python scripts/manage_merchants.py list                   # List merchants
python scripts/manage_merchants.py create --name "X" --email "x@y.com"
python scripts/manage_merchants.py rotate-keys --email "x@y.com"
python scripts/test_webhook.py --reference PAY-XXXX --status success  # Simulate callback
python scripts/healthcheck.py                             # Check API + DB + Redis
```

## Architecture

### Payment flow

1. Merchant → `POST /api/v1/payments` (API Key + Secret auth) → gets `payment_url`
2. Customer visits `/pay/{reference}` → rendered checkout page loads TouchPay JS SDK
3. SDK calls `sendPaymentInfos()` which opens TouchPay's payment UI
4. TouchPay sends callback to `/api/v1/callbacks/touchpay` (or `/webhooks/touchpay/callback`)
5. Backend validates callback, updates payment status, sends POST to merchant's `webhook_url`

### Backend layout

- **`app/main.py`** — FastAPI app, lifespan (DB init, admin seed), checkout page route (`/pay/{ref}`), static files
- **`app/core/config.py`** — Pydantic `Settings` loaded from env. Has uppercase TouchPay SDK fields and lowercase legacy aliases with sync logic in `validate_secrets`
- **`app/core/database.py`** — SQLAlchemy async engine + `async_session()` context manager
- **`app/core/security.py`** — HMAC signing, API key generation, JWT handling
- **`app/api/v1/router.py`** — Aggregates all route modules under `/api/v1`
- **`app/api/v1/payments.py`** — Merchant-facing payment CRUD (API key auth)
- **`app/api/v1/merchants.py`** — Merchant registration + management
- **`app/api/v1/auth.py`** — Admin dashboard JWT auth (login/register)
- **`app/api/v1/dashboard.py`** — Dashboard statistics endpoints
- **`app/api/v1/endpoints/callbacks.py`** — TouchPay webhook receiver
- **`app/api/v1/endpoints/payments.py`** — Direct checkout flow endpoints
- **`app/api/v1/endpoints/transactions.py`** — Transaction management
- **`app/services/touchpay_service.py`** — Builds SDK config for checkout template, verifies transactions via TouchPay API
- **`app/services/notification.py`** — Merchant webhook delivery with exponential backoff (5 retries)
- **`app/templates/checkout.html`** — Jinja2 template embedding TouchPay JS SDK

### Two TouchPay integration modes

1. **SDK mode** (browser-side): `sendPaymentInfos()` from `prod_touchpay-0.0.1.js` on `touchpay.gutouch.net`
2. **Direct API** (server-to-server): `apidist.gutouch.net/apidist/sec/touchpayapi` with agency code + login/password auth. Service codes: `PAIEMENTMARCHAND_MTN_CM` (MTN), `CM_PAIEMENTMARCHAND_OM_TP` (Orange)

### Web dashboard layout

- **Next.js 14 App Router** with TypeScript + TailwindCSS
- **`lib/api.ts`** — Axios instance with request interceptor (dynamic base URL, Bearer token from cookie) and 401 redirect
- **`services/`** — Domain service modules (`auth.service.ts`, `payments.service.ts`, `dashboard.service.ts`)
- **`app/(dashboard)/`** — Protected route group (api-keys, payments, profile, docs)
- **`app/auth/`** — Public auth pages (login, register, forgot-password)
- **State**: Zustand; **Forms**: React Hook Form + Zod; **Charts**: Recharts

### Auth patterns

- **Merchant API**: `X-API-Key` + `X-API-Secret` headers
- **Admin dashboard**: JWT Bearer token (login via `/api/v1/auth/login`)
- **Web dashboard**: Token stored in `js-cookie`, auto-cleared on 401
- **Webhook signatures**: HMAC-SHA256 (`X-LtcPay-Signature` for merchant webhooks, `X-TouchPay-Signature` for TouchPay callbacks)

## Key gotchas

- TouchPay returns HTTP 200 for business errors — check `status` field in JSON body, not HTTP status
- `TOUCHPAY_SECRET` doubles as `TOUCHPAY_SECURE_CODE` via fallback in `config.py` `validate_secrets`
- Config has both uppercase (`TOUCHPAY_MERCHANT_ID`) and lowercase (`touchpay_merchant_id`) field variants that are synced — prefer uppercase when adding new TouchPay settings
- `sendPaymentInfos` — lowercase 's' at the end
- SDK domain is `.gutouch.net` not `.gutouch.com`
- `payment_token` param in SDK expects a simple reference string (`PAY-xxx`), not a JWT
- On startup, `main.py` auto-creates a default admin user if none exists
- Interactive API docs at `/docs` (Swagger) and `/redoc`
