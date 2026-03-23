"""Scheduler: runs run_daily.py at 7:42 AM Costa Rica time, Mon-Fri."""
import asyncio
import sys
import time
from datetime import datetime
from zoneinfo import ZoneInfo

print("[Scheduler] Loading...", flush=True)

try:
    from run_daily import main as run_daily_main
    print("[Scheduler] run_daily imported OK", flush=True)
except Exception as e:
    print(f"[Scheduler] Failed to import run_daily: {e}", flush=True)
    sys.exit(1)

CR_TZ = ZoneInfo("America/Costa_Rica")
RUN_HOUR = 7
RUN_MINUTE = 42


def main():
    print("[Scheduler] Scraper scheduler started (America/Costa_Rica)", flush=True)
    print(f"[Scheduler] Scheduled: Mon-Fri at {RUN_HOUR}:{RUN_MINUTE:02d} AM CR", flush=True)
    now = datetime.now(CR_TZ)
    print(f"[Scheduler] Current time CR: {now.strftime('%Y-%m-%d %H:%M:%S')}", flush=True)

    last_run_date = None

    while True:
        now = datetime.now(CR_TZ)
        today = now.date()
        weekday = now.weekday()  # 0=Mon, 6=Sun

        if (
            weekday < 5
            and now.hour == RUN_HOUR
            and now.minute == RUN_MINUTE
            and last_run_date != today
        ):
            print(f"\n[Scheduler] Running daily scraper — {now.strftime('%Y-%m-%d %H:%M:%S')} CR", flush=True)
            try:
                asyncio.run(run_daily_main())
                print("[Scheduler] Daily scraper completed", flush=True)
            except Exception as e:
                print(f"[Scheduler] Error: {e}", flush=True)

            last_run_date = today

        time.sleep(30)


if __name__ == "__main__":
    main()
