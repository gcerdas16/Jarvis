import { Router } from "express";
import { prisma } from "../utils/db";
import { z } from "zod";

export const campaignsRouter = Router();

const createSchema = z.object({
  name: z.string().min(1),
  subjectLine: z.string().min(1),
  bodyTemplate: z.string().min(1),
  followUp1: z.string().optional(),
  followUp2: z.string().optional(),
  followUp3: z.string().optional(),
});

campaignsRouter.get("/", async (_req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: campaigns });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch campaigns" });
  }
});

campaignsRouter.post("/", async (req, res) => {
  try {
    const data = createSchema.parse(req.body);
    const campaign = await prisma.campaign.create({ data });
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError
        ? error.errors.map((e) => e.message).join(", ")
        : "Failed to create campaign",
    });
  }
});

campaignsRouter.patch("/:id", async (req, res) => {
  try {
    const patchSchema = z.object({
      name: z.string().min(1).optional(),
      subjectLine: z.string().min(1).optional(),
      bodyTemplate: z.string().min(1).optional(),
      followUp1: z.string().optional(),
      followUp2: z.string().optional(),
      followUp3: z.string().optional(),
    });
    const data = patchSchema.parse(req.body);
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError
        ? error.errors.map((e) => e.message).join(", ")
        : "Failed to update campaign",
    });
  }
});

campaignsRouter.patch("/:id/activate", async (req, res) => {
  try {
    await prisma.campaign.updateMany({ data: { isActive: false } });
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { isActive: true },
    });
    res.json({ success: true, data: campaign });
  } catch {
    res.status(500).json({ success: false, error: "Failed to activate campaign" });
  }
});
