import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<string | null> {
  const fromAddress = params.from || `Gustavo Cerdas <hola@${process.env.OUTREACH_DOMAIN || "gcwarecr.com"}>`;

  try {
    const replyTo = process.env.REPLY_TO_EMAIL || "gustavocerdas@gcwarecr.com";
    console.log(`[Resend] Sending to ${params.to} | from: ${fromAddress} | replyTo: ${replyTo}`);

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [params.to],
      replyTo: [replyTo],
      subject: params.subject,
      html: params.body,
    });

    if (error) {
      console.error(`[Resend] Failed to send to ${params.to}:`, error.message);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error(`[Resend] Failed to send to ${params.to}:`, error);
    return null;
  }
}
