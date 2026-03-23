import { prisma } from "../utils/db";

const DAILY_LIMIT = parseInt(process.env.DAILY_EMAIL_LIMIT || "30");

export async function getWarmupState() {
  let state = await prisma.warmupState.findFirst();

  if (!state) {
    state = await prisma.warmupState.create({
      data: {
        currentDailyLimit: DAILY_LIMIT,
        maxDailyLimit: DAILY_LIMIT,
        emailsSentToday: 0,
      },
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const lastReset = state.lastResetDate.toISOString().split("T")[0];

  if (today !== lastReset) {
    state = await prisma.warmupState.update({
      where: { id: state.id },
      data: {
        emailsSentToday: 0,
        currentDailyLimit: DAILY_LIMIT,
        lastResetDate: new Date(),
      },
    });
  }

  return state;
}

export async function canSendEmail(): Promise<boolean> {
  const state = await getWarmupState();
  return state.emailsSentToday < state.currentDailyLimit;
}

export async function incrementSentCount(): Promise<void> {
  const state = await getWarmupState();
  await prisma.warmupState.update({
    where: { id: state.id },
    data: { emailsSentToday: state.emailsSentToday + 1 },
  });
}
