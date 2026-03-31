/**
 * Payin API Client (AccountPE/Swychr)
 * Payment links for Mobile Money across 18 African countries.
 *
 * Auth: POST /admin/auth → JWT token (reuses Swychr credentials)
 * Create: POST /create_payment_links → {data: {id, payment_link, transaction_id}}
 * Status: POST /payment_link_status → {data: {data: {attributes: {status, ...}}}}
 */

const PAYIN_CONFIG = {
  BASE_URL: 'https://api.accountpe.com/api/payin',
  EMAIL: process.env.SWYCHR_EMAIL || '',
  PASSWORD: process.env.SWYCHR_PASSWORD || '',
  TIMEOUT_MS: 30000,
};

// 18 supported countries with provider fee + 0.5% margin
export const PAYIN_COUNTRIES: Record<string, {
  name: string;
  providerFee: number;
  totalFee: number;
  currency: string;
}> = {
  CM: { name: 'Cameroon', providerFee: 2.50, totalFee: 3.00, currency: 'XAF' },
  KE: { name: 'Kenya', providerFee: 1.50, totalFee: 2.00, currency: 'KES' },
  GA: { name: 'Gabon', providerFee: 3.00, totalFee: 3.50, currency: 'XAF' },
  CD: { name: 'Congo DRC', providerFee: 3.50, totalFee: 4.00, currency: 'CDF' },
  SN: { name: 'Senegal', providerFee: 2.50, totalFee: 3.00, currency: 'XOF' },
  CI: { name: "Cote D'Ivoire", providerFee: 3.00, totalFee: 3.50, currency: 'XOF' },
  BF: { name: 'Burkina Faso', providerFee: 3.00, totalFee: 3.50, currency: 'XOF' },
  ML: { name: 'Mali', providerFee: 3.00, totalFee: 3.50, currency: 'XOF' },
  BJ: { name: 'Benin', providerFee: 3.00, totalFee: 3.50, currency: 'XOF' },
  TG: { name: 'Togo', providerFee: 3.00, totalFee: 3.50, currency: 'XOF' },
  TZ: { name: 'Tanzania', providerFee: 3.00, totalFee: 3.50, currency: 'TZS' },
  UG: { name: 'Uganda', providerFee: 3.00, totalFee: 3.50, currency: 'UGX' },
  NG: { name: 'Nigeria', providerFee: 2.00, totalFee: 2.50, currency: 'NGN' },
  NE: { name: 'Niger', providerFee: 3.50, totalFee: 4.00, currency: 'XOF' },
  RW: { name: 'Rwanda', providerFee: 3.75, totalFee: 4.25, currency: 'RWF' },
  CG: { name: 'Congo Brazzaville', providerFee: 4.50, totalFee: 5.00, currency: 'XAF' },
  GN: { name: 'Guinea Conakry', providerFee: 3.75, totalFee: 4.25, currency: 'GNF' },
  GH: { name: 'Ghana', providerFee: 2.50, totalFee: 3.00, currency: 'GHS' },
};

const OUR_MARGIN = 0.005; // 0.5%

// JWT token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

interface PayinCreateResponse {
  data?: {
    id: string;
    payment_link: string;
    transaction_id: string;
  };
  status?: number;
  message?: string;
}

interface PayinStatusResponse {
  data?: {
    data?: {
      attributes?: {
        status: number; // 0=PENDING, 1=COMPLETED, 2=FAILED, 3=REFUNDED
        amount?: number;
        currency?: string;
        order_id?: string;
        transaction_id?: string;
      };
    };
  };
  status?: number;
  message?: string;
}

/**
 * Fetch with timeout for Payin API
 */
async function payinFetch(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PAYIN_CONFIG.TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Le service de paiement ne répond pas. Veuillez réessayer.');
    }
    throw error;
  }
}

/**
 * Authenticate with Payin /admin/auth and cache JWT token
 */
async function getAuthToken(): Promise<string> {
  // Reuse cached token if valid (5 min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300_000) {
    return cachedToken.token;
  }

  const response = await payinFetch(`${PAYIN_CONFIG.BASE_URL}/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: PAYIN_CONFIG.EMAIL,
      password: PAYIN_CONFIG.PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error('Erreur d\'authentification Payin');
  }

  const data = await response.json();
  const token = data.token;
  if (!token) {
    throw new Error('Authentification Payin échouée');
  }

  // Parse expiry from message (format: "MM-DD-YYYY HH:MM")
  let expiresAt = Date.now() + 3600_000; // default 1h
  try {
    const expiryStr = data.message || '';
    const parsed = new Date(expiryStr.replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$1-$2'));
    if (!isNaN(parsed.getTime())) {
      expiresAt = parsed.getTime();
    }
  } catch {
    // Use default
  }

  cachedToken = { token, expiresAt };
  return token;
}

/**
 * Calculate fees for a given amount and country
 */
export function calculateFees(amount: number, countryCode: string): {
  baseAmount: number;
  marginAmount: number;
  totalAmount: number;
  totalFeeRate: number;
} {
  const country = PAYIN_COUNTRIES[countryCode.toUpperCase()];
  if (!country) {
    throw new Error(`Pays non supporté: ${countryCode}`);
  }

  const marginAmount = Math.round(amount * OUR_MARGIN * 100) / 100;
  const totalAmount = amount + marginAmount;

  return {
    baseAmount: amount,
    marginAmount,
    totalAmount,
    totalFeeRate: country.totalFee / 100,
  };
}

/**
 * Create a Payin payment link
 */
export async function createPaymentLink(params: {
  amount: number;
  countryCode: string;
  orderRef: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  callbackUrl?: string;
  redirectUrl?: string;
}): Promise<{
  success: boolean;
  paymentLinkId?: string;
  paymentLink?: string;
  transactionId?: string;
  totalAmount?: number;
  error?: string;
}> {
  try {
    const country = PAYIN_COUNTRIES[params.countryCode.toUpperCase()];
    if (!country) {
      return { success: false, error: `Pays non supporté: ${params.countryCode}` };
    }

    const fees = calculateFees(params.amount, params.countryCode);
    const token = await getAuthToken();

    const response = await payinFetch(`${PAYIN_CONFIG.BASE_URL}/create_payment_links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: fees.totalAmount,
        country_code: params.countryCode.toUpperCase(),
        currency: country.currency,
        transaction_id: params.orderRef,
        name: params.customerName || 'Client LTC Finance',
        email: params.customerEmail || '',
        mobile: params.customerPhone || '',
        description: params.description || `Paiement LTC - ${params.orderRef}`,
        callback_url: params.callbackUrl || '',
        pass_digital_charge: true,
      }),
    });

    const data: PayinCreateResponse = await response.json();

    // Check for business errors (HTTP 200 but status != 200)
    if (data.status && [400, 401, 403, 404, 500].includes(data.status)) {
      return {
        success: false,
        error: data.message || 'Erreur lors de la création du lien de paiement',
      };
    }

    const linkData = data.data;
    if (!linkData?.payment_link) {
      return { success: false, error: 'Le lien de paiement n\'a pas été généré' };
    }

    return {
      success: true,
      paymentLinkId: linkData.id,
      paymentLink: linkData.payment_link,
      transactionId: linkData.transaction_id,
      totalAmount: fees.totalAmount,
    };
  } catch (error) {
    console.error('Payin createPaymentLink error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de paiement',
    };
  }
}

/**
 * Check payment link status
 * Status: 0=PENDING, 1=COMPLETED, 2=FAILED, 3=REFUNDED
 */
export async function getPaymentLinkStatus(transactionId: string): Promise<{
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'UNKNOWN';
  statusCode?: number;
  amount?: number;
  currency?: string;
}> {
  const token = await getAuthToken();

  const response = await payinFetch(`${PAYIN_CONFIG.BASE_URL}/payment_link_status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ transaction_id: transactionId }),
  });

  const data: PayinStatusResponse = await response.json();

  if (data.status && [400, 401, 403, 404, 500].includes(data.status)) {
    throw new Error(data.message || 'Erreur de vérification du statut');
  }

  const attributes = data.data?.data?.attributes;
  const statusCode = attributes?.status;

  const statusMap: Record<number, 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'> = {
    0: 'PENDING',
    1: 'COMPLETED',
    2: 'FAILED',
    3: 'REFUNDED',
  };

  return {
    status: statusCode !== undefined ? (statusMap[statusCode] || 'UNKNOWN') : 'UNKNOWN',
    statusCode,
    amount: attributes?.amount,
    currency: attributes?.currency,
  };
}
