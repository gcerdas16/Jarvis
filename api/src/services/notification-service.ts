import { sendEmail } from "./resend-client";

const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || "";

export async function notifyNewResponse(
  prospectEmail: string,
  companyName: string | null,
  bodyPreview: string | null
): Promise<void> {
  if (!NOTIFICATION_EMAIL) {
    console.error("[Notification] NOTIFICATION_EMAIL not set");
    return;
  }

  const subject = `Nueva respuesta de ${companyName || prospectEmail}`;
  const body = `
    <h2>Nuevo prospecto respondió</h2>
    <p><strong>Email:</strong> ${prospectEmail}</p>
    <p><strong>Empresa:</strong> ${companyName || "No disponible"}</p>
    <p><strong>Preview:</strong></p>
    <blockquote>${bodyPreview || "Sin preview disponible"}</blockquote>
    <p>Revisa tu bandeja de entrada de ${process.env.OUTREACH_DOMAIN} para ver la respuesta completa.</p>
  `;

  await sendEmail({
    to: NOTIFICATION_EMAIL,
    subject,
    body,
  });

  console.log(`[Notification] Sent alert for response from ${prospectEmail}`);
}
