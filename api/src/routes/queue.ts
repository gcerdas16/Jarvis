import { Router } from "express";
import { prisma } from "../utils/db";

export const queueRouter = Router();

// GET /api/queue — tomorrow's planned sends
queueRouter.get("/", async (_req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    // Check for confirmed manual batch for tomorrow
    const confirmedBatch = await prisma.dailyBatch.findMany({
      where: { batchDate: { gte: tomorrow, lt: tomorrowEnd }, confirmed: true },
      include: { prospect: { include: { source: { select: { name: true } } } } },
    });

    const hasBatchConfirmed = confirmedBatch.length > 0;

    const initial = hasBatchConfirmed
      ? confirmedBatch.map((b) => b.prospect).filter((p) => p.status === "NEW")
      : await prisma.prospect.findMany({
          where: { status: "NEW" },
          take: 50,
          include: { source: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        });

    // Follow-ups due tomorrow: updatedAt <= tomorrow - daysAfter
    const followUpConfigs = [
      { status: "CONTACTED", daysAfter: 3, nextType: "FOLLOW_UP_1" },
      { status: "FOLLOW_UP_1", daysAfter: 5, nextType: "FOLLOW_UP_2" },
      { status: "FOLLOW_UP_2", daysAfter: 7, nextType: "FOLLOW_UP_3" },
    ] as const;

    const followUps: {
      id: string; email: string; companyName: string | null; industry: string | null;
      status: string; nextEmailType: string; updatedAt: Date;
    }[] = [];

    for (const config of followUpConfigs) {
      const cutoff = new Date(tomorrow);
      cutoff.setDate(cutoff.getDate() - config.daysAfter);

      const prospects = await prisma.prospect.findMany({
        where: { status: config.status as any, updatedAt: { lte: cutoff } },
        select: { id: true, email: true, companyName: true, industry: true, status: true, updatedAt: true },
        take: 50,
      });

      for (const p of prospects) {
        followUps.push({ ...p, nextEmailType: config.nextType });
      }
    }

    res.json({
      success: true,
      data: {
        initial: initial.map((p) => ({
          id: p.id, email: p.email, companyName: p.companyName,
          industry: p.industry, source: p.source.name,
        })),
        followUps,
        hasBatchConfirmed,
        totalTomorrow: initial.length + followUps.length,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch queue" });
  }
});
