import { Router } from "express";
import { z } from "zod";
import { prisma } from "../utils/db";

export const settingsRouter = Router();

settingsRouter.get("/emails-pause", async (_req, res) => {
  try {
    const warmup = await prisma.warmupState.findFirst();
    res.json({ success: true, data: { emailsPaused: warmup?.emailsPaused ?? false } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
});

settingsRouter.patch("/emails-pause", async (_req, res) => {
  try {
    const warmup = await prisma.warmupState.findFirst();
    if (!warmup) {
      res.status(404).json({ success: false, error: "Warmup state not found" });
      return;
    }
    const updated = await prisma.warmupState.update({
      where: { id: warmup.id },
      data: { emailsPaused: !warmup.emailsPaused },
    });
    res.json({ success: true, data: { emailsPaused: updated.emailsPaused } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to toggle" });
  }
});

settingsRouter.patch("/daily-limit", async (req, res) => {
  try {
    const schema = z.object({ limit: z.number().int().min(1).max(500) });
    const { limit } = schema.parse(req.body);
    const warmup = await prisma.warmupState.findFirst();
    if (!warmup) {
      res.status(404).json({ success: false, error: "Warmup state not found" });
      return;
    }
    const updated = await prisma.warmupState.update({
      where: { id: warmup.id },
      data: { currentDailyLimit: limit, maxDailyLimit: limit },
    });
    res.json({ success: true, data: { dailyLimit: updated.currentDailyLimit } });
  } catch (e) {
    console.error(e);
    res.status(400).json({
      success: false,
      error: e instanceof z.ZodError ? e.errors.map((err) => err.message).join(", ") : "Failed to update daily limit",
    });
  }
});
