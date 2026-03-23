import cron from "node-cron";
import { processEmailQueue, processFollowUps } from "../services/email-engine";

const CR_TIMEZONE = "America/Costa_Rica";

export function startScheduler(): void {
  console.log("[Scheduler] Starting cron jobs...");

  cron.schedule("0 8 * * 1-5", async () => {
    console.log("[Scheduler] Running email queue...");
    try {
      await processEmailQueue();
    } catch (error) {
      console.error("[Scheduler] Email queue error:", error);
    }
  }, { timezone: CR_TIMEZONE });

  cron.schedule("0 10 * * 1-5", async () => {
    console.log("[Scheduler] Running follow-ups...");
    try {
      await processFollowUps();
    } catch (error) {
      console.error("[Scheduler] Follow-ups error:", error);
    }
  }, { timezone: CR_TIMEZONE });

  console.log("[Scheduler] Cron jobs scheduled (America/Costa_Rica):");
  console.log("  - Email queue: Mon-Fri at 8:00 AM CR");
  console.log("  - Follow-ups:  Mon-Fri at 10:00 AM CR");
}
