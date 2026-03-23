"""Scheduler: runs run_daily.py at 7:42 AM Costa Rica time, Mon-Fri."""
import asyncio
import time
from datetime import datetime
from zoneinfo import ZoneInfo

from run_daily import main as run_daily_main

CR_TZ = ZoneInfo("America/Costa_Rica")
RUN_HOUR = 7
RUN_MINUTE = 42


def main():
    print("[Scheduler] Scraper scheduler started (America/Costa_Rica)")
    print(f"[Scheduler] Scheduled: Mon-Fri at {RUN_HOUR}:{RUN_MINUTE:02d} AM CR")

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
            print(f"\n[Scheduler] Running daily scraper — {now.strftime('%Y-%m-%d %H:%M:%S')} CR")
            try:
                asyncio.run(run_daily_main())
                print("[Scheduler] Daily scraper completed")
            except Exception as e:
                print(f"[Scheduler] Error: {e}")

            last_run_date = today

        time.sleep(30)


if __name__ == "__main__":
    main()
