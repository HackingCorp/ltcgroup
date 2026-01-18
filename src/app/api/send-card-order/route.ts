import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const WAZEAPP_API_URL = "https://api.wazeapp.xyz/api/v1/external";
const WAZEAPP_API_KEY = "wz_live_aNS-uHJqontSvzaxQbzULpzBNHMjsK-xDAPQ5OYuDTs";
const TEAM_PHONE = "237673209375";
const TEAM_EMAIL = "lontsi05@gmail.com";

// Email transporter configuration (LTC Mail Server - no auth required)
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
}

// Send WhatsApp media via WazeApp API
async function sendWhatsAppMedia(to: string, mediaBase64: string, caption: string, filename: string) {
  // Extract mime type and base64 data
  const matches = mediaBase64.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return null;

  const mimeType = matches[1];
  const base64Data = matches[2];

  const response = await fetch(`${WAZEAPP_API_URL}/send/immediate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": WAZEAPP_API_KEY,
    },
    body: JSON.stringify({
      to,
      type: mimeType.startsWith("image/") ? "image" : "document",
      media: {
        data: base64Data,
        mimetype: mimeType,
        filename: filename,
      },
      caption,
    }),
  });
  return response.json();
}

// Format phone number for WhatsApp (ensure it has country code)
function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // If starts with 6 or 2 (Cameroon local), add 237
  if (cleaned.startsWith("6") || cleaned.startsWith("2")) {
    cleaned = "237" + cleaned;
  }

  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      cardType,
      firstName,
      lastName,
      birthDate,
      birthCity,
      cityNeighborhood,
      phone,
      email,
      profession,
      idNumber,
      registrationNumber,
      fatherName,
      motherName,
      deliveryOption,
      deliveryAddress,
      noNiu,
      cardPrice,
      deliveryFee,
      niuFee,
      total,
      idPhoto,
      idPhotoName,
      passportPhoto,
      passportPhotoName,
    } = body;

    // Build delivery option label
    const deliveryLabels: Record<string, string> = {
      pickup_douala: "Retrait en agence - Douala",
      pickup_yaounde: "Retrait en agence - Yaoundé",
      delivery_douala: "Livraison à domicile - Douala (+1 500 FCFA)",
      delivery_yaounde: "Livraison à domicile - Yaoundé (+1 500 FCFA)",
      shipping: "Expédition (autre ville)",
    };
    const deliveryLabel = deliveryLabels[deliveryOption] || deliveryOption;

    // Card type labels
    const cardLabels: Record<string, string> = {
      "ACCESS_MASTERCARD_12500": "Access Bank Mastercard",
      "UBA_SEGMENT1_10000": "UBA Visa Segment 1 (Plafond 2.5M)",
      "UBA_SEGMENT2_15000": "UBA Visa Segment 2 (Plafond 4M)",
      "UBA_SEGMENT3_25000": "UBA Visa Segment 3 (Plafond 10M)",
    };
    const cardLabel = cardLabels[cardType] || cardType;

    // Generate order reference
    const orderRef = `LTC-${Date.now().toString(36).toUpperCase()}`;

    // =====================
    // 1. TEAM WHATSAPP MESSAGE
    // =====================
    const teamMessage = `*[NOUVELLE DEMANDE DE CARTE]*
*Réf: ${orderRef}*

*Type de carte:* ${cardLabel}

*— INFORMATIONS PERSONNELLES —*
━━━━━━━━━━━━━━━━━━
*Prénom:* ${firstName}
*Nom:* ${lastName}
*Date de naissance:* ${birthDate}
*Ville de naissance:* ${birthCity}
*Ville-Quartier:* ${cityNeighborhood}
*Téléphone:* ${phone}
*Email:* ${email}
*Profession:* ${profession}

*— DOCUMENTS —*
━━━━━━━━━━━━━━━━━━
*N° CNI/Récépissé/Passeport:* ${idNumber}
*Attestation/NIU:* ${noNiu ? "[X] N'a pas de NIU (service +3 000 FCFA)" : registrationNumber}
*Nom du père:* ${fatherName}
*Nom de la mère:* ${motherName}

*— LIVRAISON —*
━━━━━━━━━━━━━━━━━━
*Mode de réception:* ${deliveryLabel}
${deliveryAddress ? `*Adresse:* ${deliveryAddress}` : ""}

*— RECAPITULATIF —*
━━━━━━━━━━━━━━━━━━
Carte: ${cardPrice?.toLocaleString() || 0} FCFA
${deliveryFee > 0 ? `Livraison: ${deliveryFee?.toLocaleString()} FCFA` : ""}
${niuFee > 0 ? `Service NIU: ${niuFee?.toLocaleString()} FCFA` : ""}
*TOTAL: ${total?.toLocaleString() || 0} FCFA*

${idPhoto ? "[+] Photo CNI: Envoyée ci-dessous" : "[-] Photo CNI: Non fournie"}
${passportPhoto ? "[+] Photo identité: Envoyée ci-dessous" : "[-] Photo identité: Non fournie"}`;

    // Send team WhatsApp message
    await sendWhatsApp(TEAM_PHONE, teamMessage);

    // Send photos to team if provided
    if (idPhoto) {
      await sendWhatsAppMedia(
        TEAM_PHONE,
        idPhoto,
        `CNI - ${firstName} ${lastName} (${orderRef})`,
        idPhotoName || "cni.jpg"
      );
    }

    if (passportPhoto) {
      await sendWhatsAppMedia(
        TEAM_PHONE,
        passportPhoto,
        `Photo identité - ${firstName} ${lastName} (${orderRef})`,
        passportPhotoName || "photo.jpg"
      );
    }

    // =====================
    // 2. CLIENT WHATSAPP CONFIRMATION
    // =====================
    const clientPhone = formatPhoneForWhatsApp(phone);
    const clientWhatsAppMessage = `*CONFIRMATION DE COMMANDE*
*LTC Finance*

Bonjour *${firstName} ${lastName}*,

Votre demande de carte bancaire a bien été reçue.

*— Détails de la commande —*
━━━━━━━━━━━━━━━━━━
*Référence:* ${orderRef}
*Carte:* ${cardLabel}
*Mode de réception:* ${deliveryLabel}
*Montant total:* ${total?.toLocaleString() || 0} FCFA

*— Prochaines étapes —*
Notre équipe vous contactera dans les 24h pour finaliser votre commande et organiser le paiement.

*— Questions? —*
Répondez directement à ce message ou appelez le +237 673 209 375.

Merci de votre confiance.
_L'équipe LTC Finance_`;

    await sendWhatsApp(clientPhone, clientWhatsAppMessage);

    // =====================
    // 3. CLIENT EMAIL CONFIRMATION
    // =====================
    const clientEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #10151e 0%, #1B2233 100%); padding: 30px; text-align: center; }
    .header h1 { color: #cea427; margin: 0; font-size: 24px; }
    .header p { color: #fff; margin: 10px 0 0 0; }
    .content { padding: 30px; }
    .order-ref { background: #f8f9fa; border-left: 4px solid #cea427; padding: 15px; margin: 20px 0; }
    .order-ref strong { color: #cea427; }
    .details { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .details h3 { color: #10151e; margin-top: 0; border-bottom: 2px solid #cea427; padding-bottom: 10px; display: flex; align-items: center; gap: 10px; }
    .details table { width: 100%; border-collapse: collapse; }
    .details td { padding: 8px 0; }
    .details td:last-child { text-align: right; font-weight: bold; }
    .total { background: #10151e; color: #fff; padding: 15px 20px; border-radius: 8px; margin: 20px 0; }
    .total td { color: #fff; padding: 5px 0; }
    .total td:last-child { color: #cea427; font-size: 20px; }
    .next-steps { background: #e8f5e9; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .next-steps h3 { color: #2e7d32; margin-top: 0; display: flex; align-items: center; gap: 10px; }
    .footer { background: #10151e; color: #888; padding: 20px; text-align: center; font-size: 12px; }
    .footer a { color: #cea427; }
    .icon { display: inline-block; width: 20px; height: 20px; border-radius: 4px; text-align: center; line-height: 20px; font-size: 12px; font-weight: bold; color: #fff; }
    .icon-card { background: #cea427; }
    .icon-check { background: #28a745; }
    .icon-phone { background: #2e7d32; }
    .icon-info { background: #17a2b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LTC Finance</h1>
      <p>Confirmation de commande</p>
    </div>
    <div class="content">
      <p>Bonjour <strong>${firstName} ${lastName}</strong>,</p>
      <p>Nous avons bien reçu votre demande de carte bancaire. Voici le récapitulatif de votre commande :</p>

      <div class="order-ref">
        <span class="icon icon-check">&#10003;</span>
        <strong>Référence de commande :</strong> ${orderRef}
      </div>

      <div class="details">
        <h3><span class="icon icon-card">&#9830;</span> Détails de la commande</h3>
        <table>
          <tr><td>Type de carte</td><td>${cardLabel}</td></tr>
          <tr><td>Mode de réception</td><td>${deliveryLabel}</td></tr>
          ${deliveryAddress ? `<tr><td>Adresse de livraison</td><td>${deliveryAddress}</td></tr>` : ""}
        </table>
      </div>

      <div class="total">
        <table>
          <tr><td>Carte</td><td>${cardPrice?.toLocaleString() || 0} FCFA</td></tr>
          ${deliveryFee > 0 ? `<tr><td>Livraison</td><td>${deliveryFee?.toLocaleString()} FCFA</td></tr>` : ""}
          ${niuFee > 0 ? `<tr><td>Service NIU</td><td>${niuFee?.toLocaleString()} FCFA</td></tr>` : ""}
          <tr style="border-top: 1px solid rgba(255,255,255,0.2);"><td><strong>TOTAL</strong></td><td>${total?.toLocaleString() || 0} FCFA</td></tr>
        </table>
      </div>

      <div class="next-steps">
        <h3><span class="icon icon-phone">&#9742;</span> Prochaines étapes</h3>
        <p>Notre équipe vous contactera dans les <strong>24 heures</strong> pour :</p>
        <ul>
          <li>Vérifier vos informations</li>
          <li>Organiser le paiement</li>
          <li>Planifier la livraison ou le retrait de votre carte</li>
        </ul>
      </div>

      <p><span class="icon icon-info">?</span> Des questions ? Contactez-nous :</p>
      <ul>
        <li>WhatsApp : <a href="https://wa.me/237673209375">+237 673 209 375</a></li>
        <li>Email : <a href="mailto:contact@ltcgroup.site">contact@ltcgroup.site</a></li>
      </ul>

      <p>Merci de votre confiance !</p>
      <p><em>L'équipe LTC Finance</em></p>
    </div>
    <div class="footer">
      <p>LTC GROUP SARL - Connecting Africa to the World</p>
      <p><a href="https://ltcgroup.site">www.ltcgroup.site</a></p>
    </div>
  </div>
</body>
</html>`;

    try {
      await transporter.sendMail({
        from: '"LTC Finance" <noreply@ltcgroup.site>',
        to: email,
        subject: `Confirmation de commande ${orderRef} - LTC Finance`,
        html: clientEmailHtml,
      });
    } catch (emailError) {
      console.error("Client email error:", emailError);
      // Continue even if email fails
    }

    // =====================
    // 4. TEAM EMAIL NOTIFICATION
    // =====================
    const teamEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #10151e; padding: 20px; text-align: center; }
    .header h1 { color: #cea427; margin: 0; }
    .content { padding: 20px; }
    .alert { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .section { background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .section h3 { margin-top: 0; color: #10151e; border-bottom: 2px solid #cea427; padding-bottom: 8px; display: flex; align-items: center; gap: 10px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 0; vertical-align: top; }
    td:first-child { font-weight: bold; width: 40%; color: #666; }
    .total-box { background: #10151e; color: #fff; padding: 15px; border-radius: 8px; text-align: center; }
    .total-box .amount { font-size: 28px; color: #cea427; font-weight: bold; }
    .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    .icon { display: inline-block; width: 22px; height: 22px; border-radius: 4px; text-align: center; line-height: 22px; font-size: 12px; font-weight: bold; color: #fff; }
    .icon-card { background: #cea427; }
    .icon-user { background: #6c757d; }
    .icon-doc { background: #17a2b8; }
    .icon-truck { background: #28a745; }
    .status-ok { color: #28a745; font-weight: bold; }
    .status-no { color: #dc3545; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nouvelle Demande de Carte</h1>
    </div>
    <div class="content">
      <div class="alert">
        <strong>&#9656; Nouvelle commande reçue</strong><br>
        Référence: <strong>${orderRef}</strong>
      </div>

      <div class="section">
        <h3><span class="icon icon-card">&#9830;</span> Carte demandée</h3>
        <p style="font-size: 18px; font-weight: bold; color: #cea427;">${cardLabel}</p>
      </div>

      <div class="section">
        <h3><span class="icon icon-user">&#9679;</span> Informations personnelles</h3>
        <table>
          <tr><td>Nom complet</td><td>${firstName} ${lastName}</td></tr>
          <tr><td>Date de naissance</td><td>${birthDate}</td></tr>
          <tr><td>Ville de naissance</td><td>${birthCity}</td></tr>
          <tr><td>Ville-Quartier</td><td>${cityNeighborhood}</td></tr>
          <tr><td>Téléphone</td><td><a href="tel:${phone}">${phone}</a></td></tr>
          <tr><td>Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td>Profession</td><td>${profession}</td></tr>
        </table>
      </div>

      <div class="section">
        <h3><span class="icon icon-doc">&#9998;</span> Documents</h3>
        <table>
          <tr><td>N° CNI/Passeport</td><td>${idNumber}</td></tr>
          <tr><td>NIU</td><td>${noNiu ? '<span class="status-no">&#10007; N\'a pas de NIU (+3 000 FCFA)</span>' : registrationNumber}</td></tr>
          <tr><td>Nom du père</td><td>${fatherName}</td></tr>
          <tr><td>Nom de la mère</td><td>${motherName}</td></tr>
          <tr><td>Photo CNI</td><td>${idPhoto ? '<span class="status-ok">&#10003; Fournie (voir WhatsApp)</span>' : '<span class="status-no">&#10007; Non fournie</span>'}</td></tr>
          <tr><td>Photo identité</td><td>${passportPhoto ? '<span class="status-ok">&#10003; Fournie (voir WhatsApp)</span>' : '<span class="status-no">&#10007; Non fournie</span>'}</td></tr>
        </table>
      </div>

      <div class="section">
        <h3><span class="icon icon-truck">&#10148;</span> Livraison</h3>
        <table>
          <tr><td>Mode</td><td>${deliveryLabel}</td></tr>
          ${deliveryAddress ? `<tr><td>Adresse</td><td>${deliveryAddress}</td></tr>` : ""}
        </table>
      </div>

      <div class="total-box">
        <div>Total à encaisser</div>
        <div class="amount">${total?.toLocaleString() || 0} FCFA</div>
        <div style="font-size: 12px; margin-top: 10px; opacity: 0.8;">
          Carte: ${cardPrice?.toLocaleString() || 0} FCFA
          ${deliveryFee > 0 ? ` | Livraison: ${deliveryFee?.toLocaleString()} FCFA` : ""}
          ${niuFee > 0 ? ` | NIU: ${niuFee?.toLocaleString()} FCFA` : ""}
        </div>
      </div>

      <p style="text-align: center; margin-top: 20px;">
        <a href="https://wa.me/${clientPhone}" style="display: inline-block; background: #25d366; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          &#9742; Contacter le client sur WhatsApp
        </a>
      </p>
    </div>
    <div class="footer">
      Commande reçue le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}
    </div>
  </div>
</body>
</html>`;

    try {
      await transporter.sendMail({
        from: '"LTC Finance - Commandes" <noreply@ltcgroup.site>',
        to: TEAM_EMAIL,
        subject: `[LTC Finance] Nouvelle commande ${orderRef} - ${firstName} ${lastName} - ${total?.toLocaleString()} FCFA`,
        html: teamEmailHtml,
      });
    } catch (emailError) {
      console.error("Team email error:", emailError);
      // Continue even if email fails
    }

    return NextResponse.json({ success: true, orderRef });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
