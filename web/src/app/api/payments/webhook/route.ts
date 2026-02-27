import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { updateOrderPaymentStatus, updateTransactionStatus, getTransaction } from "@/lib/db";

const WAZEAPP_API_URL = "https://api.wazeapp.xyz/api/v1/external";
const WAZEAPP_API_KEY = "wz_live_aNS-uHJqontSvzaxQbzULpzBNHMjsK-xDAPQ5OYuDTs";
const TEAM_PHONE = "237673209375";
const TEAM_EMAIL = "lontsi05@gmail.com";

// Email transporter — uses same SMTP env vars as contact route
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "ltc-mailserver",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    ...(process.env.SMTP_USER
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
      : { tls: { rejectUnauthorized: false } }),
  });
}

// Send WhatsApp message via WazeApp API (with timeout)
async function sendWhatsApp(to: string, message: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${WAZEAPP_API_URL}/send/immediate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": WAZEAPP_API_KEY,
      },
      body: JSON.stringify({
        to,
        message,
        type: "text",
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("WhatsApp send error:", error);
    return null;
  }
}

interface EnkapWebhookPayload {
  order_id: string;
  order_transaction_id: string;
  merchant_reference: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PENDING';
  amount: number;
  currency: string;
  payment_method?: string;
  customer?: {
    name: string;
    email: string;
    phone: string;
  };
  completed_at?: string;
}

interface PayinWebhookPayload {
  data?: {
    data?: {
      attributes?: {
        status: number; // 0=PENDING, 1=COMPLETED, 2=FAILED, 3=REFUNDED
        amount?: number;
        currency?: string;
        order_id?: string;
        transaction_id?: string;
        customer_phone?: string;
        customer_name?: string;
        customer_email?: string;
      };
    };
  };
}

/**
 * Handle E-nkap webhook notifications
 */
async function handleEnkapWebhook(payload: EnkapWebhookPayload) {
  const { order_id, merchant_reference, status, amount, payment_method, customer } = payload;

  console.log(`E-nkap webhook: Order ${merchant_reference} - Status: ${status}`);

  // Update payment status in database
  const dbStatus = status === 'COMPLETED' ? 'SUCCESS' : status === 'PENDING' ? 'PENDING' : 'FAILED';
  await updateOrderPaymentStatus(merchant_reference, dbStatus as 'SUCCESS' | 'PENDING' | 'FAILED', 'enkap');

  // Update transaction status
  await updateTransactionStatus(
    { trid: order_id },
    dbStatus as 'SUCCESS' | 'PENDING' | 'FAILED'
  );

  if (status === 'COMPLETED') {
    const teamMessage = `*[PAIEMENT RECU - E-NKAP]*

*Référence:* ${merchant_reference}
*Montant:* ${amount.toLocaleString()} FCFA
*Méthode:* ${payment_method || 'N/A'}
*ID Transaction:* ${order_id}

*Client:*
${customer?.name || 'N/A'}
${customer?.phone || 'N/A'}
${customer?.email || 'N/A'}

Le paiement a été confirmé avec succès.`;

    await sendWhatsApp(TEAM_PHONE, teamMessage);

    if (customer?.phone) {
      const customerPhone = customer.phone.startsWith('237')
        ? customer.phone
        : '237' + customer.phone.replace(/\D/g, '');

      const customerMessage = `*CONFIRMATION DE PAIEMENT*
*LTC Finance*

Bonjour ${customer.name || ''},

Votre paiement de *${amount.toLocaleString()} FCFA* a été reçu avec succès.

*Référence:* ${merchant_reference}

Notre équipe vous contactera sous peu pour finaliser votre commande.

Merci de votre confiance !
_L'équipe LTC Finance_`;

      await sendWhatsApp(customerPhone, customerMessage);
    }

    try {
      await getTransporter().sendMail({
        from: '"LTC Finance" <noreply@ltcgroup.site>',
        to: TEAM_EMAIL,
        subject: `[PAIEMENT RECU] ${merchant_reference} - ${amount.toLocaleString()} FCFA`,
        html: `
          <h2>Paiement reçu via E-nkap</h2>
          <p><strong>Référence:</strong> ${merchant_reference}</p>
          <p><strong>Montant:</strong> ${amount.toLocaleString()} FCFA</p>
          <p><strong>Méthode:</strong> ${payment_method || 'N/A'}</p>
          <p><strong>ID Transaction:</strong> ${order_id}</p>
          <hr>
          <p><strong>Client:</strong> ${customer?.name || 'N/A'}</p>
          <p><strong>Téléphone:</strong> ${customer?.phone || 'N/A'}</p>
          <p><strong>Email:</strong> ${customer?.email || 'N/A'}</p>
        `,
      });
    } catch (emailError) {
      console.error("Email notification error:", emailError);
    }

    return { success: true, message: 'Payment confirmed' };

  } else if (status === 'FAILED' || status === 'CANCELLED') {
    const teamMessage = `*[PAIEMENT ECHOUE - E-NKAP]*

*Référence:* ${merchant_reference}
*Statut:* ${status}
*Montant:* ${amount.toLocaleString()} FCFA

Le paiement n'a pas abouti.`;

    await sendWhatsApp(TEAM_PHONE, teamMessage);

    return { success: true, message: 'Payment failure recorded' };
  }

  return { success: true, message: 'Webhook received' };
}

/**
 * Handle Payin (Mobile Money) webhook notifications
 * Status codes: 0=PENDING, 1=COMPLETED, 2=FAILED, 3=REFUNDED
 */
async function handlePayinWebhook(payload: PayinWebhookPayload) {
  const attributes = payload.data?.data?.attributes;
  if (!attributes) {
    console.warn('Payin webhook: Missing attributes in payload');
    return { success: true, message: 'Webhook received (no attributes)' };
  }

  const statusCode = attributes.status;
  const orderId = attributes.order_id || '';
  const transactionId = attributes.transaction_id || '';
  const amount = attributes.amount || 0;
  const customerPhone = attributes.customer_phone || '';
  const customerName = attributes.customer_name || '';

  const statusMap: Record<number, string> = {
    0: 'PENDING',
    1: 'SUCCESS',
    2: 'FAILED',
    3: 'REFUNDED',
  };
  const statusStr = statusMap[statusCode] || 'UNKNOWN';

  console.log(`Payin webhook: order=${orderId}, tx=${transactionId}, status=${statusStr}`);

  // Look up order_ref from the transaction
  const transaction = await getTransaction({ trid: transactionId });
  const orderRef = transaction?.order_ref;

  if (orderRef) {
    const dbStatus = statusStr === 'SUCCESS' ? 'SUCCESS' : statusStr === 'PENDING' ? 'PENDING' : 'FAILED';
    await updateOrderPaymentStatus(orderRef, dbStatus as 'SUCCESS' | 'PENDING' | 'FAILED', 'mobile_money');
  }

  // Update transaction status
  const dbStatus = statusStr === 'SUCCESS' ? 'SUCCESS' : statusStr === 'PENDING' ? 'PENDING' : 'FAILED';
  await updateTransactionStatus(
    { trid: transactionId },
    dbStatus as 'SUCCESS' | 'PENDING' | 'FAILED'
  );

  if (statusStr === 'SUCCESS') {
    const teamMessage = `*[PAIEMENT RECU - MOBILE MONEY]*

*Référence:* ${orderId}
*Montant:* ${amount.toLocaleString()} FCFA
*Numéro:* ${customerPhone}
*Transaction ID:* ${transactionId}

Le paiement Mobile Money a été confirmé.`;

    await sendWhatsApp(TEAM_PHONE, teamMessage);

    // Send confirmation to customer
    if (customerPhone) {
      const formattedPhone = customerPhone.startsWith('237')
        ? customerPhone
        : '237' + customerPhone.replace(/\D/g, '');

      const customerMessage = `*CONFIRMATION DE PAIEMENT*
*LTC Finance*

Bonjour ${customerName || ''},

Votre paiement de *${amount.toLocaleString()} FCFA* a été reçu avec succès.

*Référence:* ${orderId}

Notre équipe vous contactera sous peu pour finaliser votre commande.

Merci de votre confiance !
_L'équipe LTC Finance_`;

      await sendWhatsApp(formattedPhone, customerMessage);
    }

    // Send email notification to team
    try {
      await getTransporter().sendMail({
        from: '"LTC Finance" <noreply@ltcgroup.site>',
        to: TEAM_EMAIL,
        subject: `[PAIEMENT MOBILE MONEY] ${orderId} - ${amount.toLocaleString()} FCFA`,
        html: `
          <h2>Paiement Mobile Money reçu (Payin)</h2>
          <p><strong>Référence:</strong> ${orderId}</p>
          <p><strong>Montant:</strong> ${amount.toLocaleString()} FCFA</p>
          <p><strong>Numéro:</strong> ${customerPhone}</p>
          <p><strong>Transaction ID:</strong> ${transactionId}</p>
          <p><strong>Client:</strong> ${customerName}</p>
        `,
      });
    } catch (emailError) {
      console.error("Email notification error:", emailError);
    }

    return { success: true, message: 'Payment confirmed' };

  } else if (statusStr === 'FAILED' || statusStr === 'REFUNDED') {
    const teamMessage = `*[PAIEMENT ECHOUE - MOBILE MONEY]*

*Référence:* ${orderId}
*Statut:* ${statusStr}
*Numéro:* ${customerPhone}

Le paiement n'a pas abouti.`;

    await sendWhatsApp(TEAM_PHONE, teamMessage);

    return { success: true, message: 'Payment failure recorded' };
  }

  return { success: true, message: 'Webhook received' };
}

/**
 * POST endpoint for payment webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    console.log('Payment webhook received:', JSON.stringify(payload, null, 2));

    // Determine webhook source and handle accordingly
    if (payload.order_id && payload.merchant_reference) {
      // E-nkap webhook
      const result = await handleEnkapWebhook(payload as EnkapWebhookPayload);
      return NextResponse.json(result);

    } else if (payload.data?.data?.attributes) {
      // Payin webhook (nested data.data.attributes structure)
      const result = await handlePayinWebhook(payload as PayinWebhookPayload);
      return NextResponse.json(result);

    } else {
      console.log('Unknown webhook format:', payload);
      return NextResponse.json({ success: true, message: 'Webhook received' });
    }

  } catch (error) {
    console.error("Webhook processing error:", error);
    // Always return 200 to prevent retries for malformed requests
    return NextResponse.json({ success: false, error: 'Processing error' });
  }
}

/**
 * GET endpoint for webhook verification (some providers require this)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');

  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ status: 'Webhook endpoint active' });
}
