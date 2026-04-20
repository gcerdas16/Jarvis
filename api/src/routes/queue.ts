import { Router } from "express";
import { prisma } from "../utils/db";

export const queueRouter = Router();

// GET /api/queue — tomorrow's planned sends + campaign + limits
queueRouter.get("/", async (_req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const [confirmedBatch, campaign, warmup] = await Promise.all([
      prisma.dailyBatch.findMany({
        where: { batchDate: { gte: tomorrow, lt: tomorrowEnd }, confirmed: true },
        include: { prospect: { include: { source: { select: { name: true } } } } },
      }),
      prisma.campaign.findFirst({ where: { isActive: true } }),
      prisma.warmupState.findFirst(),
    ]);

    const hasBatchConfirmed = confirmedBatch.length > 0;
    const dailyLimit = warmup?.currentDailyLimit ?? 50;

    const initial = hasBatchConfirmed
      ? confirmedBatch.map((b) => b.prospect).filter((p) => p.status === "NEW")
      : await prisma.prospect.findMany({
          where: { status: "NEW" },
          take: dailyLimit,
          include: { source: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        });

    // Follow-ups due tomorrow: updatedAt <= tomorrow - daysAfter
    const followUpConfigs = [
      { status: "CONTACTED", daysAfter: 3, nextType: "FOLLOW_UP_1", templateKey: "followUp1" },
      { status: "FOLLOW_UP_1", daysAfter: 5, nextType: "FOLLOW_UP_2", templateKey: "followUp2" },
      { status: "FOLLOW_UP_2", daysAfter: 7, nextType: "FOLLOW_UP_3", templateKey: "followUp3" },
    ] as const;

    const followUps: {
      id: string; email: string; companyName: string | null; industry: string | null;
      status: string; nextEmailType: string; updatedAt: Date; hasTemplate: boolean;
    }[] = [];

    for (const config of followUpConfigs) {
      const cutoff = new Date(tomorrow);
      cutoff.setDate(cutoff.getDate() - config.daysAfter);
      const hasTemplate = !!(campaign as any)?.[config.templateKey];

      const prospects = await prisma.prospect.findMany({
        where: { status: config.status as any, updatedAt: { lte: cutoff } },
        select: { id: true, email: true, companyName: true, industry: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "asc" },
        take: 100,
      });

      for (const p of prospects) {
        followUps.push({ ...p, nextEmailType: config.nextType, hasTemplate });
      }
    }

    // Respect daily limit: iniciales first, then follow-ups
    const cappedInitial = initial.slice(0, dailyLimit);
    const remainingSlots = Math.max(0, dailyLimit - cappedInitial.length);
    const cappedFollowUps = followUps.slice(0, remainingSlots);

    res.json({
      success: true,
      data: {
        dailyLimit,
        campaign: campaign ? {
          id: campaign.id,
          name: campaign.name,
          subjectLine: campaign.subjectLine,
          bodyTemplate: campaign.bodyTemplate,
          followUp1: campaign.followUp1,
          followUp2: campaign.followUp2,
          followUp3: campaign.followUp3,
        } : null,
        initial: cappedInitial.map((p) => ({
          id: p.id, email: p.email, companyName: p.companyName,
          industry: p.industry, source: (p as any).source?.name ?? "",
        })),
        followUps: cappedFollowUps,
        allFollowUpsDue: followUps.length,
        hasBatchConfirmed,
        totalTomorrow: cappedInitial.length + cappedFollowUps.length,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch queue" });
  }
});
