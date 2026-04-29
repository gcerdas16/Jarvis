import cron from "node-cron";
import { processEmailQueue, processFollowUps } from "../services/email-engine";
import { runWithJobLog } from "./runner";

const CR_TIMEZONE = "America/Costa_Rica";

export function startScheduler(): void {
  // Run initials then follow-ups sequentially at 8:05am CR, Mon-Fri
  cron.schedule("5 8 * * 1-5", () => {
    runWithJobLog("EMAIL_SEND", processEmailQueue)
      .then(() => runWithJobLog("FOLLOW_UPS", processFollowUps))
      .catch((e) => console.error("[Scheduler] error:", e));
  }, { timezone: CR_TIMEZONE });

  console.log("[Scheduler] Cron jobs scheduled (America/Costa_Rica)");
}
