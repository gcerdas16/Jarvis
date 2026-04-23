import { Router } from "express";
import { prisma } from "../utils/db";

export const queueRouter = Router();

// Number of business days to project ahead in /week
const WEEK_DAYS = 5;

// Days to wait before each follow-up after the previous email
const FOLLOWUP_CADENCE: Record<string, { days: number; nextType: string; templateKey: string }> = {
  CONTACTED:    { days: 9,  nextType: "FOLLOW_UP_1", templateKey: "followUp1" },
  FOLLOW_UP_1:  { days: 15, nextType: "FOLLOW_UP_2", templateKey: "followUp2" },
  FOLLOW_UP_2:  { days: 7,  nextType: "FOLLOW_UP_3", templateKey: "followUp3" },
};

const CR_OFFSET = 6; // UTC-6, no DST

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Midnight UTC of whatever date it currently is in Costa Rica
function todayCR(): Date {
  const nowUTC = new Date();
  const crDate = new Date(nowUTC.getTime() - CR_OFFSET * 60 * 60 * 1000);
  return new Date(Date.UTC(crDate.getUTCFullYear(), crDate.getUTCMonth(), crDate.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

// Returns the next N business days starting from `from` (inclusive)
function nextBusinessDays(from: Date, count: number): Date[] {
  const out: Date[] = [];
  let cursor = startOfDay(from);
  while (out.length < count) {
    if (!isWeekend(cursor)) out.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return out;
}

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
          select: {
            id: true, email: true, companyName: true, website: true,
            industry: true, leadTier: true, maturityScore: true,
            source: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        });

    // Follow-ups due tomorrow: updatedAt <= tomorrow - daysAfter
    const followUpConfigs = [
      { status: "CONTACTED",   daysAfter: 9,  nextType: "FOLLOW_UP_1", templateKey: "followUp1" },
      { status: "FOLLOW_UP_1", daysAfter: 15, nextType: "FOLLOW_UP_2", templateKey: "followUp2" },
      { status: "FOLLOW_UP_2", daysAfter: 7,  nextType: "FOLLOW_UP_3", templateKey: "followUp3" },
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
          id: p.id, email: p.email, companyName: p.companyName, website: (p as any).website,
          industry: p.industry, source: (p as any).source?.name ?? "",
          leadTier: (p as any).leadTier, maturityScore: (p as any).maturityScore,
        })),
        followUps: cappedFollowUps,
        allFollowUpsDue: followUps.length,
        hasBatchConfirmed,
        emailsPaused: warmup?.emailsPaused ?? false,
        totalTomorrow: cappedInitial.length + cappedFollowUps.length,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch queue" });
  }
});

// GET /api/queue/week — projection of next 5 business days
// Each prospect appears in exactly one day's bucket: the FIRST business day on
// which it becomes due. Daily limit is enforced per day (initials first,
// follow-ups fill remaining slots).
queueRouter.get("/week", async (_req, res) => {
  try {
    const todayStart = todayCR();
    const tomorrow = todayStart;
    const days = nextBusinessDays(tomorrow, WEEK_DAYS);
    const weekEnd = addDays(days[days.length - 1], 1);

    const [warmup, campaign, newProspects, candidateFollowUps, sentTodayRows] = await Promise.all([
      prisma.warmupState.findFirst(),
      prisma.campaign.findFirst({ where: { isActive: true } }),
      prisma.prospect.findMany({
        where: { status: "NEW" },
        select: {
          id: true, email: true, companyName: true, website: true, industry: true,
          leadTier: true, maturityScore: true, country: true, createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.prospect.findMany({
        where: { status: { in: ["CONTACTED", "FOLLOW_UP_1", "FOLLOW_UP_2"] } },
        select: {
          id: true, email: true, companyName: true, industry: true,
          status: true, updatedAt: true, leadTier: true,
        },
      }),
      prisma.emailSent.findMany({
        where: { sentAt: { gte: todayStart, lt: addDays(todayStart, 1) } },
        select: { emailType: true },
      }),
    ]);

    const dailyLimit = warmup?.currentDailyLimit ?? 50;

    // Bucket follow-ups by their first-due business day
    type FollowUpItem = {
      id: string; email: string; companyName: string | null; industry: string | null;
      status: string; updatedAt: Date; nextEmailType: string;
      hasTemplate: boolean; isOverdue: boolean; leadTier: string | null;
    };
    const followUpsByDay: FollowUpItem[][] = days.map(() => []);

    for (const p of candidateFollowUps) {
      const cadence = FOLLOWUP_CADENCE[p.status];
      if (!cadence) continue;

      const dueDate = startOfDay(addDays(p.updatedAt, cadence.days));
      let bucketIdx = -1;
      let isOverdue = false;

      if (dueDate < tomorrow) {
        // Overdue: assign to first day in projection
        bucketIdx = 0;
        isOverdue = true;
      } else if (dueDate < weekEnd) {
        // Find the first business day on or after dueDate
        for (let i = 0; i < days.length; i++) {
          if (days[i].getTime() >= dueDate.getTime()) {
            bucketIdx = i;
            break;
          }
        }
      }

      if (bucketIdx === -1) continue; // Outside this week

      const hasTemplate = !!(campaign as any)?.[cadence.templateKey];
      followUpsByDay[bucketIdx].push({
        id: p.id, email: p.email, companyName: p.companyName, industry: p.industry,
        status: p.status, updatedAt: p.updatedAt, nextEmailType: cadence.nextType,
        hasTemplate, isOverdue, leadTier: p.leadTier,
      });
    }

    // Sort each day's follow-ups by overdue first, then oldest updatedAt
    for (const bucket of followUpsByDay) {
      bucket.sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return a.updatedAt.getTime() - b.updatedAt.getTime();
      });
    }

    const sentToday = {
      initial: sentTodayRows.filter((e) => e.emailType === "INITIAL").length,
      followUps: sentTodayRows.filter((e) => e.emailType !== "INITIAL").length,
    };

    // Slice initials per day from the FIFO NEW pool
    const dayBlocks = days.map((date, dayIdx) => {
      const initialStart = dayIdx * dailyLimit;
      const initialSlice = newProspects.slice(initialStart, initialStart + dailyLimit);
      const initialCapped = initialSlice; // initials always within limit by construction

      const remainingSlots = Math.max(0, dailyLimit - initialCapped.length);
      const followUpsAll = followUpsByDay[dayIdx];
      const followUpsCapped = followUpsAll.slice(0, remainingSlots);
      const followUpsOverflow = Math.max(0, followUpsAll.length - followUpsCapped.length);

      return {
        date: date.toISOString().slice(0, 10),
        weekday: date.toLocaleDateString("es-CR", { weekday: "long" }),
        dayLabel: date.toLocaleDateString("es-CR", { day: "numeric", month: "short" }),
        initial: initialCapped.map((p) => ({
          id: p.id, email: p.email, companyName: p.companyName,
          website: p.website, industry: p.industry, leadTier: p.leadTier,
          maturityScore: (p as any).maturityScore,
        })),
        followUps: followUpsCapped,
        initialCount: initialCapped.length,
        followUpCount: followUpsCapped.length,
        followUpOverflow: followUpsOverflow,
        total: initialCapped.length + followUpsCapped.length,
        ...(dayIdx === 0 && { sentToday }),
      };
    });

    res.json({
      success: true,
      data: {
        dailyLimit,
        today: todayStart.toISOString().slice(0, 10),
        days: dayBlocks,
        newPoolSize: newProspects.length,
        campaign: campaign ? { id: campaign.id, name: campaign.name } : null,
        cadence: {
          followUp1Days: FOLLOWUP_CADENCE.CONTACTED.days,
          followUp2Days: FOLLOWUP_CADENCE.FOLLOW_UP_1.days,
          followUp3Days: FOLLOWUP_CADENCE.FOLLOW_UP_2.days,
        },
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch week projection" });
  }
});
