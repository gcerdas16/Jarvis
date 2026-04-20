import { Router } from "express";
import { prisma } from "../utils/db";
import { z } from "zod";

export const unsubscribesRouter = Router();

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

unsubscribesRouter.get("/", async (req, res) => {
  try {
    const { page, limit } = querySchema.parse(req.query);
    const skip = (page - 1) * limit;

    const [unsubscribes, total] = await Promise.all([
      prisma.unsubscribe.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.unsubscribe.count(),
    ]);

    res.json({
      success: true,
      data: {
        unsubscribes,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch unsubscribes" });
  }
});
