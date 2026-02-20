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
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 2,
};

// Service IDs
export const S3P_SERVICES = {
  ORANGE_MONEY: '30056',
  MTN_MOMO: '20056',
} as const;

export type S3PServiceId = typeof S3P_SERVICES[keyof typeof S3P_SERVICES];

type S3PHeaders = Record<string, string>;

interface S3PQuoteResponse {
  quoteId: string;
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

interface S3PServiceResponse {
  serviceid: string;
  payItemId: string;
  name: string;
  [key: string]: unknown;
}

interface S3PErrorResponse {
  respCode: number;
  devMsg: string;
  usrMsg: string;
}

/**
 * Map S3P error codes to user-friendly messages in French
 * Based on official S3P documentation
 */
function mapS3PError(respCode: number, devMsg: string = ''): string {
  const errorMap: Record<number, string> = {
    // Success
    0: 'Paiement réussi.',

    // Orange Money transaction errors
    703202: 'Vous avez rejeté la transaction. Veuillez réessayer si vous souhaitez continuer.',
    703108: 'Solde insuffisant sur votre compte Orange Money.',
    703201: 'La transaction n\'a pas été confirmée à temps. Veuillez réessayer.',
    703000: 'La transaction Orange Money a échoué. Veuillez réessayer.',

    // MTN Mobile Money transaction errors
    704005: 'La transaction MTN Mobile Money a échoué. Veuillez réessayer.',

    // API/Auth errors
    4000: 'Erreur de connexion au service de paiement. Veuillez réessayer.',
    50002: 'Le service de paiement est temporairement en maintenance. Veuillez réessayer plus tard.',
    50001: 'Le service de paiement est temporairement indisponible. Veuillez réessayer plus tard.',
    40001: 'Erreur technique. Veuillez contacter le support.',
    40010: 'Le numéro de téléphone fourni est invalide.',
    40030: 'Solde insuffisant sur votre compte Mobile Money.',
    40031: 'Le montant dépasse la limite autorisée pour cette transaction.',
    40020: 'Transaction en cours de traitement. Veuillez patienter.',
    40021: 'Cette transaction a déjà été effectuée.',
    40040: 'Le service de paiement sélectionné n\'est pas disponible.',

    // Quote/Merchant errors
    40302: 'Service de paiement temporairement indisponible. Veuillez réessayer dans quelques minutes.',
    40301: 'La demande de paiement a expiré. Veuillez recommencer.',
    40303: 'Montant invalide pour ce service de paiement.',
    40304: 'Le service de paiement n\'est pas disponible pour ce numéro.',
    40305: 'Limite de transactions atteinte. Veuillez réessayer plus tard.',
  };

  return errorMap[respCode] || `Une erreur de paiement est survenue. (Code: ${respCode})`;
}

/**
 * Parse S3P error response and return user-friendly message
 */
function parseS3PError(errorText: string): string {
  try {
    const errorData: S3PErrorResponse = JSON.parse(errorText);
    return mapS3PError(errorData.respCode, errorData.devMsg);
  } catch {
    return `Erreur de paiement: ${errorText}`;
  }
}

/**
 * Fetch with timeout and retry
 */
async function s3pFetch(
  url: string,
  options: RequestInit,
  retries: number = S3P_CONFIG.MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), S3P_CONFIG.TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError.name === 'AbortError') {
        lastError = new Error('Le service de paiement ne répond pas. Veuillez réessayer.');
      }
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
      }
    }
  }
  throw lastError || new Error('Service de paiement indisponible');
}

/**
 * URL encode a string according to RFC 3986
 */
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

/**
 * Generate S3P authentication headers with HMAC-SHA1 signature
 * Format: s3pAuth, s3pAuth_timestamp="...", s3pAuth_signature="...", s3pAuth_nonce="...", s3pAuth_signature_method="HMAC-SHA1", s3pAuth_token="..."
 */
function generateS3PHeaders(method: string, url: string, params: Record<string, unknown> = {}): S3PHeaders {
  const timestamp = Date.now();
  const nonce = Date.now();
  const signatureMethod = 'HMAC-SHA1';

  // S3P authentication parameters
  const s3pParams: Record<string, unknown> = {
    s3pAuth_nonce: nonce,
    s3pAuth_timestamp: timestamp,
    s3pAuth_signature_method: signatureMethod,
    s3pAuth_token: S3P_CONFIG.API_KEY,
  };

  // Merge all parameters
  const allParams: Record<string, unknown> = { ...params, ...s3pParams };

  // Clean and trim values
  const cleanedParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(allParams)) {
    if (value !== null && value !== undefined) {
      if (typeof value === 'string') {
        cleanedParams[key] = value.trim();
      } else {
        cleanedParams[key] = String(value);
      }
    }
  }

  // Sort alphabetically
  const sortedKeys = Object.keys(cleanedParams).sort();
  const sortedParams: Record<string, string> = {};
  for (const key of sortedKeys) {
    sortedParams[key] = cleanedParams[key];
  }

  // Create parameter string
  const parameterString = Object.entries(sortedParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  // Create base string: METHOD&URL_ENCODED(url)&URL_ENCODED(parameterString)
  const baseString = `${method}&${percentEncode(url)}&${percentEncode(parameterString)}`;

  // Generate HMAC-SHA1 signature
  const signature = crypto
    .createHmac('sha1', S3P_CONFIG.API_SECRET)
    .update(baseString)
    .digest('base64');

  // Create Authorization header
  const authHeader = `s3pAuth, s3pAuth_timestamp="${timestamp}", s3pAuth_signature="${signature}", s3pAuth_nonce="${nonce}", s3pAuth_signature_method="${signatureMethod}", s3pAuth_token="${S3P_CONFIG.API_KEY}"`;

  return {
    'Authorization': authHeader,
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

  // More specific detection based on Cameroon prefixes
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
 * Step 1: Get available services and payItemId
 */
export async function getServices(serviceId: S3PServiceId): Promise<S3PServiceResponse[]> {
  const endpoint = '/cashout';
  const url = `${S3P_CONFIG.BASE_URL}${endpoint}`;
  const params = { serviceid: serviceId };
  const headers = generateS3PHeaders('GET', url, params);

  const urlWithParams = `${url}?serviceid=${serviceId}`;

  const response = await s3pFetch(urlWithParams, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(parseS3PError(error));
  }

  return response.json();
}

/**
 * Step 2: Create a quote for the payment
 */
export async function createQuote(
  payItemId: string,
  amount: number
): Promise<S3PQuoteResponse> {
  const endpoint = '/quotestd';
  const url = `${S3P_CONFIG.BASE_URL}${endpoint}`;

  const body = {
    payItemId: payItemId,
    amount: amount,
  };

  const headers = generateS3PHeaders('POST', url, body);

  const response = await s3pFetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(parseS3PError(error));
  }

  return response.json();
}

/**
 * Step 3: Initiate payment collection
 */
export async function collectPayment(
  quoteId: string,
  serviceNumber: string,
  externalRef: string,
  customerName?: string
): Promise<S3PCollectResponse> {
  const endpoint = '/collectstd';
  const url = `${S3P_CONFIG.BASE_URL}${endpoint}`;

  const body: Record<string, string> = {
    quoteId: quoteId,
    customerPhonenumber: '237691371922', // Notification number
    customerEmailaddress: 'lontsi05@gmail.com',
    customerName: customerName || 'Client LTC Finance',
    customerAddress: 'Cameroun',
    serviceNumber: serviceNumber, // Customer's phone to charge (without 237)
    trid: externalRef,
  };

  const headers = generateS3PHeaders('POST', url, body);

  const response = await s3pFetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(parseS3PError(error));
  }

  return response.json();
}

/**
 * Step 4: Verify transaction status
 */
export async function verifyTransaction(transactionRef: string): Promise<S3PVerifyResponse> {
  const endpoint = '/verifytx';
  const url = `${S3P_CONFIG.BASE_URL}${endpoint}`;

  // S3P accepts either trid or ptn
  const params = transactionRef.startsWith('99999')
    ? { ptn: transactionRef }
    : { trid: transactionRef };

  const headers = generateS3PHeaders('GET', url, params);

  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const urlWithParams = `${url}?${queryString}`;

  const response = await s3pFetch(urlWithParams, {
    method: 'GET',
    headers,
  }, 1); // Only 1 retry for verification (called frequently by polling)

  if (!response.ok) {
    const error = await response.text();
    throw new Error(parseS3PError(error));
  }

  // S3P returns an array of transactions
  const data = await response.json();
  const transaction = Array.isArray(data) ? data[0] : data;

  if (!transaction) {
    throw new Error('Transaction non trouvée');
  }

  return {
    ptn: transaction.ptn,
    status: transaction.status,
    amount: parseFloat(transaction.priceLocalCur) || 0,
    errorMessage: transaction.errorCode ? mapS3PError(transaction.errorCode) : undefined,
  };
}

/**
 * Complete S3P payment flow
 */
export async function initiateS3PPayment(
  amount: number,
  phone: string,
  orderRef: string,
  customerName?: string
): Promise<{
  success: boolean;
  ptn?: string;
  trid?: string;
  status?: string;
  message?: string;
  error?: string;
}> {
  try {
    // Format phone number (without country code)
    const formattedPhone = formatPhoneForS3P(phone);

    // Detect service based on phone prefix
    const serviceId = detectService(phone);

    // Generate unique transaction reference
    const trid = `LTC-${orderRef}-${Date.now()}`;

    // STEP 1: Get payItemId from services
    const services = await getServices(serviceId);

    let payItemId: string;
    if (Array.isArray(services)) {
      const service = services.find(s => s.serviceid === serviceId);
      if (!service) {
        return {
          success: false,
          error: `Service ${serviceId} not found`,
        };
      }
      payItemId = service.payItemId;
    } else if (services && typeof services === 'object' && 'payItemId' in services) {
      payItemId = (services as S3PServiceResponse).payItemId;
    } else {
      return {
        success: false,
        error: 'Unexpected response format from S3P services',
      };
    }

    // STEP 2: Create quote
    const quote = await createQuote(payItemId, amount);

    if (!quote.quoteId) {
      return {
        success: false,
        error: 'Failed to create payment quote',
      };
    }

    // STEP 3: Initiate collection (sends push notification to customer)
    const collection = await collectPayment(
      quote.quoteId,
      formattedPhone,
      trid,
      customerName
    );

    return {
      success: true,
      ptn: collection.ptn,
      trid: trid,
      status: collection.status,
      message: collection.message || 'Payment request sent. Please check your phone.',
    };
  } catch (error) {
    console.error('S3P payment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment initiation failed',
    };
  }
}
