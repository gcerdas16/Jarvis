import { Router } from "express";
import { prisma } from "../utils/db";

export const metricsRouter = Router();

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function weekStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/metrics/overview
metricsRouter.get("/overview", async (_req, res) => {
  try {
    const today = todayStart();
    const week = weekStart();

    const [
      emailsSentToday,
      warmup,
      bouncesToday,
      responsesThisWeek,
      scrapeLogsToday,
      latestJobRuns,
      recentEmails,
      recentResponses,
      recentScrape,
    ] = await Promise.all([
      prisma.emailSent.count({ where: { sentAt: { gte: today } } }),
      prisma.warmupState.findFirst(),
      prisma.emailEvent.count({ where: { eventType: "BOUNCED", occurredAt: { gte: today } } }),
      prisma.response.count({ where: { receivedAt: { gte: week } } }),
      prisma.scrapeLog.aggregate({
        where: { startedAt: { gte: today } },
        _sum: { prospectsFound: true, prospectsNew: true },
      }),
      prisma.$queryRaw<{ jobType: string; status: string; startedAt: Date; result: string | null; durationMs: number | null }[]>`
        SELECT DISTINCT ON ("job_type") "job_type" as "jobType", status, "started_at" as "startedAt", result, "duration_ms" as "durationMs"
        FROM job_runs ORDER BY "job_type", "started_at" DESC
      `,
      prisma.emailSent.findMany({
        where: { sentAt: { gte: today } },
        orderBy: { sentAt: "desc" },
        take: 3,
        include: { prospect: { select: { email: true, companyName: true } } },
      }),
      prisma.response.findMany({
        orderBy: { receivedAt: "desc" },
        take: 3,
        include: { prospect: { select: { email: true, companyName: true } } },
      }),
      prisma.scrapeLog.findFirst({ where: { startedAt: { gte: today } }, orderBy: { startedAt: "desc" } }),
    ]);

    const leadsToday = scrapeLogsToday._sum.prospectsFound ?? 0;
    const leadsNew = scrapeLogsToday._sum.prospectsNew ?? 0;
    const dailyLimit = warmup?.currentDailyLimit ?? 50;

    const activity: { type: string; text: string; time: Date }[] = [];
    if (recentEmails.length > 0) {
      activity.push({ type: "email", text: `${emailsSentToday} emails enviados`, time: recentEmails[0].sentAt });
    }
    for (const r of recentResponses.slice(0, 2)) {
      activity.push({ type: "response", text: `Respuesta: ${r.prospect.companyName ?? r.prospect.email}`, time: r.receivedAt });
    }
    if (recentScrape) {
      activity.push({ type: "scraper", text: `Scraper: ${recentScrape.prospectsFound} leads encontrados`, time: recentScrape.startedAt });
    }
    if (bouncesToday > 0) {
      activity.push({ type: "warning", text: `${bouncesToday} bounces detectados`, time: new Date() });
    }
    activity.sort((a, b) => b.time.getTime() - a.time.getTime());

    res.json({
      success: true,
      data: {
        kpis: {
          emailsSentToday,
          dailyLimit,
          leadsToday,
          leadsNew,
          leadsDuplicates: leadsToday - leadsNew,
          responsesThisWeek,
          bouncesToday,
          bounceRate: emailsSentToday > 0 ? ((bouncesToday / emailsSentToday) * 100).toFixed(1) : "0.0",
        },
        activity: activity.slice(0, 8),
        jobs: latestJobRuns,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch overview" });
  }
});

// GET /api/metrics/daily — last 7 days: emails + leads + responses
metricsRouter.get("/daily", async (_req, res) => {
  try {
    const days: { date: string; emails: number; leads: number; responses: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const [emails, leads, responses] = await Promise.all([
        prisma.emailSent.count({ where: { sentAt: { gte: start, lt: end } } }),
        prisma.scrapeLog.aggregate({ where: { startedAt: { gte: start, lt: end } }, _sum: { prospectsNew: true } }),
        prisma.response.count({ where: { receivedAt: { gte: start, lt: end } } }),
      ]);

      const label = i === 0 ? "Hoy" : ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][start.getDay()];
      days.push({ date: label, emails, leads: leads._sum.prospectsNew ?? 0, responses });
    }
    res.json({ success: true, data: { days } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch daily metrics" });
  }
});

// GET /api/metrics/scraper/today
metricsRouter.get("/scraper/today", async (_req, res) => {
  try {
    const today = todayStart();
    const [agg, logs, topIndustries] = await Promise.all([
      prisma.scrapeLog.aggregate({
        where: { startedAt: { gte: today } },
        _sum: { prospectsFound: true, prospectsNew: true },
        _count: { id: true },
      }),
      prisma.searchJob.findMany({
        where: { searchedAt: { gte: today } },
        include: { keyword: { include: { industry: true } } },
        orderBy: { searchedAt: "asc" },
        take: 20,
      }),
      prisma.prospect.groupBy({
        by: ["industry"],
        where: { createdAt: { gte: today }, industry: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);

    const urlsVisited = await prisma.visitedUrl.count({ where: { visitedAt: { gte: today } } });

    res.json({
      success: true,
      data: {
        kpis: {
          searchesRun: agg._count.id,
          urlsVisited,
          leadsFound: agg._sum.prospectsFound ?? 0,
          leadsNew: agg._sum.prospectsNew ?? 0,
          leadsDuplicates: (agg._sum.prospectsFound ?? 0) - (agg._sum.prospectsNew ?? 0),
        },
        logs: logs.map((j) => ({
          keyword: j.keyword.keyword,
          searchType: j.searchType,
          resultsCount: j.resultsCount,
          newUrlsCount: j.newUrlsCount,
          status: j.resultsCount > 0 ? "OK" : "ZERO",
          searchedAt: j.searchedAt,
          industry: j.keyword.industry.label,
        })),
        topIndustries: topIndustries.map((t) => ({ industry: t.industry, count: t._count.id })),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch scraper data" });
  }
});

// GET /api/metrics/scraper/keywords — keyword bank with progress
metricsRouter.get("/scraper/keywords", async (_req, res) => {
  try {
    const keywords = await prisma.searchKeyword.findMany({
      include: { industry: { select: { label: true } } },
      orderBy: [{ lastSearchedAt: "desc" }, { keyword: "asc" }],
      take: 200,
    });
    res.json({
      success: true,
      data: {
        keywords: keywords.map((k) => ({
          id: k.id,
          keyword: k.keyword,
          industry: k.industry.label,
          currentPage: k.currentPage,
          maxPage: k.maxPage,
          lastSearchedAt: k.lastSearchedAt,
          isActive: k.isActive,
        })),
        total: keywords.length,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch keywords" });
  }
});

// GET /api/metrics/scraper/daily — 7-day bar chart
metricsRouter.get("/scraper/daily", async (_req, res) => {
  try {
    const days: { date: string; leads: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const agg = await prisma.scrapeLog.aggregate({
        where: { startedAt: { gte: start, lt: end } },
        _sum: { prospectsNew: true },
      });
      const label = i === 0 ? "Hoy" : ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][start.getDay()];
      days.push({ date: label, leads: agg._sum.prospectsNew ?? 0 });
    }
    res.json({ success: true, data: { days } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch scraper daily" });
  }
});
