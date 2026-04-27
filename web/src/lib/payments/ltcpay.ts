/**
 * LTCPay Direct API Client
 * Server-to-server Mobile Money payments (push notification to customer phone).
 * No redirection needed — payment is initiated directly via API.
 *
 * Auth: Static headers X-API-Key + X-API-Secret
 * Create: POST /payments → { reference, status: "PROCESSING" }
 * Status: GET /payments/{reference} → { status, amount, operator, ... }
 * Webhook: HMAC-SHA256 signature verification
 */

import crypto from "crypto";

const LTCPAY_CONFIG = {
  BASE_URL: process.env.LTCPAY_BASE_URL || "https://pay.ltcgroup.site/api/v1",
  API_KEY: process.env.LTCPAY_API_KEY || "",
  API_SECRET: process.env.LTCPAY_API_SECRET || "",
  WEBHOOK_SECRET: process.env.LTCPAY_WEBHOOK_SECRET || "",
  TIMEOUT_MS: 30000,
};

export type LtcPayOperator = "MTN" | "ORANGE";

export type LtcPayStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export interface LtcPayPaymentResponse {
  reference: string;
  merchant_reference: string;
  status: LtcPayStatus;
  amount: number;
  operator: LtcPayOperator;
  customer_phone: string;
  created_at: string;
}

export interface LtcPayStatusResponse {
  reference: string;
  merchant_reference: string;
  status: LtcPayStatus;
  amount: number;
  currency: string;
  operator: LtcPayOperator;
  customer_phone: string;
  created_at: string;
  completed_at?: string;
  failure_reason?: string;
}

export interface LtcPayWebhookPayload {
  event: string;
  data: {
    reference: string;
    merchant_reference: string;
    status: LtcPayStatus;
    amount: number;
    currency: string;
    operator: LtcPayOperator;
    customer_phone: string;
    customer_name?: string;
    completed_at?: string;
    failure_reason?: string;
  };
}

/**
 * Format phone number for LTCPay API (237XXXXXXXXX format)
 */
export function formatPhoneForLtcPay(phone: string): string {
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // If already has 237 prefix and correct length
  if (digits.startsWith("237") && digits.length === 12) {
    return digits;
  }

  // If starts with +237
  if (digits.startsWith("237")) {
    return digits;
  }

  // If starts with 6 or 2 (local format)
  if (/^[62]\d{7,8}$/.test(digits)) {
    return `237${digits}`;
  }

  // Fallback: prepend 237 if not present
  return digits.startsWith("237") ? digits : `237${digits}`;
}

/**
 * Fetch with timeout for LTCPay API
 */
async function ltcPayFetch(
  url: string,
  options: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LTCPAY_CONFIG.TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Le service de paiement ne repond pas. Veuillez reessayer."
      );
    }
    throw error;
  }
}

/**
 * Get common auth headers for LTCPay API
 */
function getAuthHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-API-Key": LTCPAY_CONFIG.API_KEY,
    "X-API-Secret": LTCPAY_CONFIG.API_SECRET,
  };
}

/**
 * Create a direct payment (push to customer phone)
 * Returns reference and initial status (PROCESSING)
 */
export async function createDirectPayment(params: {
  amount: number;
  operator: LtcPayOperator;
  customerPhone: string;
  merchantReference: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  callbackUrl?: string;
}): Promise<{
  success: boolean;
  reference?: string;
  status?: LtcPayStatus;
  error?: string;
}> {
  try {
    const phone = formatPhoneForLtcPay(params.customerPhone);

    const response = await ltcPayFetch(
      `${LTCPAY_CONFIG.BASE_URL}/payments`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: params.amount,
          currency: "XAF",
          operator: params.operator,
          customer_phone: phone,
          merchant_reference: params.merchantReference,
          description: params.description || `Paiement LTC - ${params.merchantReference}`,
          customer_name: params.customerName || "",
          customer_email: params.customerEmail || "",
          callback_url: params.callbackUrl || "",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `Erreur ${response.status}`,
      };
    }

    // Handle business-level errors (API returns 200 but with error status)
    if (data.status && typeof data.status === "number" && data.status >= 400) {
      return {
        success: false,
        error: data.message || "Erreur lors de l'initiation du paiement",
      };
    }

    const paymentData: LtcPayPaymentResponse = data.data || data;

    return {
      success: true,
      reference: paymentData.reference,
      status: paymentData.status || "PROCESSING",
    };
  } catch (error) {
    console.error("LTCPay createDirectPayment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur de paiement",
    };
  }
}

/**
 * Get payment status by reference
 */
export async function getPaymentStatus(reference: string): Promise<{
  status: LtcPayStatus;
  amount?: number;
  currency?: string;
  operator?: LtcPayOperator;
  customerPhone?: string;
  failureReason?: string;
}> {
  const response = await ltcPayFetch(
    `${LTCPAY_CONFIG.BASE_URL}/payments/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Erreur de verification du statut");
  }

  const payment: LtcPayStatusResponse = data.data || data;

  return {
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    operator: payment.operator,
    customerPhone: payment.customer_phone,
    failureReason: payment.failure_reason,
  };
}

/**
 * Verify webhook signature (HMAC-SHA256)
 * The signature is computed over the raw request body using the webhook secret
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  if (!LTCPAY_CONFIG.WEBHOOK_SECRET || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", LTCPAY_CONFIG.WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}
