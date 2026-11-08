"""Run separately: python -m tools.evidence_worker (no HTTP port)."""
import asyncio
import logging
import os
from pathlib import Path
import signal
import tempfile
import time
from sqlalchemy import text
from database import AsyncSessionLocal, engine
from config.production import validate_settings
from passport.verification import claim, process
from passport.evidence_cleanup import process_deletions

logger = logging.getLogger(__name__)


def failure_hint(error):
    kind = type(getattr(error, 'orig', error)).__name__
    if isinstance(error, TimeoutError):
        return 'database response timed out; check network/VPN and database availability'
    if 'Programming' in kind or 'UndefinedTable' in kind:
        return 'evidence table unavailable; check that the evidence migration is applied to this database'
    if isinstance(error, OSError) and not getattr(error, 'orig', None):
        return 'network or heartbeat-file access failed; check connection and file permissions'
    return f'database connection/query failed ({kind}); check database availability and configuration'


async def probe_health(sessions, health, timeout=15):
    # Include connection acquisition and session cleanup in the timeout.
    async with asyncio.timeout(timeout):
        async with sessions() as db:
            await db.execute(text('SELECT 1 FROM passport_evidence_checks LIMIT 1'))
    health.parent.mkdir(parents=True, exist_ok=True)
    health.touch()


async def health_loop(sessions, health):
    connected = None
    while True:
        try:
            await probe_health(sessions, health)
            if connected is not True:
                logger.info('Evidence queue connected. Saved submissions will be picked up automatically.')
            connected = True
        except asyncio.CancelledError:
            raise
        except Exception as error:
            connected = False
            logger.warning('Evidence health check: %s. Retrying in 15 seconds.', failure_hint(error))
        await asyncio.sleep(15)


async def main():
    validate_settings()
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
    task = asyncio.current_task()
    try:
        asyncio.get_running_loop().add_signal_handler(signal.SIGTERM, task.cancel)
    except (NotImplementedError, AttributeError):
        pass
    health = Path(os.getenv('EVIDENCE_HEARTBEAT_FILE', str(Path(tempfile.gettempdir())/'masar-evidence-heartbeat')))
    print('MASAR evidence worker starting. Registered photo checks; stop with Ctrl+C.', flush=True)
    monitor = asyncio.create_task(health_loop(AsyncSessionLocal, health))
    failures = 0
    cleanup_at = 0
    try:
        while True:
            try:
                if time.monotonic() >= cleanup_at:
                    await process_deletions(AsyncSessionLocal)
                    cleanup_at = time.monotonic()+30
                job = await claim(AsyncSessionLocal)
                if failures:
                    logger.info('Evidence queue connection restored.')
                failures = 0
                if job:
                    logger.info('Checking submission %s.', job[0][:8])
                    await process(AsyncSessionLocal, *job)
                    logger.info('Submission %s processing pass finished; view the saved status in MASAR.', job[0][:8])
                else:
                    await asyncio.sleep(3)
            except asyncio.CancelledError:
                raise
            except Exception as error:
                failures += 1
                delay = min(5 * 2 ** min(failures-1, 3), 30)
                logger.warning('Evidence queue: %s. Retrying in %ss; saved submissions remain queued or leased.', failure_hint(error), delay)
                await asyncio.sleep(delay)
    finally:
        monitor.cancel()
        await asyncio.gather(monitor, return_exceptions=True)
        health.unlink(missing_ok=True)
        await engine.dispose()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, asyncio.CancelledError):
        pass
