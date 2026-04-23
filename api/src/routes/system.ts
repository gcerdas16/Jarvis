import { Router } from "express";
import { prisma } from "../utils/db";
import { todayCR, addDays } from "../utils/timezone";

export const systemRouter = Router();

systemRouter.get("/health", async (_req, res) => {
  try {
    const today = todayCR();
    const weekStart = addDays(today, -7);
    const monthStart = addDays(today, -30);
    const todayEnd = addDays(today, 1);

    const [
      warmup,
      serperToday,
      serperWeek,
      serperMonth,
      emailEventGroups,
      recentEmailEvents,
      emailsSentToday,
      emailsSentWeek,
      latestJobs,
    ] = await Promise.all([
      prisma.warmupState.findFirst(),
      prisma.searchJob.count({ where: { searchedAt: { gte: today, lt: todayEnd } } }),
      prisma.searchJob.count({ where: { searchedAt: { gte: weekStart } } }),
      prisma.searchJob.count({ where: { searchedAt: { gte: monthStart } } }),
      prisma.emailEvent.groupBy({
        by: ["eventType"],
        where: { occurredAt: { gte: today, lt: todayEnd } },
        _count: { id: true },
      }),
      prisma.emailEvent.findMany({
        where: { occurredAt: { gte: today, lt: todayEnd } },
        orderBy: { occurredAt: "desc" },
        take: 40,
        include: {
          emailSent: {
            select: {
              emailType: true,
              prospect: { select: { email: true, companyName: true } },
            },
          },
        },
      }),
      prisma.emailSent.count({ where: { sentAt: { gte: today, lt: todayEnd } } }),
      prisma.emailSent.count({ where: { sentAt: { gte: weekStart } } }),
      prisma.$queryRaw<{ jobType: string; status: string; startedAt: Date; result: string | null; durationMs: number | null }[]>`
        SELECT DISTINCT ON ("job_type") "job_type" as "jobType", status, "started_at" as "startedAt", result, "duration_ms" as "durationMs"
        FROM job_runs ORDER BY "job_type", "started_at" DESC
      `,
    ]);

    const eventsByType: Record<string, number> = {};
    for (const e of emailEventGroups) {
      eventsByType[e.eventType] = e._count.id;
    }

    res.json({
      success: true,
      data: {
        warmup: {
          emailsPaused: warmup?.emailsPaused ?? false,
          emailsSentToday,
          dailyLimit: warmup?.currentDailyLimit ?? 90,
          emailsSentWeek,
        },
        serper: {
          searchesToday: serperToday,
          searchesWeek: serperWeek,
          searchesMonth: serperMonth,
        },
        resend: {
          eventsByType,
          recentEvents: recentEmailEvents.map((e) => ({
            id: e.id,
            eventType: e.eventType,
            occurredAt: e.occurredAt,
            prospect: e.emailSent?.prospect ?? null,
            emailType: e.emailSent?.emailType ?? null,
          })),
        },
        jobs: latestJobs,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch system health" });
  }
});
