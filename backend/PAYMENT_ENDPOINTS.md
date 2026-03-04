# Payment API Endpoints

## Overview

The payment system supports two methods:
- **Mobile Money** (S3P): MTN Mobile Money and Orange Money via Smobilpay
- **E-nkap**: Multi-channel payments (cards + mobile money)

## Endpoints

### 1. Initiate Payment

**POST** `/api/v1/payments/initiate`

Initiates a payment for card top-up.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "method": "mobile_money",  // or "enkap"
  "amount": 5000,            // Amount in XAF
  "card_id": "uuid",         // Card to top up
  "phone": "691234567",      // Required for mobile_money, optional for enkap
  "customer_name": "John",   // Required for enkap
  "customer_email": "j@m.com" // Required for enkap
}
```

**Response (Mobile Money):**
```json
{
  "success": true,
  "transaction_id": "uuid",
  "payment_reference": "99999...",  // PTN
  "message": "Please confirm payment on your phone"
}
```

**Response (E-nkap):**
```json
{
  "success": true,
  "transaction_id": "uuid",
  "payment_reference": "order_id",
  "payment_url": "https://...",
  "message": "Redirect to payment page"
}
```

### 2. Check Payment Status

**GET** `/api/v1/payments/status/{transaction_id}`

Gets the current status of a payment transaction. Automatically checks with the provider if status is PENDING.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "transaction_id": "uuid",
  "status": "COMPLETED",  // PENDING, COMPLETED, FAILED, CANCELLED
  "amount": 5000.00,
  "currency": "XAF",
  "payment_reference": "99999...",
  "message": null  // Error message if failed
}
```

### 3. S3P Webhook

**POST** `/api/v1/payments/webhook/s3p`

Receives payment notifications from S3P/Smobilpay.

**Request Body:**
```json
{
  "ptn": "99999...",
  "trid": "LTC-...",
  "status": "SUCCESS",  // or FAILED, ERRORED
  "amount": 5000,
  ...
}
```

### 4. E-nkap Webhook

**POST** `/api/v1/payments/webhook/enkap`

Receives payment notifications from E-nkap.

**Headers:**
- `X-Enkap-Signature: <hmac-sha256>` (optional, verified if present)

**Request Body:**
```json
{
  "order_id": "...",
  "merchant_reference": "LTC-...",
  "status": "COMPLETED",  // or FAILED, CANCELLED
  "amount": 5000,
  ...
}
```

## Payment Flow

### Mobile Money (S3P)

1. Client calls `POST /payments/initiate` with phone number
2. Backend creates Transaction with `status=PENDING`
3. Backend calls S3P to initiate payment
4. S3P sends push notification to customer's phone
5. Customer confirms on their mobile money app
6. S3P calls webhook with payment result
7. Backend updates Transaction to `COMPLETED` and adds amount to card balance

**Alternative:** Client can poll `GET /payments/status/{id}` to check status

### E-nkap

1. Client calls `POST /payments/initiate` with customer info
2. Backend creates Transaction with `status=PENDING`
3. Backend calls E-nkap to create order
4. Client redirects user to `payment_url`
5. User completes payment on E-nkap page
6. E-nkap calls webhook with payment result
7. Backend updates Transaction to `COMPLETED` and adds amount to card balance

**Alternative:** Client can poll `GET /payments/status/{id}` to check status

## Error Codes

### S3P Error Codes (French)

See `app/services/s3p.py` for complete list of error codes and messages.

Common errors:
- `703202`: User rejected transaction
- `703108`: Insufficient Orange Money balance
- `704005`: MTN transaction failed
- `40010`: Invalid phone number
- `40030`: Insufficient Mobile Money balance

### HTTP Error Codes

- `400`: Bad request (invalid parameters, payment failed)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (KYC not approved, etc.)
- `404`: Not found (card or transaction not found)
- `500`: Internal server error

## Configuration

Payment credentials are configured in `app/config.py`:

### S3P
- `s3p_api_url`: S3P API base URL
- `s3p_api_key`: API key for authentication
- `s3p_api_secret`: Secret for HMAC-SHA1 signature
- `s3p_merchant_id`: Optional merchant ID

### E-nkap
- `enkap_api_url`: E-nkap API base URL
- `enkap_consumer_key`: OAuth2 consumer key
- `enkap_consumer_secret`: OAuth2 consumer secret
- `enkap_merchant_code`: Optional merchant code

## Database Models

### Transaction

```python
{
  "id": uuid,
  "card_id": uuid,
  "user_id": uuid,
  "amount": Decimal,
  "currency": "XAF",
  "type": "TOPUP",  // TOPUP, WITHDRAW, PURCHASE, REFUND
  "status": "PENDING",  // PENDING, COMPLETED, FAILED, CANCELLED
  "description": "Top-up via mobile_money",
  "provider_transaction_id": "LTC-...",
  "metadata": {
    "payment_method": "mobile_money",
    "phone": "691234567",
    "ptn": "99999...",
    "trid": "LTC-...",
    ...
  },
  "created_at": datetime,
  "updated_at": datetime
}
```

## Testing

### Test Mobile Money Payment

```bash
curl -X POST http://localhost:8000/api/v1/payments/initiate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "mobile_money",
    "amount": 1000,
    "card_id": "<card-uuid>",
    "phone": "691234567"
  }'
```

### Test E-nkap Payment

```bash
curl -X POST http://localhost:8000/api/v1/payments/initiate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "enkap",
    "amount": 5000,
    "card_id": "<card-uuid>",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "phone": "691234567"
  }'
```

### Check Status

```bash
curl http://localhost:8000/api/v1/payments/status/<transaction-uuid> \
  -H "Authorization: Bearer <token>"
```
