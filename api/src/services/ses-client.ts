import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<string | null> {
  const fromAddress = params.from || `Gustavo Cerdas <hola@${process.env.OUTREACH_DOMAIN || "gcwaresoluciones.com"}>`;

  try {
    const command = new SendEmailCommand({
      Source: fromAddress,
      Destination: { ToAddresses: [params.to] },
      Message: {
        Subject: { Data: params.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: params.body, Charset: "UTF-8" },
        },
      },
    });

    const result = await ses.send(command);
    return result.MessageId || null;
  } catch (error) {
    console.error(`[SES] Failed to send email to ${params.to}:`, error);
    return null;
  }
}
