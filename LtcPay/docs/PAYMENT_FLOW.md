# LtcPay - Payment Flow

This document describes the complete payment flow from merchant integration to settlement.

## Overview

LtcPay acts as an intermediary between merchants and the TouchPay payment gateway. Merchants create payments via API, customers complete payment on a hosted checkout page, and merchants receive webhook notifications when the payment status changes.

## Actors

| Actor      | Description                                                    |
|------------|----------------------------------------------------------------|
| Merchant   | Business that integrates LtcPay to accept payments             |
| Customer   | End-user making the payment (via mobile money or bank card)    |
| LtcPay     | Payment gateway backend (this project)                         |
| TouchPay   | Upstream payment processor (mobile money, bank cards)          |

## Complete Payment Flow

```
 Merchant Server          LtcPay API           Checkout Page         TouchPay
 ===============          ==========           =============         ========

 1. Create Payment
    POST /api/v1/payments
    (X-API-Key + X-API-Secret)
         |
         +--- amount, currency ------->
         |    merchant_reference        2. Create Payment record
         |    customer info                (status = PENDING)
         |    callback_url                 Generate reference
         |    return_url                   Compute fee (1.5%)
         |                                 Generate payment_url
         |<-- payment_id, reference ---
         |    payment_url, status
         |
 3. Redirect customer
    to payment_url
         |
         +-------------------------------->
                                        4. GET /pay/{reference}
                                           Load payment from DB
                                           Render checkout.html
                                           Initialize TouchPay SDK
                                              |
                                              +------- SDK init -------->
                                              |        merchantId
                                              |        amount
                                              |        reference
                                              |
                                        5. Customer selects
                                           payment method
                                           (Orange Money, MTN, Card)
                                              |
                                              +--- pay request -------->
                                              |
                                        6. Customer confirms
                                           on their phone / enters
                                           card details
                                              |
                                              |<--- payment result -----
                                              |
                                        7. Customer redirected
                                           to return_url (or
                                           payment_status.html)
                                              |
         |<---------------------------------  |
         |  (return_url with reference)
         |
                                                                    8. TouchPay sends
                                                                       webhook callback
                                                                         |
                                 9. POST /api/v1/callbacks/touchpay <----+
                                    Verify HMAC signature
                                    Parse callback data
                                    Look up payment by reference
                                    Check idempotency (skip terminal)
                                    Update status atomically
                                    (PENDING -> COMPLETED/FAILED/CANCELLED)
                                         |
                                    10. Fire-and-forget:
                                        Notify merchant webhook
                                         |
         |<------------------------------+
         |  POST to merchant webhook_url
         |  Headers:
         |    X-LtcPay-Signature: <hmac>
         |    X-LtcPay-Event: payment.status_changed
         |  Body:
         |    { event, data: { reference,
         |      status, amount, ... } }
         |
 11. Merchant verifies signature
     Updates order status
     Returns HTTP 2xx
         |
 12. (Optional) Poll payment status
     GET /api/v1/payments/{ref}
         +--- reference --------------->
         |<-- full payment details ----
```

## Step-by-Step Details

### Step 1: Create Payment (Merchant -> LtcPay)

The merchant's backend sends a POST request to create a new payment.

```bash
curl -X POST http://localhost:8001/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ltcpay_live_abc123..." \
  -H "X-API-Secret: your_api_secret" \
  -d '{
    "amount": 5000,
    "currency": "XAF",
    "merchant_reference": "ORDER-1234",
    "description": "Achat sur MonSite.com",
    "customer_name": "Jean Dupont",
    "customer_phone": "237670000000",
    "callback_url": "https://monsite.com/ltcpay-webhook",
    "return_url": "https://monsite.com/commande/1234/merci"
  }'
```

**Validation rules:**
- `amount`: Must be > 0 and >= 100 XAF (minimum). Max 5,000,000.
- `currency`: Must be one of `XAF`, `XOF`, `EUR`, `USD`.
- Authentication: Both `X-API-Key` and `X-API-Secret` headers are required.

### Step 2: Payment Record Created

LtcPay creates a `Payment` record in PostgreSQL:
- Generates a unique `reference` (e.g., `PAY-A1B2C3D4E5F67890`)
- Computes `fee` at 1.5% of the amount
- Sets `status = PENDING`
- Sets `expires_at` to 30 minutes from now
- Generates `payment_url` pointing to `/pay/{reference}`

### Step 3: Redirect Customer

The merchant redirects the customer's browser to the `payment_url` returned in Step 1.

### Step 4: Checkout Page

LtcPay serves an HTML page at `GET /pay/{reference}` that:
- Loads the payment details from the database
- Renders the TouchPay JavaScript SDK in a container
- Displays payment amount and description

If the payment is no longer PENDING (already completed, failed, etc.), a status page is shown instead.

### Step 5-6: Customer Pays

The customer interacts with the TouchPay SDK:
1. Selects a payment method (Orange Money, MTN Mobile Money, bank card)
2. Enters their phone number or card details
3. Confirms the payment on their device (USSD prompt for mobile money)

### Step 7: Customer Redirected

After payment, the customer is redirected to:
- The `return_url` provided by the merchant (if set), or
- A built-in LtcPay status page showing the payment result

### Step 8-9: TouchPay Callback

TouchPay sends a POST webhook to `POST /api/v1/callbacks/touchpay` with the payment result.

**LtcPay processing:**
1. Reads raw request body for signature verification
2. Verifies `X-TouchPay-Signature` header (HMAC-SHA256)
3. Parses the callback data (supports multiple field name formats)
4. Looks up the `Payment` by reference
5. **Idempotency check:** If payment is already in a terminal state (COMPLETED, FAILED, CANCELLED), returns OK without changes
6. Maps TouchPay status to LtcPay status:
   - `success/successful/completed/approved` -> `COMPLETED`
   - `failed/error/declined/rejected` -> `FAILED`
   - `cancelled/canceled` -> `CANCELLED`
7. Updates payment atomically (optimistic lock on current status)
8. Sets `completed_at` timestamp for COMPLETED payments

### Step 10: Merchant Notification

For terminal statuses, LtcPay sends an async webhook notification to the merchant:

**Headers:**
```
Content-Type: application/json
X-LtcPay-Signature: <hmac-sha256-of-body-using-webhook-secret>
X-LtcPay-Event: payment.status_changed
X-LtcPay-Delivery-Id: PAY-xxx-1712044800
User-Agent: LtcPay-Webhook/1.0
```

**Body:**
```json
{
  "event": "payment.status_changed",
  "data": {
    "payment_id": "a1b2c3d4-...",
    "reference": "PAY-A1B2C3D4E5F67890",
    "merchant_reference": "ORDER-1234",
    "provider_transaction_id": "TP-98765",
    "amount": 5000.0,
    "fee": 75.0,
    "currency": "XAF",
    "status": "COMPLETED",
    "method": "MOBILE_MONEY",
    "customer_name": "Jean Dupont",
    "customer_phone": "237670000000",
    "completed_at": "2026-04-02T12:05:00+00:00",
    "created_at": "2026-04-02T12:00:00+00:00"
  },
  "timestamp": "2026-04-02T12:05:01+00:00"
}
```

**Retry policy:**
- Up to 5 delivery attempts
- Exponential backoff: 2s, 4s, 8s, 16s, 32s
- A delivery is considered successful if the merchant returns HTTP 2xx

### Step 11: Merchant Processes Webhook

The merchant should:
1. Verify the `X-LtcPay-Signature` using their `webhook_secret`
2. Check the `status` field in the payload
3. Update the order in their system
4. Return HTTP 200 to acknowledge receipt

**Python verification example:**
```python
import hmac, hashlib, json

def handle_ltcpay_webhook(request):
    payload = request.body  # raw bytes
    signature = request.headers.get("X-LtcPay-Signature")

    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        return Response(status=401)  # Invalid signature

    data = json.loads(payload)
    payment_status = data["data"]["status"]
    order_ref = data["data"]["merchant_reference"]

    if payment_status == "COMPLETED":
        mark_order_paid(order_ref)
    elif payment_status == "FAILED":
        mark_order_failed(order_ref)

    return Response(status=200)
```

### Step 12: Status Polling (Optional)

The merchant can also poll the payment status as a fallback:

```bash
curl http://localhost:8001/api/v1/payments/PAY-A1B2C3D4E5F67890 \
  -H "X-API-Key: ltcpay_live_abc123..." \
  -H "X-API-Secret: your_api_secret"
```

## Payment States

```
                  +----------+
                  |  PENDING  |
                  +-----+----+
                        |
           +------------+------------+
           |            |            |
           v            v            v
     +-----------+ +---------+ +-----------+
     | COMPLETED | | FAILED  | | CANCELLED |
     +-----------+ +---------+ +-----------+
           |
           v
     +-----------+
     | REFUNDED  |
     +-----------+

     After PAYMENT_LINK_EXPIRY_MINUTES (default: 30):
     PENDING -> EXPIRED
```

| Status      | Description                                          |
|-------------|------------------------------------------------------|
| `PENDING`   | Payment created, waiting for customer action         |
| `COMPLETED` | Payment successfully processed                       |
| `FAILED`    | Payment was declined or encountered an error         |
| `CANCELLED` | Payment was cancelled by the customer or merchant    |
| `EXPIRED`   | Payment link expired without action                  |
| `REFUNDED`  | Payment was refunded after completion                |

## Security

### Webhook Signature Verification

All webhooks (both from TouchPay and to merchants) use **HMAC-SHA256** signatures:

- **TouchPay -> LtcPay:** Verified using `TOUCHPAY_SECRET` configuration
- **LtcPay -> Merchant:** Signed using the merchant's `webhook_secret`

In production, missing or invalid signatures cause the webhook to be rejected (HTTP 401).

### API Authentication

Merchant API endpoints use dual-header authentication:
- `X-API-Key`: Public key for merchant lookup
- `X-API-Secret`: Secret key verified against bcrypt hash

### Idempotency

The callback handler is idempotent:
- Duplicate callbacks for already-processed payments return success without changes
- Atomic status updates use optimistic locking to prevent race conditions

## Fee Structure

| Component       | Rate / Value     |
|-----------------|------------------|
| Platform fee    | 1.5% of amount   |
| Min payment     | 100 XAF          |
| Max payment     | 5,000,000 XAF    |
| Link expiry     | 30 minutes        |

## Error Handling

| HTTP Code | Scenario                                      |
|-----------|-----------------------------------------------|
| 400       | Invalid request (missing fields, bad amount)  |
| 401       | Missing or invalid API credentials            |
| 403       | Merchant account deactivated                  |
| 404       | Payment not found                             |
| 409       | Duplicate merchant email                      |
| 422       | Request validation failure                    |
| 500       | Internal server error                         |
