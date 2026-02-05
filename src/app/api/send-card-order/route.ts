import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { saveOrder } from "@/lib/supabase";

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
      shippingCity,
      noNiu,
      cardPrice,
      deliveryFee,
      niuFee,
      total,
      idPhoto,
      idPhotoName,
      passportPhoto,
      passportPhotoName,
      paymentStatus,
      paymentMethod,
      orderRef: providedOrderRef, // Accept existing orderRef if provided
    } = body;

    // Payment status labels
    const paymentStatusLabels: Record<string, string> = {
      SUCCESS: "✅ PAYÉ",
      PENDING: "⏳ En attente",
      FAILED: "❌ Échoué",
      NOT_PAID: "💳 Non payé",
    };
    const paymentStatusLabel = paymentStatusLabels[paymentStatus] || paymentStatusLabels["NOT_PAID"];

    const paymentMethodLabels: Record<string, string> = {
      mobile_money: "Mobile Money",
      enkap: "E-nkap",
    };
    const paymentMethodLabel = paymentMethod ? paymentMethodLabels[paymentMethod] || paymentMethod : "Non spécifié";

    // Build delivery option label
    const deliveryLabels: Record<string, string> = {
      pickup_douala: "Retrait en agence - Douala",
      pickup_yaounde: "Retrait en agence - Yaoundé",
      delivery_douala: "Livraison à domicile - Douala (+1 500 FCFA)",
      delivery_yaounde: "Livraison à domicile - Yaoundé (+1 500 FCFA)",
      shipping: "Expédition",
    };
    let deliveryLabel = deliveryLabels[deliveryOption] || deliveryOption;
    if (deliveryOption === "shipping" && shippingCity) {
      deliveryLabel = `Expédition vers ${shippingCity}`;
    }

    // Card type labels
    const cardLabels: Record<string, string> = {
      "ACCESS_MASTERCARD_12500": "Access Bank Mastercard",
      "UBA_SEGMENT1_2ANS_10000": "UBA Visa Segment 1 (2 ans - Plafond 2.5M)",
      "UBA_SEGMENT1_3ANS_12500": "UBA Visa Segment 1 (3 ans - Plafond 2.5M)",
      "UBA_SEGMENT2_15000": "UBA Visa Segment 2 (Plafond 4M)",
      "UBA_SEGMENT3_25000": "UBA Visa Segment 3 (Plafond 10M)",
    };
    const cardLabel = cardLabels[cardType] || cardType;

    // Use provided orderRef or generate a new one
    const orderRef = providedOrderRef || `LTC-${Date.now().toString(36).toUpperCase()}`;

    // =====================
    // 1. TEAM WHATSAPP MESSAGE
    // =====================
    const teamMessage = `*[NOUVELLE DEMANDE DE CARTE]*
*Réf: ${orderRef}*

*Type de carte:* ${cardLabel}
*Statut paiement:* ${paymentStatusLabel}
*Moyen de paiement:* ${paymentMethodLabel}

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
    const iconBaseUrl = "https://ltcgroup.site/email-icons";

    const clientEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #fff;">
    <tr>
      <td style="background: #10151e; padding: 30px; text-align: center;">
        <h1 style="color: #cea427; margin: 0; font-size: 24px;">LTC Finance</h1>
        <p style="color: #fff; margin: 10px 0 0 0;">Confirmation de commande</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <p>Bonjour <strong>${firstName} ${lastName}</strong>,</p>
        <p>Nous avons bien reçu votre demande de carte bancaire. Voici le récapitulatif de votre commande :</p>

        <table width="100%" cellpadding="15" cellspacing="0" style="background: #f8f9fa; border-left: 4px solid #28a745; margin: 20px 0;">
          <tr>
            <td>
              <img src="${iconBaseUrl}/check-circle.svg" alt="" width="20" height="20" style="vertical-align: middle; margin-right: 8px;">
              <strong style="color: #28a745;">Référence de commande :</strong> <span style="color: #cea427; font-weight: bold;">${orderRef}</span>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="15" cellspacing="0" style="background: #f8f9fa; border-left: 4px solid #cea427; margin: 20px 0;">
          <tr>
            <td>
              <h3 style="color: #10151e; margin: 0 0 15px 0; border-bottom: 2px solid #cea427; padding-bottom: 10px;">
                <img src="${iconBaseUrl}/credit-card.svg" alt="" width="20" height="20" style="vertical-align: middle; margin-right: 8px;">
                Détails de la commande
              </h3>
              <table width="100%" cellpadding="8" cellspacing="0">
                <tr><td style="color: #666;">Type de carte</td><td style="text-align: right; font-weight: bold;">${cardLabel}</td></tr>
                <tr><td style="color: #666;">Mode de réception</td><td style="text-align: right; font-weight: bold;">${deliveryLabel}</td></tr>
                ${deliveryAddress ? `<tr><td style="color: #666;">Adresse de livraison</td><td style="text-align: right; font-weight: bold;">${deliveryAddress}</td></tr>` : ""}
              </table>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="15" cellspacing="0" style="background: #10151e; margin: 20px 0;">
          <tr>
            <td>
              <table width="100%" cellpadding="5" cellspacing="0">
                <tr><td style="color: #fff;">Carte</td><td style="text-align: right; color: #fff;">${cardPrice?.toLocaleString() || 0} FCFA</td></tr>
                ${deliveryFee > 0 ? `<tr><td style="color: #fff;">Livraison</td><td style="text-align: right; color: #fff;">${deliveryFee?.toLocaleString()} FCFA</td></tr>` : ""}
                ${niuFee > 0 ? `<tr><td style="color: #fff;">Service NIU</td><td style="text-align: right; color: #fff;">${niuFee?.toLocaleString()} FCFA</td></tr>` : ""}
                <tr style="border-top: 1px solid rgba(255,255,255,0.2);"><td style="color: #fff;"><strong>TOTAL</strong></td><td style="text-align: right; color: #cea427; font-size: 20px; font-weight: bold;">${total?.toLocaleString() || 0} FCFA</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="15" cellspacing="0" style="background: #e8f5e9; border-left: 4px solid #28a745; margin: 20px 0;">
          <tr>
            <td>
              <h3 style="color: #2e7d32; margin: 0 0 10px 0;">
                <img src="${iconBaseUrl}/steps.svg" alt="" width="20" height="20" style="vertical-align: middle; margin-right: 8px;">
                Prochaines étapes
              </h3>
              <p style="margin: 0;">Notre équipe vous contactera dans les <strong>24 heures</strong> pour :</p>
              <ul style="margin: 10px 0;">
                <li>Vérifier vos informations</li>
                <li>Organiser le paiement</li>
                <li>Planifier la livraison ou le retrait de votre carte</li>
              </ul>
            </td>
          </tr>
        </table>

        <p><strong>Des questions ?</strong> Contactez-nous :</p>
        <table cellpadding="5" cellspacing="0">
          <tr>
            <td><img src="${iconBaseUrl}/whatsapp.svg" alt="" width="18" height="18" style="vertical-align: middle;"></td>
            <td><a href="https://wa.me/237673209375" style="color: #cea427;">+237 673 209 375</a></td>
          </tr>
          <tr>
            <td><img src="${iconBaseUrl}/email.svg" alt="" width="18" height="18" style="vertical-align: middle;"></td>
            <td><a href="mailto:contact@ltcgroup.site" style="color: #cea427;">contact@ltcgroup.site</a></td>
          </tr>
        </table>

        <p style="margin-top: 20px;">Merci de votre confiance !</p>
        <p><em>L'équipe LTC Finance</em></p>
      </td>
    </tr>
    <tr>
      <td style="background: #10151e; color: #888; padding: 20px; text-align: center; font-size: 12px;">
        <p style="margin: 0;">LTC GROUP SARL - Connecting Africa to the World</p>
        <p style="margin: 5px 0 0 0;"><a href="https://ltcgroup.site" style="color: #cea427;">www.ltcgroup.site</a></p>
      </td>
    </tr>
  </table>
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
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #fff;">
    <tr>
      <td style="background: #10151e; padding: 20px; text-align: center;">
        <h1 style="color: #cea427; margin: 0;">Nouvelle Demande de Carte</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px;">
        <table width="100%" cellpadding="15" cellspacing="0" style="background: #fff3cd; border: 1px solid #ffc107; margin: 15px 0;">
          <tr>
            <td>
              <img src="${iconBaseUrl}/alert.svg" alt="" width="20" height="20" style="vertical-align: middle; margin-right: 8px;">
              <strong>Nouvelle commande reçue</strong><br>
              <span style="margin-left: 28px;">Référence: <strong>${orderRef}</strong></span>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="15" cellspacing="0" style="background: ${paymentStatus === 'SUCCESS' ? '#d4edda' : paymentStatus === 'FAILED' ? '#f8d7da' : '#e2e3e5'}; border: 1px solid ${paymentStatus === 'SUCCESS' ? '#28a745' : paymentStatus === 'FAILED' ? '#dc3545' : '#6c757d'}; margin: 15px 0;">
          <tr>
            <td style="text-align: center;">
              <div style="font-size: 24px; margin-bottom: 5px;">${paymentStatus === 'SUCCESS' ? '✅' : paymentStatus === 'FAILED' ? '❌' : '⏳'}</div>
              <strong style="font-size: 16px; color: ${paymentStatus === 'SUCCESS' ? '#155724' : paymentStatus === 'FAILED' ? '#721c24' : '#383d41'};">
                ${paymentStatusLabel}
              </strong>
              <div style="font-size: 12px; color: #666; margin-top: 5px;">via ${paymentMethodLabel}</div>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="15" cellspacing="0" style="background: #f8f9fa; margin: 15px 0;">
          <tr>
            <td>
              <h3 style="margin: 0 0 15px 0; color: #10151e; border-bottom: 2px solid #cea427; padding-bottom: 8px;">
                <img src="${iconBaseUrl}/credit-card.svg" alt="" width="20" height="20" style="vertical-align: middle; margin-right: 8px;">
                Carte demandée
              </h3>
              <p style="font-size: 18px; font-weight: bold; color: #cea427; margin: 0;">${cardLabel}</p>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="15" cellspacing="0" style="background: #f8f9fa; margin: 15px 0;">
          <tr>
            <td>
              <h3 style="margin: 0 0 15px 0; color: #10151e; border-bottom: 2px solid #cea427; padding-bottom: 8px;">
                <img src="${iconBaseUrl}/user.svg" alt="" width="20" height="20" style="vertical-align: middle; margin-right: 8px;">
                Informations personnelles
              </h3>
              <table width="100%" cellpadding="6" cellspacing="0">
                <tr><td style="font-weight: bold; width: 40%; color: #666;">Nom complet</td><td>${firstName} ${lastName}</td></tr>
                <tr><td style="font-weight: bold; width: 40%; color: #666;">Date de naissance</td><td>${birthDate}</td></tr>
                <tr><td style="font-weight: bold; width: 40%; color: #666;">Ville de naissance</td><td>${birthCity}</td></tr>
                <tr><td style="font-weight: bold; width: 40%; color: #666;">Ville-Quartier</td><td>${cityNeighborhood}</td></tr>
                <tr><td style="font-weight: bold; width: 40%; color: #666;">Téléphone</td><td><a href="tel:${phone}">${phone}</a></td></tr>
                <tr><td style="font-weight: bold; width: 40%; color: #666;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
                <tr><td style="font-weight: bold; width: 40%; color: #666;">Profession</td><td>${profession}</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="15" cellspacing="0" style="background: #f8f9fa; margin: 15px 0;">
          <tr>
            <td>
              <h3 style="margin: 0 0 15px 0; color: #10151e; border-bottom: 2px solid #cea427; padding-bottom: 8px;">
                <img src="${iconBaseUrl}/document.svg" alt="" width="20" height="20" style="vertical-align: middle; margin-right: 8px;">
                Documents
              </h3>
              <table width="100%" cellpadding="6" cellspacing="0">
                <tr><td style="font-weight: bold; width: 40%; color: #666;">N° CNI/Passeport</td><td>${idNumber}</td></tr>
                <tr><td style="font-weight: bold; width: 40%; color: #666;">NIU</td><td>${noNiu ? `<img src="${iconBaseUrl}/cross.svg" alt="" width="16" height="16" style="vertical-align: middle;"> N'a pas de NIU (+3 000 FCFA)` : registrationNumber}</td></tr>
                <tr><td style="font-weight: bold; width: 40%; color: #666;">Nom du père</td><td>${fatherName}</td></tr>
                <tr><td style="font-weight: bold; width: 40%; color: #666;">Nom de la mère</td><td>${motherName}</td></tr>
                <tr><td style="font-weight: bold; width: 40%; color: #666;">Photo CNI</td><td>${idPhoto ? `<img src="${iconBaseUrl}/check-circle.svg" alt="" width="16" height="16" style="vertical-align: middle;"> En pièce jointe` : `<img src="${iconBaseUrl}/cross.svg" alt="" width="16" height="16" style="vertical-align: middle;"> Non fournie`}</td></tr>
                <tr><td style="font-weight: bold; width: 40%; color: #666;">Photo identité</td><td>${passportPhoto ? `<img src="${iconBaseUrl}/check-circle.svg" alt="" width="16" height="16" style="vertical-align: middle;"> En pièce jointe` : `<img src="${iconBaseUrl}/cross.svg" alt="" width="16" height="16" style="vertical-align: middle;"> Non fournie`}</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="15" cellspacing="0" style="background: #f8f9fa; margin: 15px 0;">
          <tr>
            <td>
              <h3 style="margin: 0 0 15px 0; color: #10151e; border-bottom: 2px solid #cea427; padding-bottom: 8px;">
                <img src="${iconBaseUrl}/truck.svg" alt="" width="20" height="20" style="vertical-align: middle; margin-right: 8px;">
                Livraison
              </h3>
              <table width="100%" cellpadding="6" cellspacing="0">
                <tr><td style="font-weight: bold; width: 40%; color: #666;">Mode</td><td>${deliveryLabel}</td></tr>
                ${deliveryAddress ? `<tr><td style="font-weight: bold; width: 40%; color: #666;">Adresse</td><td>${deliveryAddress}</td></tr>` : ""}
              </table>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="15" cellspacing="0" style="background: #10151e; margin: 15px 0; text-align: center;">
          <tr>
            <td>
              <div style="color: #fff;">Total à encaisser</div>
              <div style="font-size: 28px; color: #cea427; font-weight: bold;">${total?.toLocaleString() || 0} FCFA</div>
              <div style="font-size: 12px; margin-top: 10px; color: rgba(255,255,255,0.8);">
                Carte: ${cardPrice?.toLocaleString() || 0} FCFA
                ${deliveryFee > 0 ? ` | Livraison: ${deliveryFee?.toLocaleString()} FCFA` : ""}
                ${niuFee > 0 ? ` | NIU: ${niuFee?.toLocaleString()} FCFA` : ""}
              </div>
            </td>
          </tr>
        </table>

        <p style="text-align: center; margin-top: 20px;">
          <a href="https://wa.me/${clientPhone}" style="display: inline-block; background: #25d366; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold;">
            <img src="${iconBaseUrl}/whatsapp.svg" alt="" width="18" height="18" style="vertical-align: middle; margin-right: 8px;">
            Contacter le client sur WhatsApp
          </a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        Commande reçue le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      // Prepare email attachments from uploaded photos
      const attachments = [];

      if (idPhoto) {
        const matches = idPhoto.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const extension = mimeType.split('/')[1] || 'jpg';
          attachments.push({
            filename: idPhotoName || `CNI_${firstName}_${lastName}.${extension}`,
            content: base64Data,
            encoding: 'base64',
            contentType: mimeType,
          });
        }
      }

      if (passportPhoto) {
        const matches = passportPhoto.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const extension = mimeType.split('/')[1] || 'jpg';
          attachments.push({
            filename: passportPhotoName || `Photo_${firstName}_${lastName}.${extension}`,
            content: base64Data,
            encoding: 'base64',
            contentType: mimeType,
          });
        }
      }

      await transporter.sendMail({
        from: '"LTC Finance - Commandes" <noreply@ltcgroup.site>',
        to: TEAM_EMAIL,
        subject: `[LTC Finance] Nouvelle commande ${orderRef} - ${firstName} ${lastName} - ${total?.toLocaleString()} FCFA`,
        html: teamEmailHtml,
        attachments: attachments,
      });
    } catch (emailError) {
      console.error("Team email error:", emailError);
      // Continue even if email fails
    }

    // =====================
    // 5. SAVE ORDER TO DATABASE
    // =====================
    try {
      await saveOrder({
        order_ref: orderRef,
        card_type: cardType,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        birth_city: birthCity,
        city_neighborhood: cityNeighborhood,
        phone,
        email,
        profession,
        id_number: idNumber,
        registration_number: registrationNumber || null,
        father_name: fatherName,
        mother_name: motherName,
        delivery_option: deliveryOption,
        delivery_address: deliveryAddress || null,
        shipping_city: shippingCity || null,
        no_niu: noNiu || false,
        card_price: cardPrice || 0,
        delivery_fee: deliveryFee || 0,
        niu_fee: niuFee || 0,
        total: total || 0,
        payment_status: paymentStatus || 'NOT_PAID',
        payment_method: paymentMethod || null,
      });
    } catch (dbError) {
      console.error("Database save error:", dbError);
      // Continue even if database save fails - notifications were already sent
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
