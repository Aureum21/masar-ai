"""Lightweight durable receipt worker. No HTTP port or challenge awards."""
import asyncio,logging,os,signal,tempfile
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from sqlalchemy import text
from config.production import validate_settings
from database import AsyncSessionLocal,engine
import models
from receipts.service import claim,process,cleanup,recover_uploads

async def main():
    validate_settings()
    if os.getenv('RECEIPTS_ENABLED','true').lower()!='true':raise RuntimeError('Enable Receipt Assistant before starting its worker.')
    logging.basicConfig(level=logging.INFO,format='%(asctime)s %(levelname)s %(message)s')
    logger=logging.getLogger('receipt-worker')
    health=Path(os.getenv('RECEIPT_HEARTBEAT_FILE',str(Path(tempfile.gettempdir())/'masar-receipt-heartbeat')))
    task=asyncio.current_task()
    try:asyncio.get_running_loop().add_signal_handler(signal.SIGTERM,task.cancel)
    except (NotImplementedError,AttributeError):pass
    logger.info('Receipt worker ready. Private receipt jobs only; no refunds or Passport awards.')
    try:
        while True:
            try:
                async with AsyncSessionLocal() as db:await db.execute(text('SELECT 1 FROM travel_receipts LIMIT 1'))
                health.parent.mkdir(parents=True,exist_ok=True);health.touch()
                await recover_uploads(AsyncSessionLocal)
                await cleanup(AsyncSessionLocal)
                job=await claim(AsyncSessionLocal)
                if job:
                    logger.info('Processing receipt %s.',job[0][:8])
                    await process(AsyncSessionLocal,*job)
                else:await asyncio.sleep(3)
            except asyncio.CancelledError:raise
            except Exception as error:
                logger.warning('Receipt queue unavailable (%s). Check the receipt migration and database; retrying.',type(error).__name__)
                await asyncio.sleep(10)
    finally:
        health.unlink(missing_ok=True);await engine.dispose()

if __name__=='__main__':
    try:asyncio.run(main())
    except (KeyboardInterrupt,asyncio.CancelledError):pass
