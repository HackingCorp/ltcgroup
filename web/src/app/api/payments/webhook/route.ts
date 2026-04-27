import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { updateOrderPaymentStatus, updateTransactionStatus, getTransaction } from "@/lib/db";
import { verifyWebhookSignature, LtcPayWebhookPayload, LtcPayStatus } from "@/lib/payments/ltcpay";

const WAZEAPP_API_URL = "https://api.wazeapp.xyz/api/v1/external";
const WAZEAPP_API_KEY = process.env.WAZEAPP_API_KEY || '';
const TEAM_PHONE = process.env.TEAM_WHATSAPP_PHONE || '237673209375';
const TEAM_EMAIL = process.env.TEAM_NOTIFICATION_EMAIL || 'lontsi05@gmail.com';

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

*Reference:* ${merchant_reference}
*Montant:* ${amount.toLocaleString()} FCFA
*Methode:* ${payment_method || 'N/A'}
*ID Transaction:* ${order_id}

*Client:*
${customer?.name || 'N/A'}
${customer?.phone || 'N/A'}
${customer?.email || 'N/A'}

Le paiement a ete confirme avec succes.`;

    await sendWhatsApp(TEAM_PHONE, teamMessage);

    if (customer?.phone) {
      const customerPhone = customer.phone.startsWith('237')
        ? customer.phone
        : '237' + customer.phone.replace(/\D/g, '');

      const customerMessage = `*CONFIRMATION DE PAIEMENT*
*LTC Finance*

Bonjour ${customer.name || ''},

Votre paiement de *${amount.toLocaleString()} FCFA* a ete recu avec succes.

*Reference:* ${merchant_reference}

Notre equipe vous contactera sous peu pour finaliser votre commande.

Merci de votre confiance !
_L'equipe LTC Finance_`;

      await sendWhatsApp(customerPhone, customerMessage);
    }

    try {
      await getTransporter().sendMail({
        from: '"LTC Finance" <noreply@ltcgroup.site>',
        to: TEAM_EMAIL,
        subject: `[PAIEMENT RECU] ${merchant_reference} - ${amount.toLocaleString()} FCFA`,
        html: `
          <h2>Paiement recu via E-nkap</h2>
          <p><strong>Reference:</strong> ${merchant_reference}</p>
          <p><strong>Montant:</strong> ${amount.toLocaleString()} FCFA</p>
          <p><strong>Methode:</strong> ${payment_method || 'N/A'}</p>
          <p><strong>ID Transaction:</strong> ${order_id}</p>
          <hr>
          <p><strong>Client:</strong> ${customer?.name || 'N/A'}</p>
          <p><strong>Telephone:</strong> ${customer?.phone || 'N/A'}</p>
          <p><strong>Email:</strong> ${customer?.email || 'N/A'}</p>
        `,
      });
    } catch (emailError) {
      console.error("Email notification error:", emailError);
    }

    return { success: true, message: 'Payment confirmed' };

  } else if (status === 'FAILED' || status === 'CANCELLED') {
    const teamMessage = `*[PAIEMENT ECHOUE - E-NKAP]*

*Reference:* ${merchant_reference}
*Statut:* ${status}
*Montant:* ${amount.toLocaleString()} FCFA

Le paiement n'a pas abouti.`;

    await sendWhatsApp(TEAM_PHONE, teamMessage);

    return { success: true, message: 'Payment failure recorded' };
  }

  return { success: true, message: 'Webhook received' };
}

/**
 * Handle LTCPay webhook notifications
 * Event: payment.status_changed
 * Signature: X-LtcPay-Signature header (HMAC-SHA256)
 */
async function handleLtcPayWebhook(payload: LtcPayWebhookPayload, verified: boolean) {
  const { event, data } = payload;

  if (event !== 'payment.status_changed') {
    console.log(`LTCPay webhook: Unhandled event type: ${event}`);
    return { success: true, message: `Event ${event} acknowledged` };
  }

  const { reference, merchant_reference, status, amount, operator, customer_phone, customer_name } = data;

  console.log(`LTCPay webhook: ref=${reference}, merchant_ref=${merchant_reference}, status=${status}, verified=${verified}`);

  // Map LTCPay status to DB status
  let dbStatus: 'SUCCESS' | 'PENDING' | 'FAILED';
  switch (status) {
    case 'COMPLETED':
      dbStatus = 'SUCCESS';
      break;
    case 'FAILED':
    case 'EXPIRED':
    case 'CANCELLED':
      dbStatus = 'FAILED';
      break;
    default:
      dbStatus = 'PENDING';
      break;
  }

  // Look up transaction by reference
  const transaction = await getTransaction({ trid: reference });
  const orderRef = transaction?.order_ref || merchant_reference;

  // Update transaction status
  await updateTransactionStatus(
    { trid: reference },
    dbStatus
  );

  // Update order payment status
  if (orderRef) {
    await updateOrderPaymentStatus(orderRef, dbStatus, 'mobile_money');
  }

  if (status === 'COMPLETED') {
    const teamMessage = `*[PAIEMENT RECU - MOBILE MONEY]*

*Reference:* ${orderRef}
*Montant:* ${amount.toLocaleString()} FCFA
*Operateur:* ${operator}
*Numero:* ${customer_phone}
*Transaction:* ${reference}

Le paiement Mobile Money a ete confirme.`;

    await sendWhatsApp(TEAM_PHONE, teamMessage);

    // Send confirmation to customer
    if (customer_phone) {
      const formattedPhone = customer_phone.startsWith('237')
        ? customer_phone
        : '237' + customer_phone.replace(/\D/g, '');

      const customerMessage = `*CONFIRMATION DE PAIEMENT*
*LTC Finance*

Bonjour ${customer_name || ''},

Votre paiement de *${amount.toLocaleString()} FCFA* a ete recu avec succes.

*Reference:* ${orderRef}

Notre equipe vous contactera sous peu pour finaliser votre commande.

Merci de votre confiance !
_L'equipe LTC Finance_`;

      await sendWhatsApp(formattedPhone, customerMessage);
    }

    // Send email notification to team
    try {
      await getTransporter().sendMail({
        from: '"LTC Finance" <noreply@ltcgroup.site>',
        to: TEAM_EMAIL,
        subject: `[PAIEMENT MOBILE MONEY] ${orderRef} - ${amount.toLocaleString()} FCFA`,
        html: `
          <h2>Paiement Mobile Money recu (LTCPay)</h2>
          <p><strong>Reference:</strong> ${orderRef}</p>
          <p><strong>Montant:</strong> ${amount.toLocaleString()} FCFA</p>
          <p><strong>Operateur:</strong> ${operator}</p>
          <p><strong>Numero:</strong> ${customer_phone}</p>
          <p><strong>Transaction LTCPay:</strong> ${reference}</p>
          <p><strong>Client:</strong> ${customer_name || 'N/A'}</p>
        `,
      });
    } catch (emailError) {
      console.error("Email notification error:", emailError);
    }

    return { success: true, message: 'Payment confirmed' };

  } else if (status === 'FAILED' || status === 'EXPIRED' || status === 'CANCELLED') {
    const teamMessage = `*[PAIEMENT ECHOUE - MOBILE MONEY]*

*Reference:* ${orderRef}
*Statut:* ${status}
*Operateur:* ${operator}
*Numero:* ${customer_phone}

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

    } else if (payload.event && payload.data?.reference) {
      // LTCPay webhook (has event field and data.reference)
      const signature = request.headers.get('X-LtcPay-Signature') || request.headers.get('x-ltcpay-signature') || '';
      const verified = verifyWebhookSignature(rawBody, signature);

      if (!verified) {
        console.warn('LTCPay webhook: Invalid signature');
        // Still process but log warning — some environments may not have webhook secret configured
      }

      const result = await handleLtcPayWebhook(payload as LtcPayWebhookPayload, verified);
      return NextResponse.json(result);

    } else {
      console.warn('Unknown webhook format:', payload);
      return NextResponse.json(
        { success: false, error: 'Unknown webhook format' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Webhook processing error:", error);
    // Always return 200 to prevent retries for malformed requests
    return NextResponse.json({ success: false, error: 'Processing error' });
  }
}

/**
 * GET endpoint for webhook verification (challenge response)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');

  // Webhook verification for some providers
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  // No redirect needed — LTCPay is server-to-server, no customer redirect
  return NextResponse.json({ status: 'ok' });
}
