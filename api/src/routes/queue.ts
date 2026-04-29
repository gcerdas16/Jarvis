import { Router } from "express";
import { prisma } from "../utils/db";
import { todayCR, addDays as addDaysTZ } from "../utils/timezone";

export const queueRouter = Router();

const WEEK_DAYS = 5;
const INITIAL_LIMIT = 60;
const FOLLOWUP_LIMIT = 30;

const GENERIC_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
  "icloud.com", "aol.com", "protonmail.com", "mail.com", "msn.com",
]);

function companyKey(email: string, companyName: string | null, website: string | null): string {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain && !GENERIC_DOMAINS.has(domain)) return domain;
  if (website) {
    try {
      const hostname = new URL(website.startsWith("http") ? website : `https://${website}`).hostname;
      return hostname.replace(/^www\./, "");
    } catch { /* ignore */ }
  }
  return companyName?.toLowerCase().trim() ?? email;
}

function groupByCompany<T extends { email: string; companyName: string | null; website?: string | null }>(
  prospects: T[]
): T[] {
  const groups = new Map<string, T[]>();
  for (const p of prospects) {
    const key = companyKey(p.email, p.companyName, p.website ?? null);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  const selected: T[] = [];
  for (const [, group] of groups) {
    if (selected.length >= INITIAL_LIMIT) break;
    selected.push(...group);
  }
  return selected;
}

function assignGroupsToDays<T extends { email: string; companyName: string | null; website?: string | null }>(
  prospects: T[],
  dayCount: number,
  limitPerDay: number
): T[][] {
  const groups = new Map<string, T[]>();
  for (const p of prospects) {
    const key = companyKey(p.email, p.companyName, p.website ?? null);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  const days: T[][] = Array.from({ length: dayCount }, () => []);
  let dayIdx = 0;
  for (const [, group] of groups) {
    if (dayIdx >= dayCount) break;
    if (days[dayIdx].length >= limitPerDay) dayIdx++;
    if (dayIdx >= dayCount) break;
    days[dayIdx].push(...group);
  }
  return days;
}

// FU3 (status=FOLLOW_UP_2) sent first, matching email-engine order
const FU_PRIORITY: Record<string, number> = { FOLLOW_UP_2: 0, FOLLOW_UP_1: 1, CONTACTED: 2 };

const FOLLOWUP_CADENCE: Record<string, { days: number; nextType: string; templateKey: string }> = {
  CONTACTED:    { days: 9,  nextType: "FOLLOW_UP_1", templateKey: "followUp1" },
  FOLLOW_UP_1:  { days: 15, nextType: "FOLLOW_UP_2", templateKey: "followUp2" },
  FOLLOW_UP_2:  { days: 7,  nextType: "FOLLOW_UP_3", templateKey: "followUp3" },
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  return addDaysTZ(d, n);
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function nextBusinessDays(from: Date, count: number): Date[] {
  const out: Date[] = [];
  let cursor = startOfDay(from);
  while (out.length < count) {
    if (!isWeekend(cursor)) out.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return out;
}

// GET /api/queue — tomorrow's planned sends
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

    let initial;
    if (hasBatchConfirmed) {
      initial = confirmedBatch.map((b) => b.prospect).filter((p) => p.status === "NEW");
    } else {
      const buffer = await prisma.prospect.findMany({
        where: { status: "NEW" },
        take: INITIAL_LIMIT * 5,
        select: {
          id: true, email: true, companyName: true, website: true,
          industry: true, leadTier: true, maturityScore: true,
          source: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      });
      initial = groupByCompany(buffer);
    }

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
      for (const p of prospects) followUps.push({ ...p, nextEmailType: config.nextType, hasTemplate });
    }

    const cappedInitial = initial.slice(0, INITIAL_LIMIT);
    const cappedFollowUps = followUps.slice(0, FOLLOWUP_LIMIT);

    res.json({
      success: true,
      data: {
        dailyLimit: INITIAL_LIMIT + FOLLOWUP_LIMIT,
        campaign: campaign ? {
          id: campaign.id, name: campaign.name, subjectLine: campaign.subjectLine,
          bodyTemplate: campaign.bodyTemplate, followUp1: campaign.followUp1,
          followUp2: campaign.followUp2, followUp3: campaign.followUp3,
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

// GET /api/queue/week — 5-day projection
queueRouter.get("/week", async (_req, res) => {
  try {
    const todayStart = todayCR();
    const days = nextBusinessDays(todayStart, WEEK_DAYS);
    const weekEnd = addDays(days[days.length - 1], 1);

    const [warmup, campaign, newProspects, candidateFollowUps, sentTodayRows] = await Promise.all([
      prisma.warmupState.findFirst(),
      prisma.campaign.findFirst({ where: { isActive: true } }),
      prisma.prospect.findMany({
        where: { status: "NEW" },
        select: {
          id: true, email: true, companyName: true, website: true, industry: true,
          leadTier: true, maturityScore: true, createdAt: true,
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
        select: {
          emailType: true,
          prospect: {
            select: {
              id: true, email: true, companyName: true, website: true,
              industry: true, leadTier: true, maturityScore: true,
            },
          },
        },
      }),
    ]);

    type FollowUpItem = {
      id: string; email: string; companyName: string | null; industry: string | null;
      status: string; updatedAt: Date; nextEmailType: string;
      hasTemplate: boolean; isOverdue: boolean; leadTier: string | null;
    };

    const sortByPriority = (arr: FollowUpItem[]) =>
      arr.sort((a, b) => {
        const pa = FU_PRIORITY[a.status] ?? 3;
        const pb = FU_PRIORITY[b.status] ?? 3;
        if (pa !== pb) return pa - pb;
        return a.updatedAt.getTime() - b.updatedAt.getTime();
      });

    // Build rolling queue: overdue items first, future items keyed by due date
    const overdueQueue: FollowUpItem[] = [];
    const futureByDate: Map<string, FollowUpItem[]> = new Map();

    for (const p of candidateFollowUps) {
      const cadence = FOLLOWUP_CADENCE[p.status];
      if (!cadence) continue;
      const dueDate = startOfDay(addDays(p.updatedAt, cadence.days));
      const hasTemplate = !!(campaign as any)?.[cadence.templateKey];
      const item: FollowUpItem = {
        id: p.id, email: p.email, companyName: p.companyName, industry: p.industry,
        status: p.status, updatedAt: p.updatedAt, nextEmailType: cadence.nextType,
        hasTemplate, isOverdue: dueDate < todayStart, leadTier: p.leadTier,
      };
      if (dueDate < todayStart) {
        overdueQueue.push(item);
      } else if (dueDate < weekEnd) {
        const dateStr = dueDate.toISOString().slice(0, 10);
        if (!futureByDate.has(dateStr)) futureByDate.set(dateStr, []);
        futureByDate.get(dateStr)!.push(item);
      }
    }

    sortByPriority(overdueQueue);

    // Queue-drain: each day takes up to FOLLOWUP_LIMIT from rolling queue
    const followUpsByDay: FollowUpItem[][] = days.map(() => []);
    for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
      const dayStr = days[dayIdx].toISOString().slice(0, 10);
      const dueToday = futureByDate.get(dayStr) ?? [];
      sortByPriority(dueToday);
      overdueQueue.push(...dueToday);
      followUpsByDay[dayIdx] = overdueQueue.splice(0, FOLLOWUP_LIMIT);
    }

    const fuPoolOverflow = overdueQueue.length;

    const sentTodayInitials = sentTodayRows.filter((e) => e.emailType === "INITIAL").map((e) => e.prospect);
    const sentTodayFollowUps = sentTodayRows.filter((e) => e.emailType !== "INITIAL").map((e) => ({ ...e.prospect, emailType: e.emailType }));
    const sentToday = {
      initial: sentTodayInitials.length,
      followUps: sentTodayFollowUps.length,
      initialList: sentTodayInitials,
      followUpList: sentTodayFollowUps,
    };

    const initialsByDay = assignGroupsToDays(newProspects, WEEK_DAYS, INITIAL_LIMIT);

    const dayBlocks = days.map((date, dayIdx) => {
      const initialCapped = initialsByDay[dayIdx] ?? [];
      const followUpsForDay = followUpsByDay[dayIdx];
      return {
        date: date.toISOString().slice(0, 10),
        weekday: date.toLocaleDateString("es-CR", { weekday: "long" }),
        dayLabel: date.toLocaleDateString("es-CR", { day: "numeric", month: "short" }),
        initial: initialCapped.map((p) => ({
          id: p.id, email: p.email, companyName: p.companyName,
          website: p.website, industry: p.industry, leadTier: p.leadTier,
          maturityScore: (p as any).maturityScore,
        })),
        followUps: followUpsForDay,
        initialCount: initialCapped.length,
        followUpCount: followUpsForDay.length,
        followUpOverflow: 0,
        total: initialCapped.length + followUpsForDay.length,
        ...(dayIdx === 0 && { sentToday }),
      };
    });

    res.json({
      success: true,
      data: {
        dailyLimit: INITIAL_LIMIT + FOLLOWUP_LIMIT,
        emailsPaused: warmup?.emailsPaused ?? false,
        today: todayStart.toISOString().slice(0, 10),
        days: dayBlocks,
        newPoolSize: newProspects.length,
        fuPoolOverflow,
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
