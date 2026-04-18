import { Router, Request, Response } from "express";
import { Webhook } from "svix";
import { prisma } from "../utils/db";

export const webhooksRouter = Router();

// POST /api/webhooks/resend
webhooksRouter.post("/resend", async (req: Request, res: Response) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  const wh = new Webhook(secret);
  let payload: Record<string, unknown>;

  try {
    payload = wh.verify((req as any).rawBody ?? Buffer.from(JSON.stringify(req.body)), {
      "svix-id": req.headers["svix-id"] as string,
      "svix-timestamp": req.headers["svix-timestamp"] as string,
      "svix-signature": req.headers["svix-signature"] as string,
    }) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  const type = payload.type as string;
  const data = payload.data as Record<string, unknown>;

  const eventMap: Record<string, string> = {
    "email.delivered": "DELIVERED",
    "email.opened": "OPENED",
    "email.clicked": "CLICKED",
    "email.bounced": "BOUNCED",
    "email.complained": "COMPLAINED",
  };

  const eventType = eventMap[type];
  if (!eventType) {
    res.status(200).json({ received: true, ignored: true });
    return;
  }

  const messageId = data.email_id as string;
  const emailSent = await prisma.emailSent.findFirst({
    where: { sesMessageId: messageId },
  });

  if (emailSent) {
    await prisma.emailEvent.create({
      data: {
        emailSentId: emailSent.id,
        eventType: eventType as any,
        metadata: JSON.stringify(data),
      },
    });

    if (eventType === "BOUNCED") {
      await prisma.prospect.update({
        where: { id: emailSent.prospectId },
        data: { status: "BOUNCED" },
      });
    }
  }

  res.status(200).json({ received: true });
});
