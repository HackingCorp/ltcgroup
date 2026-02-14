/**
 * E-nkap Payment Integration
 * For multi-channel payments (cards + mobile money)
 *
 * Flow: POST /token → POST /order → redirect to paymentUrl → webhook
 */

// E-nkap Production Configuration
const ENKAP_CONFIG = {
  BASE_URL: 'https://api-v2.enkap.cm',
  CONSUMER_KEY: 'wXRF_8iU7h9UNiBG4zNYFdCQPwga',
  CONSUMER_SECRET: 'rD9fRGJkVVs8TZtfjJ0VTD7taOsa',
};

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

interface EnkapTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface EnkapOrderResponse {
  status: string;
  order_id: string;
  order_transaction_id: string;
  redirect_url: string;
}

interface EnkapOrderStatus {
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  order_id: string;
  merchant_reference: string;
  amount: number;
  currency: string;
  payment_method?: string;
  completed_at?: string;
}

/**
 * Format phone number for E-nkap (with country code)
 * E-nkap expects: 237XXXXXXXXX (12 digits with 237 prefix)
 */
export function formatPhoneForEnkap(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Add country code if not present
  if (cleaned.startsWith('6') || cleaned.startsWith('2')) {
    if (!cleaned.startsWith('237')) {
      cleaned = '237' + cleaned;
    }
  }

  // Validate length (should be 12 digits: 237 + 9 digits)
  if (cleaned.length !== 12) {
    throw new Error('Invalid phone number format for E-nkap');
  }

  return cleaned;
}

/**
 * Get OAuth2 access token (with caching)
 */
async function getAccessToken(): Promise<string> {
  // Check cache
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const url = `${ENKAP_CONFIG.BASE_URL}/token`;

  // Basic Auth header
  const credentials = Buffer.from(
    `${ENKAP_CONFIG.CONSUMER_KEY}:${ENKAP_CONFIG.CONSUMER_SECRET}`
  ).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`E-nkap authentication failed: ${error}`);
  }

  const data: EnkapTokenResponse = await response.json();

  // Cache token (with 5 minute buffer before expiry)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  return data.access_token;
}

/**
 * Create payment order
 */
export async function createOrder(params: {
  amount: number;
  currency?: string;
  description: string;
  merchantReference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  notificationUrl: string;
}): Promise<EnkapOrderResponse> {
  const token = await getAccessToken();

  const url = `${ENKAP_CONFIG.BASE_URL}/api/order`;

  const body = {
    merchant_reference: params.merchantReference,
    amount: params.amount,
    currency: params.currency || 'XAF',
    description: params.description,
    customer: {
      name: params.customerName,
      email: params.customerEmail,
      phone: formatPhoneForEnkap(params.customerPhone),
    },
    return_url: params.returnUrl,
    notification_url: params.notificationUrl,
    lang: 'fr',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`E-nkap createOrder failed: ${error}`);
  }

  return response.json();
}

/**
 * Get order status
 */
export async function getOrderStatus(orderId: string): Promise<EnkapOrderStatus> {
  const token = await getAccessToken();

  const url = `${ENKAP_CONFIG.BASE_URL}/api/order/${orderId}/status`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`E-nkap getOrderStatus failed: ${error}`);
  }

  return response.json();
}

/**
 * Complete E-nkap payment flow - initiates payment and returns redirect URL
 */
export async function initiateEnkapPayment(params: {
  amount: number;
  orderRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description?: string;
}): Promise<{
  success: boolean;
  orderId?: string;
  transactionId?: string;
  paymentUrl?: string;
  error?: string;
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ltcgroup.site';

    const order = await createOrder({
      amount: params.amount,
      description: params.description || `Commande LTC Finance - ${params.orderRef}`,
      merchantReference: params.orderRef,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      returnUrl: `${baseUrl}/services/solutions-financieres/payment/callback`,
      notificationUrl: `${baseUrl}/api/payments/webhook`,
    });

    if (!order.redirect_url) {
      return {
        success: false,
        error: 'No payment URL returned',
      };
    }

    return {
      success: true,
      orderId: order.order_id,
      transactionId: order.order_transaction_id,
      paymentUrl: order.redirect_url,
    };
  } catch (error) {
    console.error('E-nkap payment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment initiation failed',
    };
  }
}

/**
 * Verify E-nkap webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  // E-nkap webhook signature verification
  // The signature is typically HMAC-SHA256 of the payload
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', ENKAP_CONFIG.CONSUMER_SECRET)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}
