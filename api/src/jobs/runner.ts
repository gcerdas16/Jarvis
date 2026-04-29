import { prisma } from "../utils/db";

export async function runWithJobLog(
  jobType: "EMAIL_SEND" | "FOLLOW_UPS",
  fn: () => Promise<Record<string, number>>
): Promise<Record<string, number>> {
  const run = await prisma.jobRun.create({ data: { jobType, status: "RUNNING" } });
  const startedAt = Date.now();
  try {
    const result = await fn();
    await prisma.jobRun.update({
      where: { id: run.id },
      data: { status: "SUCCESS", result: JSON.stringify(result), durationMs: Date.now() - startedAt, finishedAt: new Date() },
    });
    return result;
  } catch (error) {
    await prisma.jobRun.update({
      where: { id: run.id },
      data: { status: "FAILED", errorMessage: error instanceof Error ? error.message : String(error), durationMs: Date.now() - startedAt, finishedAt: new Date() },
    });
    throw error;
  }
}
