import { Router } from "express";
import { prisma } from "../utils/db";

export const metricsRouter = Router();

metricsRouter.get("/overview", async (_req, res) => {
  try {
    const [
      totalProspects,
      totalEmailsSent,
      totalResponses,
      totalBounces,
      totalUnsubscribes,
      prospectsByStatus,
      prospectsBySource,
      prospectsByType,
    ] = await Promise.all([
      prisma.prospect.count(),
      prisma.emailSent.count(),
      prisma.response.count(),
      prisma.emailEvent.count({ where: { eventType: "BOUNCED" } }),
      prisma.unsubscribe.count(),
      prisma.prospect.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.prospect.groupBy({
        by: ["sourceId"],
        _count: { sourceId: true },
      }),
      prisma.prospect.groupBy({
        by: ["companyType"],
        _count: { companyType: true },
      }),
    ]);

    const totalOpens = await prisma.emailEvent.count({
      where: { eventType: "OPENED" },
    });

    res.json({
      success: true,
      data: {
        kpis: {
          totalProspects,
          totalEmailsSent,
          totalResponses,
          totalOpens,
          totalBounces,
          totalUnsubscribes,
          openRate: totalEmailsSent > 0
            ? ((totalOpens / totalEmailsSent) * 100).toFixed(1)
            : "0.0",
          responseRate: totalEmailsSent > 0
            ? ((totalResponses / totalEmailsSent) * 100).toFixed(1)
            : "0.0",
          bounceRate: totalEmailsSent > 0
            ? ((totalBounces / totalEmailsSent) * 100).toFixed(1)
            : "0.0",
        },
        pipeline: prospectsByStatus.map((s) => ({
          status: s.status,
          count: s._count.status,
        })),
        bySource: prospectsBySource.map((s) => ({
          sourceId: s.sourceId,
          count: s._count.sourceId,
        })),
        byType: prospectsByType.map((t) => ({
          companyType: t.companyType || "unknown",
          count: t._count.companyType,
        })),
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch metrics" });
  }
});

metricsRouter.get("/daily", async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyEmails = await prisma.emailSent.groupBy({
      by: ["sentAt"],
      _count: { id: true },
      where: { sentAt: { gte: startDate } },
      orderBy: { sentAt: "asc" },
    });

    res.json({
      success: true,
      data: { dailyEmails, days },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: "Failed to fetch daily metrics",
    });
  }
});
