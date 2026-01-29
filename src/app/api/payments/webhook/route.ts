import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { updateOrderPaymentStatus } from "@/lib/supabase";

const WAZEAPP_API_URL = "https://api.wazeapp.xyz/api/v1/external";
const WAZEAPP_API_KEY = "wz_live_aNS-uHJqontSvzaxQbzULpzBNHMjsK-xDAPQ5OYuDTs";
const TEAM_PHONE = "237673209375";
const TEAM_EMAIL = "lontsi05@gmail.com";

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: "ltc-mailserver",
  port: 587,
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
});

// Send WhatsApp message via WazeApp API
async function sendWhatsApp(to: string, message: string) {
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
    });
    return response.json();
  } catch (error) {
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

interface S3PWebhookPayload {
  ptn: string;
  trid: string; // Our order reference
  status: 'SUCCESS' | 'FAILED' | 'ERRORED' | 'PENDING';
  amount: number;
  serviceNumber: string;
  errorMessage?: string;
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

  if (status === 'COMPLETED') {
    // Payment successful - notify team
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

    // Send confirmation to customer if we have their phone
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

    // Send email notification to team
    try {
      await transporter.sendMail({
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
    // Payment failed - notify team
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
 * Handle S3P (Mobile Money) webhook notifications
 */
async function handleS3PWebhook(payload: S3PWebhookPayload) {
  const { ptn, trid, status, amount, serviceNumber, errorMessage } = payload;

  console.log(`S3P webhook: Transaction ${trid} - Status: ${status}`);

  // Update payment status in database
  const dbStatus = status === 'SUCCESS' ? 'SUCCESS' : status === 'PENDING' ? 'PENDING' : 'FAILED';
  await updateOrderPaymentStatus(trid, dbStatus as 'SUCCESS' | 'PENDING' | 'FAILED', 'mobile_money');

  if (status === 'SUCCESS') {
    // Payment successful - notify team
    const teamMessage = `*[PAIEMENT RECU - MOBILE MONEY]*

*Référence:* ${trid}
*Montant:* ${amount.toLocaleString()} FCFA
*Numéro:* ${serviceNumber}
*PTN:* ${ptn}

Le paiement Mobile Money a été confirmé.`;

    await sendWhatsApp(TEAM_PHONE, teamMessage);

    // Send confirmation to customer
    const customerPhone = serviceNumber.startsWith('237')
      ? serviceNumber
      : '237' + serviceNumber;

    const customerMessage = `*CONFIRMATION DE PAIEMENT*
*LTC Finance*

Votre paiement de *${amount.toLocaleString()} FCFA* a été reçu avec succès.

*Référence:* ${trid}

Notre équipe vous contactera sous peu pour finaliser votre commande.

Merci de votre confiance !
_L'équipe LTC Finance_`;

    await sendWhatsApp(customerPhone, customerMessage);

    // Send email notification to team
    try {
      await transporter.sendMail({
        from: '"LTC Finance" <noreply@ltcgroup.site>',
        to: TEAM_EMAIL,
        subject: `[PAIEMENT MOBILE MONEY] ${trid} - ${amount.toLocaleString()} FCFA`,
        html: `
          <h2>Paiement Mobile Money reçu</h2>
          <p><strong>Référence:</strong> ${trid}</p>
          <p><strong>Montant:</strong> ${amount.toLocaleString()} FCFA</p>
          <p><strong>Numéro:</strong> ${serviceNumber}</p>
          <p><strong>PTN:</strong> ${ptn}</p>
        `,
      });
    } catch (emailError) {
      console.error("Email notification error:", emailError);
    }

    return { success: true, message: 'Payment confirmed' };

  } else if (status === 'FAILED' || status === 'ERRORED') {
    // Payment failed
    const teamMessage = `*[PAIEMENT ECHOUE - MOBILE MONEY]*

*Référence:* ${trid}
*Statut:* ${status}
*Erreur:* ${errorMessage || 'N/A'}
*Numéro:* ${serviceNumber}

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

    } else if (payload.ptn && payload.trid) {
      // S3P webhook
      const result = await handleS3PWebhook(payload as S3PWebhookPayload);
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
    // Return challenge for webhook verification
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ status: 'Webhook endpoint active' });
}
