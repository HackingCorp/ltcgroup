import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Veuillez remplir tous les champs obligatoires." },
        { status: 400 }
      );
    }

    // Map subject to readable text
    const subjectMap: Record<string, string> = {
      logistics: "Logistique / Import-Export",
      btp: "BTP / Construction",
      ecommerce: "E-commerce",
      digital: "Services Digitaux",
      finance: "Solutions Financières",
      partnership: "Partenariat",
      other: "Autre",
    };

    const subjectText = subjectMap[subject] || subject;

    // Send email to LTC Group
    const { error } = await resend.emails.send({
      from: "LTC Group <contact@ltcgroup.site>",
      to: [process.env.CONTACT_EMAIL || "contact@ltcgroup.site"],
      replyTo: email,
      subject: `[LTC Group] Nouveau message: ${subjectText}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ea2a33; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">LTC GROUP</h1>
          </div>
          <div style="padding: 30px; background-color: #f8f6f6;">
            <h2 style="color: #0f172a; margin-top: 0;">Nouveau message de contact</h2>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px;"><strong>Nom:</strong> ${name}</p>
              <p style="margin: 0 0 10px;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0 0 10px;"><strong>Téléphone:</strong> ${phone || "Non renseigné"}</p>
              <p style="margin: 0;"><strong>Sujet:</strong> ${subjectText}</p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h3 style="color: #0f172a; margin-top: 0;">Message:</h3>
              <p style="color: #475569; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>
          </div>
          <div style="background-color: #0f172a; padding: 15px; text-align: center;">
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">
              Ce message a été envoyé depuis le formulaire de contact de ltcgroup.site
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'envoi du message. Veuillez réessayer." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Message envoyé avec succès!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
