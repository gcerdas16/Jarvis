import cron from "node-cron";
import { processEmailQueue, processFollowUps } from "../services/email-engine";
import { prisma } from "../utils/db";

const CR_TIMEZONE = "America/Costa_Rica";

async function runWithJobLog(
  jobType: "EMAIL_SEND" | "FOLLOW_UPS",
  fn: () => Promise<Record<string, number>>
): Promise<void> {
  const run = await prisma.jobRun.create({
    data: { jobType, status: "RUNNING" },
  });
  const startedAt = Date.now();
  try {
    const result = await fn();
    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        result: JSON.stringify(result),
        durationMs: Date.now() - startedAt,
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}

export function startScheduler(): void {
  cron.schedule("5 8 * * 1-5", () => {
    runWithJobLog("EMAIL_SEND", processEmailQueue).catch((e) =>
      console.error("[Scheduler] EMAIL_SEND error:", e)
    );
  }, { timezone: CR_TIMEZONE });

  cron.schedule("0 10 * * 1-5", () => {
    runWithJobLog("FOLLOW_UPS", processFollowUps).catch((e) =>
      console.error("[Scheduler] FOLLOW_UPS error:", e)
    );
  }, { timezone: CR_TIMEZONE });

  console.log("[Scheduler] Cron jobs scheduled (America/Costa_Rica)");
}
