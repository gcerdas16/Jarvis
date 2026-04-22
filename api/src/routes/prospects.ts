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
  industry: z.string().optional(),
  tier: z.enum(["N1", "N2", "N3"]).optional(),
  country: z.string().optional(),
  techStack: z.string().optional(),
  search: z.string().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  sortBy: z.enum(["email", "companyName", "industry", "status", "updatedAt", "maturityScore"]).default("updatedAt"),
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
      ...(query.industry && { industry: query.industry }),
      ...(query.tier && { leadTier: query.tier }),
      ...(query.country && { country: query.country }),
      ...(query.techStack && { techStack: query.techStack }),
      ...(query.search && {
        OR: [
          { email: { contains: query.search, mode: "insensitive" as const } },
          { companyName: { contains: query.search, mode: "insensitive" as const } },
        ],
      }),
      ...((query.createdFrom || query.createdTo) && {
        createdAt: {
          ...(query.createdFrom && { gte: new Date(query.createdFrom) }),
          ...(query.createdTo && { lte: new Date(query.createdTo + "T23:59:59") }),
        },
      }),
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

// Meta data needed to populate filter dropdowns on the prospects page
prospectsRouter.get("/filter-options", async (_req, res) => {
  try {
    const [sources, countries, techStacks, tiers, industries, companyTypes, statuses] = await Promise.all([
      prisma.source.findMany({
        where: { isActive: true },
        select: { id: true, name: true, type: true },
        orderBy: { name: "asc" },
      }),
      prisma.prospect.groupBy({
        by: ["country"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.prospect.groupBy({
        by: ["techStack"],
        where: { techStack: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.prospect.groupBy({
        by: ["leadTier"],
        where: { leadTier: { not: null } },
        _count: { id: true },
      }),
      prisma.prospect.groupBy({
        by: ["industry"],
        where: { industry: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 50,
      }),
      prisma.prospect.groupBy({
        by: ["companyType"],
        where: { companyType: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.prospect.groupBy({
        by: ["status"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        sources: sources.map((s) => ({ id: s.id, name: s.name, type: s.type })),
        countries: countries.map((c) => ({ value: c.country ?? "", count: c._count.id })),
        techStacks: techStacks.map((t) => ({ value: t.techStack, count: t._count.id })),
        tiers: tiers.map((t) => ({ value: t.leadTier, count: t._count.id })),
        industries: industries.map((i) => ({ value: i.industry!, count: i._count.id })),
        companyTypes: companyTypes.map((c) => ({ value: c.companyType!, count: c._count.id })),
        statuses: statuses.map((s) => ({ value: s.status as string, count: s._count.id })),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch filter options" });
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

const createProspectSchema = z.object({
  email: z.string().email(),
  companyName: z.string().max(255).optional(),
  website: z.string().max(500).optional().nullable(),
  industry: z.string().max(100).optional(),
  companyType: z.string().max(100).optional(),
  country: z.string().max(10).default("CR"),
  description: z.string().max(2000).optional(),
});

prospectsRouter.post("/", async (req, res) => {
  try {
    const data = createProspectSchema.parse(req.body);

    const existing = await prisma.prospect.findUnique({ where: { email: data.email } });
    if (existing) {
      res.status(409).json({ success: false, error: "Este email ya existe en el sistema" });
      return;
    }

    const source = await prisma.source.upsert({
      where: { name: "Manual" },
      create: { name: "Manual", type: "manual" },
      update: {},
    });

    const prospect = await prisma.prospect.create({
      data: {
        email: data.email,
        companyName: data.companyName ?? null,
        website: data.website || null,
        industry: data.industry ?? null,
        companyType: data.companyType ?? null,
        country: data.country,
        description: data.description ?? null,
        sourceId: source.id,
      },
      include: { source: { select: { name: true, type: true } } },
    });

    res.status(201).json({ success: true, data: prospect });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors[0].message : "Failed to create prospect",
    });
  }
});

const MANUAL_STATUSES = [
  "REUNION_AGENDADA", "REUNION_REALIZADA", "PROPUESTA_ENVIADA",
  "CLIENTE", "NO_INTERESADO", "REVISITAR",
] as const;

const statusChangeSchema = z.object({
  status: z.enum(MANUAL_STATUSES),
  note: z.string().max(2000).optional(),
});

prospectsRouter.patch("/:id/status", async (req, res) => {
  try {
    const { status, note } = statusChangeSchema.parse(req.body);
    const prospect = await prisma.prospect.findUnique({ where: { id: req.params.id } });
    if (!prospect) {
      res.status(404).json({ success: false, error: "Prospect not found" });
      return;
    }
    const [updated] = await prisma.$transaction([
      prisma.prospect.update({
        where: { id: req.params.id },
        data: { status: status as any },
      }),
      prisma.prospectStatusHistory.create({
        data: {
          prospectId: req.params.id,
          fromStatus: prospect.status,
          toStatus: status as any,
          changedBy: "gustavo",
          note: note ?? null,
        },
      }),
    ]);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors[0].message : "Failed to update status",
    });
  }
});

prospectsRouter.get("/:id/history", async (req, res) => {
  try {
    const history = await prisma.prospectStatusHistory.findMany({
      where: { prospectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: history });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch history" });
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
