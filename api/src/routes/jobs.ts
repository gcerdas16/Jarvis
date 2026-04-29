import { Router } from "express";
import { prisma } from "../utils/db";
import { z } from "zod";
import { runWithJobLog } from "../jobs/runner";
import { processEmailQueue, processFollowUps } from "../services/email-engine";

export const jobsRouter = Router();

const CR_TZ = "America/Costa_Rica";

function getNextWeekdayRun(crHour: number, crMinute: number): string {
  const CR_OFFSET = 6; // UTC-6, no DST
  const utcHour = crHour + CR_OFFSET; // convert CR time to UTC
  const now = new Date();

  for (let d = 0; d <= 7; d++) {
    const c = new Date(now);
    // Set the correct UTC date + time (add extra day if utcHour >= 24)
    c.setUTCDate(now.getUTCDate() + d + Math.floor(utcHour / 24));
    c.setUTCHours(utcHour % 24, crMinute, 0, 0);

    // Determine weekday in CR timezone
    const crMs = c.getTime() - CR_OFFSET * 60 * 60 * 1000;
    const crDay = new Date(crMs).getUTCDay(); // 0=Sun, 6=Sat

    if (crDay >= 1 && crDay <= 5 && c > now) {
      return c.toLocaleString("es-CR", { timeZone: CR_TZ, dateStyle: "short", timeStyle: "short" });
    }
  }
  return "—";
}

// GET /api/jobs/status
jobsRouter.get("/status", async (_req, res) => {
  try {
    const [emailRun, followupRun, latestScrapeLog] = await Promise.all([
      prisma.jobRun.findFirst({ where: { jobType: "EMAIL_SEND" }, orderBy: { startedAt: "desc" } }),
      prisma.jobRun.findFirst({ where: { jobType: "FOLLOW_UPS" }, orderBy: { startedAt: "desc" } }),
      prisma.scrapeLog.findFirst({ orderBy: { startedAt: "desc" } }),
    ]);

    res.json({
      success: true,
      data: {
        jobs: [
          {
            type: "EMAIL_SEND",
            name: "Email Send",
            schedule: "8:05am L-V",
            lastRun: emailRun
              ? {
                  startedAt: emailRun.startedAt,
                  status: emailRun.status,
                  result: emailRun.result ? JSON.parse(emailRun.result) : null,
                  durationMs: emailRun.durationMs,
                }
              : null,
            nextRun: getNextWeekdayRun(8, 5),
          },
          {
            type: "FOLLOW_UPS",
            name: "Follow-ups",
            schedule: "8:05am L-V",
            lastRun: followupRun
              ? {
                  startedAt: followupRun.startedAt,
                  status: followupRun.status,
                  result: followupRun.result ? JSON.parse(followupRun.result) : null,
                  durationMs: followupRun.durationMs,
                }
              : null,
            nextRun: getNextWeekdayRun(8, 5),
          },
          {
            type: "SCRAPER",
            name: "Scraper",
            schedule: "7:42am L-V",
            lastRun: latestScrapeLog
              ? {
                  startedAt: latestScrapeLog.startedAt,
                  status: latestScrapeLog.status,
                  result: {
                    leadsFound: latestScrapeLog.prospectsFound,
                    newLeads: latestScrapeLog.prospectsNew,
                  },
                  durationMs: latestScrapeLog.durationMs,
                }
              : null,
            nextRun: getNextWeekdayRun(7, 42),
          },
        ],
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch job status" });
  }
});

const historySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.enum(["all", "EMAIL_SEND", "FOLLOW_UPS", "SCRAPER"]).default("all"),
});

// GET /api/jobs/history
jobsRouter.get("/history", async (req, res) => {
  try {
    const q = historySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;
    const fromDate = q.from ? new Date(q.from) : undefined;
    const toDate = q.to ? new Date(q.to + "T23:59:59") : undefined;

    const apiWhere: Record<string, unknown> = {};
    if (q.type !== "all" && q.type !== "SCRAPER") apiWhere.jobType = q.type;
    if (fromDate || toDate) {
      apiWhere.startedAt = {
        ...(fromDate && { gte: fromDate }),
        ...(toDate && { lte: toDate }),
      };
    }

    const includeApiJobs = q.type === "all" || q.type === "EMAIL_SEND" || q.type === "FOLLOW_UPS";
    const includeScraperJobs = q.type === "all" || q.type === "SCRAPER";

    const [apiRuns, scraperLogs] = await Promise.all([
      includeApiJobs
        ? prisma.jobRun.findMany({
            where: apiWhere,
            orderBy: { startedAt: "desc" },
            take: q.limit,
          })
        : Promise.resolve([]),
      includeScraperJobs
        ? prisma.scrapeLog.findMany({
            where: {
              ...(fromDate && { startedAt: { gte: fromDate } }),
              ...(toDate && { startedAt: { lte: toDate } }),
            },
            orderBy: { startedAt: "desc" },
            take: q.limit,
          })
        : Promise.resolve([]),
    ]);

    const normalized = [
      ...apiRuns.map((r) => ({
        id: r.id,
        jobType: r.jobType as string,
        status: r.status as string,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        durationMs: r.durationMs,
        result: r.result ? JSON.parse(r.result) : null,
        errorMessage: r.errorMessage,
      })),
      ...scraperLogs.map((s) => ({
        id: s.id,
        jobType: "SCRAPER",
        status:
          s.status === "SUCCESS"
            ? "SUCCESS"
            : s.status === "FAILED"
            ? "FAILED"
            : "RUNNING",
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        durationMs: s.durationMs,
        result: { leadsFound: s.prospectsFound, newLeads: s.prospectsNew },
        errorMessage: s.errorMessage,
      })),
    ]
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(skip, skip + q.limit);

    res.json({ success: true, data: { runs: normalized } });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, error: "Failed to fetch job history" });
  }
});

const runSchema = z.object({
  type: z.enum(["EMAIL_SEND", "FOLLOW_UPS"]),
});

// POST /api/jobs/run — manually trigger a job
jobsRouter.post("/run", async (req, res) => {
  try {
    const { type } = runSchema.parse(req.body);
    const fn = type === "EMAIL_SEND" ? processEmailQueue : processFollowUps;
    // Respond immediately — job runs in background
    res.json({ success: true, message: `${type} triggered` });
    runWithJobLog(type, fn).catch((e) => console.error(`[Jobs] ${type} manual run error:`, e));
  } catch (e) {
    res.status(400).json({ success: false, error: e instanceof z.ZodError ? e.errors[0].message : "Invalid request" });
  }
});
