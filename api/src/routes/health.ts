import { Router } from "express";
import { prisma } from "../utils/db";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: "Database connection failed",
    });
  }
});
