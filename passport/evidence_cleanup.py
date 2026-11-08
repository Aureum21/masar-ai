"""Durable private-object deletions, retried by the existing evidence worker."""
import asyncio
from datetime import timedelta
import logging
from sqlalchemy import select
from .models import EvidenceDeletion, utcnow
from .evidence_storage import delete_ref

log = logging.getLogger(__name__)


async def process_deletions(sessions, ids=None, limit=10):
    completed = 0
    async with sessions() as db:
        query = select(EvidenceDeletion).where(EvidenceDeletion.retry_at <= utcnow())
        if ids is not None:
            if not ids:
                return 0
            query = query.where(EvidenceDeletion.id.in_(ids))
        rows = list((await db.scalars(query.order_by(EvidenceDeletion.created_at)
                    .with_for_update(skip_locked=True).limit(limit))).all())
        for row in rows:
            try:
                await asyncio.to_thread(delete_ref, dict(row.storage))
                await db.delete(row)
                completed += 1
            except Exception as error:
                row.attempts += 1
                row.last_error = type(error).__name__[:80]
                row.retry_at = utcnow()+timedelta(seconds=min(3600, 30*2**min(row.attempts, 7)))
                log.warning('Private evidence deletion deferred (%s); durable retry retained.', type(error).__name__)
        await db.commit()
    return completed
