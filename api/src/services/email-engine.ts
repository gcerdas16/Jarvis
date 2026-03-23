import { prisma } from "../utils/db";
import { sendEmail } from "./resend-client";
import { canSendEmail, incrementSentCount } from "./warmup-manager";
import { renderTemplate } from "./template-engine";

const MIN_DELAY_MS = 30_000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processEmailQueue(): Promise<void> {
  console.log("[EmailEngine] Processing queue...");

  const activeCampaign = await prisma.campaign.findFirst({
    where: { isActive: true },
  });

  if (!activeCampaign) {
    console.log("[EmailEngine] No active campaign found, skipping");
    return;
  }

  const newProspects = await prisma.prospect.findMany({
    where: { status: "NEW" },
    take: 50,
  });

  for (const prospect of newProspects) {
    if (!(await canSendEmail())) {
      console.log("[EmailEngine] Daily limit reached, stopping");
      break;
    }

    const isUnsubscribed = await prisma.unsubscribe.findUnique({
      where: { email: prospect.email },
    });
    if (isUnsubscribed) {
      await prisma.prospect.update({
        where: { id: prospect.id },
        data: { status: "UNSUBSCRIBED" },
      });
      continue;
    }

    const body = renderTemplate(activeCampaign.bodyTemplate, {
      companyName: prospect.companyName,
      email: prospect.email,
      industry: prospect.industry,
      companyType: prospect.companyType,
      description: prospect.description,
    });

    const subject = renderTemplate(activeCampaign.subjectLine, {
      companyName: prospect.companyName,
      email: prospect.email,
      industry: prospect.industry,
    });

    const messageId = await sendEmail({
      to: prospect.email,
      subject,
      body,
    });

    if (messageId) {
      await prisma.emailSent.create({
        data: {
          prospectId: prospect.id,
          campaignId: activeCampaign.id,
          emailType: "INITIAL",
          subject,
          body,
          sesMessageId: messageId,
        },
      });

      await prisma.prospect.update({
        where: { id: prospect.id },
        data: { status: "CONTACTED" },
      });

      await incrementSentCount();
      console.log(`[EmailEngine] Sent to ${prospect.email}`);
    }

    await sleep(MIN_DELAY_MS);
  }

  console.log("[EmailEngine] Queue processing complete");
}

export async function processFollowUps(): Promise<void> {
  console.log("[EmailEngine] Processing follow-ups...");

  const activeCampaign = await prisma.campaign.findFirst({
    where: { isActive: true },
  });

  if (!activeCampaign) return;

  const followUpConfigs = [
    { currentStatus: "CONTACTED", nextStatus: "FOLLOW_UP_1", template: activeCampaign.followUp1, emailType: "FOLLOW_UP_1" as const, daysAfter: 3 },
    { currentStatus: "FOLLOW_UP_1", nextStatus: "FOLLOW_UP_2", template: activeCampaign.followUp2, emailType: "FOLLOW_UP_2" as const, daysAfter: 5 },
    { currentStatus: "FOLLOW_UP_2", nextStatus: "FOLLOW_UP_3", template: activeCampaign.followUp3, emailType: "FOLLOW_UP_3" as const, daysAfter: 7 },
  ];

  for (const config of followUpConfigs) {
    if (!config.template) continue;
    if (!(await canSendEmail())) break;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.daysAfter);

    const prospects = await prisma.prospect.findMany({
      where: {
        status: config.currentStatus as any,
        updatedAt: { lte: cutoffDate },
      },
      take: 20,
    });

    for (const prospect of prospects) {
      if (!(await canSendEmail())) break;

      const body = renderTemplate(config.template, {
        companyName: prospect.companyName,
        email: prospect.email,
        industry: prospect.industry,
      });

      const messageId = await sendEmail({
        to: prospect.email,
        subject: `Re: ${activeCampaign.subjectLine}`,
        body,
      });

      if (messageId) {
        await prisma.emailSent.create({
          data: {
            prospectId: prospect.id,
            campaignId: activeCampaign.id,
            emailType: config.emailType,
            subject: `Re: ${activeCampaign.subjectLine}`,
            body,
            sesMessageId: messageId,
          },
        });

        await prisma.prospect.update({
          where: { id: prospect.id },
          data: { status: config.nextStatus as any },
        });

        await incrementSentCount();
      }

      await sleep(MIN_DELAY_MS);
    }
  }

  console.log("[EmailEngine] Follow-ups complete");
}
