"""Long-running durable planner process. No HTTP port, no automatic provider retries."""
import asyncio
import os
import tempfile
import signal
import logging
from pathlib import Path
from sqlalchemy import text
from database import AsyncSessionLocal,engine
from services.planning_runs import claim_run,execute_run
from config.production import validate_settings
from services.agent_checkpoints import checkpoint_lifespan

async def heartbeat_file():
    path=Path(os.getenv('WORKER_HEARTBEAT_FILE',str(Path(tempfile.gettempdir())/'masar-worker-heartbeat')))
    path.parent.mkdir(parents=True,exist_ok=True)
    try:
        while True:
            try:
                async with asyncio.timeout(5):
                    async with AsyncSessionLocal() as db:
                        await db.execute(text('SELECT 1 FROM planning_runs LIMIT 1'))
                path.touch()
            except Exception:
                logging.getLogger(__name__).warning('Worker health: queue is unreachable')
            await asyncio.sleep(15)
    finally:
        path.unlink(missing_ok=True)

async def main():
    validate_settings()
    task=asyncio.current_task()
    try:
        asyncio.get_running_loop().add_signal_handler(signal.SIGTERM, task.cancel)
    except (NotImplementedError,AttributeError):
        pass  # Windows local development uses Ctrl+C.
    try:
        async with checkpoint_lifespan():
            async with AsyncSessionLocal() as db:
                if not await db.scalar(text("SELECT to_regclass('public.planning_runs') IS NOT NULL")):
                    raise SystemExit('Planning schema is not installed. Apply the reviewed migration first.')
            print('MASAR planning worker ready. Stop with Ctrl+C.',flush=True)
            health=asyncio.create_task(heartbeat_file())
            try:
                while True:
                    try:
                        claim=await claim_run()
                        if claim:
                            await execute_run(*claim)
                        else:
                            await asyncio.sleep(3)
                    except asyncio.CancelledError:
                        raise
                    except Exception as error:
                        logging.getLogger(__name__).error('Worker queue unavailable (%s); retrying shortly.',type(error).__name__)
                        await asyncio.sleep(5)
            finally:
                health.cancel()
                await asyncio.gather(health,return_exceptions=True)
    finally:
        await engine.dispose()

if __name__=='__main__':
    try:
        asyncio.run(main())
    except (KeyboardInterrupt,asyncio.CancelledError):
        pass
