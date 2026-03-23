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
});

prospectsRouter.get("/", async (req, res) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;

    const where = {
      ...(query.status && { status: query.status as any }),
      ...(query.source && { sourceId: query.source }),
      ...(query.companyType && { companyType: query.companyType }),
    };

    const [prospects, total] = await Promise.all([
      prisma.prospect.findMany({
        where,
        include: { source: { select: { name: true, type: true } } },
        orderBy: { createdAt: "desc" },
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

prospectsRouter.get("/:id", async (req, res) => {
  try {
    const prospect = await prisma.prospect.findUnique({
      where: { id: req.params.id },
      include: {
        source: true,
        emailsSent: {
          include: { events: true },
          orderBy: { sentAt: "desc" },
        },
        responses: { orderBy: { receivedAt: "desc" } },
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
