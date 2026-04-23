import { prisma } from "../utils/db";
import { toCRDateString } from "../utils/timezone";

const DAILY_LIMIT = parseInt(process.env.DAILY_EMAIL_LIMIT || "90");

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

  const today = toCRDateString(new Date());
  const lastReset = toCRDateString(state.lastResetDate);

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
    data: { emailsSentToday: { increment: 1 } },
  });
}
