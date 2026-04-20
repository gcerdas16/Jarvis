import { Router } from "express";
import { prisma } from "../utils/db";
import { z } from "zod";

export const prospectsRouter = Router();

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.string().optional(),
  source: z.string().optional(),
  companyType: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["email", "companyName", "industry", "status", "updatedAt"]).default("updatedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

prospectsRouter.get("/", async (req, res) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;

    const where = {
      ...(query.status && { status: query.status as any }),
      ...(query.source && { sourceId: query.source }),
      ...(query.companyType && { companyType: query.companyType }),
      ...(query.search && { email: { contains: query.search, mode: "insensitive" as const } }),
    };

    const [prospects, total] = await Promise.all([
      prisma.prospect.findMany({
        where,
        include: { source: { select: { name: true, type: true } } },
        orderBy: { [query.sortBy]: query.sortDir },
        skip,
        take: query.limit,
      }),
      prisma.prospect.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        prospects,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError
        ? error.errors.map((e) => e.message).join(", ")
        : "Failed to fetch prospects",
    });
  }
});

prospectsRouter.get("/new/stats", async (_req, res) => {
  try {
    const [total, bySource, bySearchType, byIndustry, recent] = await Promise.all([
      prisma.prospect.count({ where: { status: "NEW" } }),
      prisma.prospect.groupBy({
        by: ["sourceId"],
        where: { status: "NEW" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.prospect.groupBy({
        by: ["searchType"],
        where: { status: "NEW" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.prospect.groupBy({
        by: ["industry"],
        where: { status: "NEW", industry: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
      prisma.prospect.count({
        where: { status: "NEW", createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const sourceIds = bySource.map((s) => s.sourceId);
    const sources = await prisma.source.findMany({ where: { id: { in: sourceIds } }, select: { id: true, name: true } });
    const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s.name]));

    res.json({
      success: true,
      data: {
        total,
        recentWeek: recent,
        bySource: bySource.map((s) => ({ source: sourceMap[s.sourceId] ?? s.sourceId, count: s._count.id })),
        bySearchType: bySearchType.map((s) => ({ searchType: s.searchType ?? "desconocido", count: s._count.id })),
        byIndustry: byIndustry.map((s) => ({ industry: s.industry ?? "—", count: s._count.id })),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch new prospect stats" });
  }
});

prospectsRouter.get("/:id", async (req, res) => {
  try {
    const prospect = await prisma.prospect.findUnique({
      where: { id: req.params.id },
      include: {
        source: true,
        emailsSent: {
          include: { events: true },
          orderBy: { sentAt: "asc" },
        },
        responses: { orderBy: { receivedAt: "asc" } },
        notes: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!prospect) {
      res.status(404).json({ success: false, error: "Prospect not found" });
      return;
    }

    res.json({ success: true, data: prospect });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch prospect" });
  }
});

const noteSchema = z.object({
  noteType: z.enum(["GENERAL", "NOT_INTERESTED", "MEETING", "DEMO"]).default("GENERAL"),
  content: z.string().min(1).max(2000),
});

prospectsRouter.post("/:id/notes", async (req, res) => {
  try {
    const { noteType, content } = noteSchema.parse(req.body);
    const note = await prisma.prospectNote.create({
      data: { prospectId: req.params.id, noteType, content },
    });
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof z.ZodError ? error.errors[0].message : "Failed to save note" });
  }
});

const batchSchema = z.object({
  prospectIds: z.array(z.string()).min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

prospectsRouter.patch("/batch", async (req, res) => {
  try {
    const { prospectIds, date } = batchSchema.parse(req.body);
    const batchDate = new Date(date + "T00:00:00");
    const batchDateEnd = new Date(date + "T23:59:59");

    await prisma.dailyBatch.deleteMany({
      where: { batchDate: { gte: batchDate, lte: batchDateEnd }, confirmed: false },
    });

    await prisma.$transaction(
      prospectIds.map((prospectId) =>
        prisma.dailyBatch.upsert({
          where: { prospectId_batchDate: { prospectId, batchDate } },
          create: { prospectId, batchDate, confirmed: true },
          update: { confirmed: true },
        })
      )
    );

    res.json({ success: true, data: { confirmed: prospectIds.length, date } });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof z.ZodError ? error.errors[0].message : "Failed" });
  }
});
