/**
 * S3P (Smobilpay) Payment Integration
 * For Mobile Money payments (MTN, Orange Money)
 *
 * Flow: GET /cashout → POST /quotestd → POST /collectstd → GET /verifytx
 */

import crypto from 'crypto';

// S3P Production Configuration
const S3P_CONFIG = {
  BASE_URL: 'https://s3pv2cm.smobilpay.com/v2',
  API_KEY: '9183eee1-bf8b-49cb-bffc-d466706d3aef',
  API_SECRET: 'c5821829-a9db-4cf1-9894-65e3caffaa62',
};

// Service IDs
export const S3P_SERVICES = {
  ORANGE_MONEY: '30056',
  MTN_MOMO: '20056',
} as const;

export type S3PServiceId = typeof S3P_SERVICES[keyof typeof S3P_SERVICES];

type S3PHeaders = Record<string, string>;

interface S3PQuoteResponse {
  quoteid: string;
  status: string;
  amount: number;
  fee: number;
  total: number;
  expiresAt: string;
}

interface S3PCollectResponse {
  ptn: string;
  status: string;
  message: string;
}

interface S3PVerifyResponse {
  ptn: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'ERRORED';
  amount: number;
  errorMessage?: string;
}

/**
 * Generate S3P authentication headers with HMAC-SHA1 signature
 */
function generateS3PHeaders(method: string, endpoint: string, body?: object): S3PHeaders {
  const nonce = Date.now().toString();

  // Build signature string: method + endpoint + nonce + body (if present)
  let signatureString = `${method}${endpoint}${nonce}`;
  if (body) {
    signatureString += JSON.stringify(body);
  }

  // Generate HMAC-SHA1 signature
  const signature = crypto
    .createHmac('sha1', S3P_CONFIG.API_SECRET)
    .update(signatureString)
    .digest('base64');

  return {
    'x-api-key': S3P_CONFIG.API_KEY,
    'x-api-nonce': nonce,
    'x-api-signature': signature,
    'Content-Type': 'application/json',
  };
}

/**
 * Format phone number for S3P (without country code)
 * S3P expects: 6XXXXXXXX (9 digits starting with 6)
 */
export function formatPhoneForS3P(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Remove country code if present
  if (cleaned.startsWith('237')) {
    cleaned = cleaned.slice(3);
  }

  // Ensure it starts with 6
  if (!cleaned.startsWith('6')) {
    throw new Error('Invalid Cameroon phone number. Must start with 6.');
  }

  return cleaned;
}

/**
 * Detect payment service based on phone number
 */
export function detectService(phone: string): S3PServiceId {
  const cleaned = formatPhoneForS3P(phone);
  const prefix = cleaned.substring(0, 2);

  // MTN prefixes: 67, 68, 65, 66, 69
  const mtnPrefixes = ['65', '66', '67', '68', '69'];

  // Orange prefixes: 69, 65 (shared), 655-659, 690-699
  const orangePrefixes = ['69', '65'];

  // More specific detection
  if (cleaned.startsWith('67') || cleaned.startsWith('68')) {
    return S3P_SERVICES.MTN_MOMO;
  }
  if (cleaned.startsWith('69')) {
    return S3P_SERVICES.ORANGE_MONEY;
  }
  if (cleaned.startsWith('65') || cleaned.startsWith('66')) {
    // 65 and 66 are typically MTN
    return S3P_SERVICES.MTN_MOMO;
  }

  // Default to MTN for other 6XX numbers
  return S3P_SERVICES.MTN_MOMO;
}

/**
 * Step 1: Get available services (cashout)
 */
export async function getServices(): Promise<unknown> {
  const endpoint = '/cashout';
  const url = `${S3P_CONFIG.BASE_URL}${endpoint}`;
  const headers = generateS3PHeaders('GET', endpoint);

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`S3P getServices failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Step 2: Create a quote for the payment
 */
export async function createQuote(
  serviceId: S3PServiceId,
  amount: number,
  phone: string
): Promise<S3PQuoteResponse> {
  const endpoint = '/quotestd';
  const url = `${S3P_CONFIG.BASE_URL}${endpoint}`;

  const body = {
    serviceid: serviceId,
    amount: amount,
    payItemId: phone, // Phone number without country code
  };

  const headers = generateS3PHeaders('POST', endpoint, body);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`S3P createQuote failed: ${error}`);
  }

  return response.json();
}

/**
 * Step 3: Initiate payment collection
 */
export async function collectPayment(
  quoteId: string,
  phone: string,
  externalRef: string
): Promise<S3PCollectResponse> {
  const endpoint = '/collectstd';
  const url = `${S3P_CONFIG.BASE_URL}${endpoint}`;

  const body = {
    quoteid: quoteId,
    customerPhonenumber: phone, // Without country code
    customerEmailaddress: '', // Optional
    customerName: '', // Optional
    customerAddress: '', // Optional
    customerNumber: '', // Optional
    serviceNumber: phone, // The number to charge
    trid: externalRef, // Our transaction reference
  };

  const headers = generateS3PHeaders('POST', endpoint, body);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`S3P collectPayment failed: ${error}`);
  }

  return response.json();
}

/**
 * Step 4: Verify transaction status
 */
export async function verifyTransaction(ptn: string): Promise<S3PVerifyResponse> {
  const endpoint = `/verifytx?ptn=${ptn}`;
  const url = `${S3P_CONFIG.BASE_URL}${endpoint}`;
  const headers = generateS3PHeaders('GET', endpoint);

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`S3P verifyTransaction failed: ${error}`);
  }

  return response.json();
}

/**
 * Complete S3P payment flow
 */
export async function initiateS3PPayment(
  amount: number,
  phone: string,
  orderRef: string
): Promise<{
  success: boolean;
  ptn?: string;
  status?: string;
  message?: string;
  error?: string;
}> {
  try {
    // Format phone number
    const formattedPhone = formatPhoneForS3P(phone);

    // Detect service
    const serviceId = detectService(phone);

    // Create quote
    const quote = await createQuote(serviceId, amount, formattedPhone);

    if (!quote.quoteid) {
      return {
        success: false,
        error: 'Failed to create payment quote',
      };
    }

    // Initiate collection
    const collection = await collectPayment(quote.quoteid, formattedPhone, orderRef);

    return {
      success: true,
      ptn: collection.ptn,
      status: collection.status,
      message: collection.message,
    };
  } catch (error) {
    console.error('S3P payment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment initiation failed',
    };
  }
}
