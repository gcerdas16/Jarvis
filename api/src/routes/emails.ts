import { Router } from "express";
import { prisma } from "../utils/db";
import { z } from "zod";
import { todayCR, addDays } from "../utils/timezone";

export const emailsRouter = Router();

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.enum(["all", "delivered", "bounced", "replied", "initial", "followup", "unsub"]).default("all"),
  search: z.string().optional(),
});

// GET /api/emails
emailsRouter.get("/", async (req, res) => {
  try {
    const q = querySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;

    const fromDate = q.from ? new Date(q.from) : undefined;
    const toDate = q.to ? new Date(q.to + "T23:59:59") : undefined;

    const where: Record<string, unknown> = {};
    if (fromDate || toDate) {
      where.sentAt = {
        ...(fromDate && { gte: fromDate }),
        ...(toDate && { lte: toDate }),
      };
    }
    if (q.search) {
      where.prospect = { email: { contains: q.search, mode: "insensitive" } };
    }
    if (q.status === "initial") where.emailType = "INITIAL";
    if (q.status === "followup") where.emailType = { in: ["FOLLOW_UP_1", "FOLLOW_UP_2", "FOLLOW_UP_3"] };
    if (q.status === "bounced") where.prospect = { status: "BOUNCED" };
    if (q.status === "replied") where.prospect = { status: "RESPONDED" };

    const today = todayCR();
    const todayEnd = addDays(today, 1);
    const weekAgo = addDays(today, -7);

    const [emails, total, kpis] = await Promise.all([
      prisma.emailSent.findMany({
        where,
        include: {
          prospect: { select: { email: true, companyName: true, industry: true, status: true, source: { select: { name: true } } } },
          events: { orderBy: { occurredAt: "desc" }, take: 1 },
        },
        orderBy: { sentAt: "desc" },
        skip,
        take: q.limit,
      }),
      prisma.emailSent.count({ where }),
      Promise.all([
        prisma.emailSent.count({ where: { sentAt: { gte: today, lt: todayEnd } } }),
        prisma.warmupState.findFirst(),
        prisma.emailSent.count({ where: { sentAt: { gte: today, lt: todayEnd }, emailType: { in: ["FOLLOW_UP_1", "FOLLOW_UP_2", "FOLLOW_UP_3"] } } }),
        prisma.emailEvent.count({ where: { eventType: "BOUNCED", occurredAt: { gte: today, lt: todayEnd } } }),
        prisma.response.count({ where: { receivedAt: { gte: weekAgo } } }),
      ]),
    ]);

    const [sentToday, warmup, followUpsToday, bouncesToday, responsesThisWeek] = kpis;

    res.json({
      success: true,
      data: {
        emails: emails.map((e) => ({
          id: e.id,
          sentAt: e.sentAt,
          emailType: e.emailType,
          subject: e.subject,
          prospect: e.prospect,
          latestEvent: e.events[0] ?? null,
        })),
        kpis: {
          sentToday,
          dailyLimit: warmup?.currentDailyLimit ?? 50,
          followUpsToday,
          bouncesToday,
          responsesThisWeek,
        },
        pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof z.ZodError ? error.errors[0].message : "Failed" });
  }
});
