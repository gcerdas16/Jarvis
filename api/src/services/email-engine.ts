import { ProspectStatus } from "@prisma/client";
import { prisma } from "../utils/db";
import { sendEmail } from "./resend-client";
import { canSendEmail, incrementSentCount } from "./warmup-manager";
import { renderTemplate } from "./template-engine";
import { todayCR, addDays } from "../utils/timezone";

const MIN_DELAY_MS = 30_000;
const INITIAL_DAILY = 60;
const FOLLOWUP_DAILY = 30;
let isProcessingQueue = false;
let isProcessingFollowUps = false;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isEmailsPaused(): Promise<boolean> {
  const warmup = await prisma.warmupState.findFirst();
  return warmup?.emailsPaused ?? false;
}

export async function processEmailQueue(): Promise<{ emailsSent: number; bounces: number }> {
  if (isProcessingQueue) {
    console.log("[EmailEngine] Queue already processing, skipping");
    return { emailsSent: 0, bounces: 0 };
  }
  if (await isEmailsPaused()) {
    console.log("[EmailEngine] Emails paused, skipping queue");
    return { emailsSent: 0, bounces: 0 };
  }
  isProcessingQueue = true;
  console.log("[EmailEngine] Processing queue...");

  const activeCampaign = await prisma.campaign.findFirst({
    where: { isActive: true },
  });

  if (!activeCampaign) {
    console.log("[EmailEngine] No active campaign found, skipping");
    isProcessingQueue = false;
    return { emailsSent: 0, bounces: 0 };
  }

  let emailsSent = 0;

  try {
    const todayStart = todayCR();
    const todayEnd = addDays(todayStart, 1);

    const confirmedBatch = await prisma.dailyBatch.findMany({
      where: { batchDate: { gte: todayStart, lt: todayEnd }, confirmed: true },
      include: { prospect: true },
    });

    const newProspects = confirmedBatch.length > 0
      ? confirmedBatch.map((b) => b.prospect).filter((p) => p.status === "NEW")
      : await prisma.prospect.findMany({ where: { status: "NEW" }, take: INITIAL_DAILY });

    const subject = activeCampaign.subjectLine.replace(/[\n\r]/g, "").trim();

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
        industry: prospect.industry,
        companyType: prospect.companyType,
        description: prospect.description,
      });

      const messageId = await sendEmail({ to: prospect.email, subject, body });

      if (messageId) {
        await prisma.$transaction([
          prisma.emailSent.create({
            data: {
              prospectId: prospect.id,
              campaignId: activeCampaign.id,
              emailType: "INITIAL",
              subject,
              body,
              sesMessageId: messageId,
            },
          }),
          prisma.prospect.update({
            where: { id: prospect.id },
            data: { status: "CONTACTED" },
          }),
          prisma.prospectStatusHistory.create({
            data: {
              prospectId: prospect.id,
              fromStatus: "NEW",
              toStatus: "CONTACTED",
              changedBy: "system",
            },
          }),
        ]);
        emailsSent++;
        await incrementSentCount();
      }

      await sleep(MIN_DELAY_MS);
    }

    console.log("[EmailEngine] Queue processing complete");
  } finally {
    isProcessingQueue = false;
  }

  return { emailsSent, bounces: 0 };
}

export async function processFollowUps(): Promise<{ emailsSent: number }> {
  if (isProcessingFollowUps) {
    console.log("[EmailEngine] Follow-ups already processing, skipping");
    return { emailsSent: 0 };
  }
  if (await isEmailsPaused()) {
    console.log("[EmailEngine] Emails paused, skipping follow-ups");
    return { emailsSent: 0 };
  }
  isProcessingFollowUps = true;
  console.log("[EmailEngine] Processing follow-ups...");

  const activeCampaign = await prisma.campaign.findFirst({
    where: { isActive: true },
  });

  if (!activeCampaign) {
    isProcessingFollowUps = false;
    return { emailsSent: 0 };
  }

  let emailsSent = 0;

  try {
    const subject = `Re: ${activeCampaign.subjectLine.replace(/[\n\r]/g, "").trim()}`;

    // Process FU3 first so advanced prospects aren't blocked by the large FU1 backlog
    const followUpConfigs = [
      { currentStatus: ProspectStatus.FOLLOW_UP_2, nextStatus: ProspectStatus.FOLLOW_UP_3, template: activeCampaign.followUp3, emailType: "FOLLOW_UP_3" as const, daysAfter: 7 },
      { currentStatus: ProspectStatus.FOLLOW_UP_1, nextStatus: ProspectStatus.FOLLOW_UP_2, template: activeCampaign.followUp2, emailType: "FOLLOW_UP_2" as const, daysAfter: 15 },
      { currentStatus: ProspectStatus.CONTACTED, nextStatus: ProspectStatus.FOLLOW_UP_1, template: activeCampaign.followUp1, emailType: "FOLLOW_UP_1" as const, daysAfter: 9 },
    ];

    for (const config of followUpConfigs) {
      if (!config.template) continue;
      if (!(await canSendEmail())) break;

      const cutoffDate = addDays(todayCR(), -config.daysAfter);

      const prospects = await prisma.prospect.findMany({
        where: {
          status: config.currentStatus,
          updatedAt: { lte: cutoffDate },
        },
        take: FOLLOWUP_DAILY,
      });

      for (const prospect of prospects) {
        if (!(await canSendEmail())) break;

        const body = renderTemplate(config.template, { industry: prospect.industry });
        const messageId = await sendEmail({ to: prospect.email, subject, body });

        if (messageId) {
          await prisma.$transaction([
            prisma.emailSent.create({
              data: {
                prospectId: prospect.id,
                campaignId: activeCampaign.id,
                emailType: config.emailType,
                subject,
                body,
                sesMessageId: messageId,
              },
            }),
            prisma.prospect.update({
              where: { id: prospect.id },
              data: { status: config.nextStatus },
            }),
            prisma.prospectStatusHistory.create({
              data: {
                prospectId: prospect.id,
                fromStatus: config.currentStatus,
                toStatus: config.nextStatus,
                changedBy: "system",
              },
            }),
          ]);
          emailsSent++;
          await incrementSentCount();
        }

        await sleep(MIN_DELAY_MS);
      }
    }

    console.log("[EmailEngine] Follow-ups complete");
  } finally {
    isProcessingFollowUps = false;
  }

  return { emailsSent };
}
