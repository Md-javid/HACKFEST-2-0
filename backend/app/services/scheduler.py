"""
PolicyPulse AI – Background Scheduler for Periodic Monitoring
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.config import settings

scheduler = AsyncIOScheduler()


async def scheduled_scan():
    """Run periodic compliance scan."""
    try:
        print("[SCAN] Starting scheduled compliance scan...")
        from app.services.rule_engine import run_compliance_scan
        result = await run_compliance_scan()
        print(f"[OK] Scheduled scan complete: {result}")
    except Exception as e:
        print(f"[ERR] Scheduled scan failed: {e}")


def start_scheduler():
    """Start the background scheduler."""
    scheduler.add_job(
        scheduled_scan,
        "interval",
        minutes=settings.SCAN_INTERVAL_MINUTES,
        id="compliance_scan",
    )
    scheduler.start()
    print(f"[SCHED] Scheduler started: scanning every {settings.SCAN_INTERVAL_MINUTES} minutes")


def stop_scheduler():
    """Stop the background scheduler."""
    scheduler.shutdown()
    print("[SCHED] Scheduler stopped")
