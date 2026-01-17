import { NextRequest, NextResponse } from "next/server";

const WAZEAPP_API_URL = "https://api.wazeapp.xyz/api/v1/external";
const WAZEAPP_API_KEY = "wz_live_aNS-uHJqontSvzaxQbzULpzBNHMjsK-xDAPQ5OYuDTs";
const RECIPIENT_PHONE = "237673209375";

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

    // Build WhatsApp message
    const message = `*🎴 DEMANDE DE CARTE VISA PREPAYEE*

*Type de carte:* ${cardType}

*👤 INFORMATIONS PERSONNELLES*
━━━━━━━━━━━━━━━━━━
*Prénom:* ${firstName}
*Nom:* ${lastName}
*Date de naissance:* ${birthDate}
*Ville de naissance:* ${birthCity}
*Ville-Quartier:* ${cityNeighborhood}
*Téléphone:* ${phone}
*Email:* ${email}
*Profession:* ${profession}

*📄 DOCUMENTS*
━━━━━━━━━━━━━━━━━━
*N° CNI/Récépissé/Passeport:* ${idNumber}
*Attestation/NIU:* ${noNiu ? "❌ N'a pas de NIU (service +3 000 FCFA)" : registrationNumber}
*Nom du père:* ${fatherName}
*Nom de la mère:* ${motherName}

*🚚 LIVRAISON*
━━━━━━━━━━━━━━━━━━
*Mode de réception:* ${deliveryLabel}
${deliveryAddress ? `*Adresse:* ${deliveryAddress}` : ""}

*💰 RECAPITULATIF*
━━━━━━━━━━━━━━━━━━
Carte: ${cardPrice?.toLocaleString() || 0} FCFA
${deliveryFee > 0 ? `Livraison: ${deliveryFee?.toLocaleString()} FCFA` : ""}
${niuFee > 0 ? `Service NIU: ${niuFee?.toLocaleString()} FCFA` : ""}
*TOTAL: ${total?.toLocaleString() || 0} FCFA*

_⏳ En attente des photos CNI et photo d'identité du client._`;

    // Send via WazeApp API
    const response = await fetch(`${WAZEAPP_API_URL}/send/immediate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": WAZEAPP_API_KEY,
      },
      body: JSON.stringify({
        to: RECIPIENT_PHONE,
        message: message,
        type: "text",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("WazeApp API Error:", result);
      return NextResponse.json(
        { success: false, error: result.message || "Failed to send message" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
