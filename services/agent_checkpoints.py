"""One async PostgreSQL checkpoint pool per process; in-memory only for local/tests."""
from contextlib import asynccontextmanager
import os
import hashlib
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
from langgraph.checkpoint.memory import MemorySaver
from config.production import production
from config.runtime import database_url

_memory = MemorySaver()
_active = None

def checkpoint_thread(user_id, identity):
    return f"user:{user_id}:"+hashlib.sha256(str(identity).encode()).hexdigest()

async def delete_conversation_checkpoints(user_id, identity):
    await get_checkpointer().adelete_thread(checkpoint_thread(user_id, identity))

async def delete_user_checkpoints(user_id):
    saver=get_checkpointer()
    if saver is _memory:
        threads=[name for name in _memory.storage if name.startswith(f'user:{user_id}:')]
    else:
        async with saver.conn.connection() as connection:
            cursor=await connection.execute('SELECT DISTINCT thread_id FROM checkpoints WHERE thread_id LIKE %s',(f'user:{int(user_id)}:%',))
            threads=[row['thread_id'] for row in await cursor.fetchall()]
    for thread in threads:
        await saver.adelete_thread(thread)

def checkpoint_url():
    raw = os.getenv('CHECKPOINT_DATABASE_URL') or database_url()
    parsed = urlparse(raw.replace('postgresql+asyncpg://', 'postgresql://', 1))
    query = dict(parse_qsl(parsed.query))
    if 'ssl' in query:
        query['sslmode'] = 'require' if query.pop('ssl') in ('true', 'require') else 'disable'
    if parsed.hostname and parsed.hostname.endswith('.neon.tech'):
        query.setdefault('sslmode', 'require')
    return urlunparse(parsed._replace(query=urlencode(query)))

def get_checkpointer():
    if _active is not None:
        return _active
    if production():
        raise RuntimeError('Persistent checkpoint pool has not been started')
    return _memory

@asynccontextmanager
async def checkpoint_lifespan(*, setup=False):
    global _active
    backend = os.getenv('CHECKPOINT_BACKEND', 'postgres' if production() else 'memory')
    if backend == 'memory':
        if production():
            raise RuntimeError('In-memory checkpoints are forbidden in production')
        yield _memory
        return
    if backend != 'postgres':
        raise RuntimeError('Unknown checkpoint backend')
    # Restrict deserialization even if checkpoint storage is compromised.
    os.environ['LANGGRAPH_STRICT_MSGPACK'] = 'true'
    from psycopg.rows import dict_row
    from psycopg_pool import AsyncConnectionPool
    from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
    async with AsyncConnectionPool(checkpoint_url(), min_size=1, max_size=3, open=False,
            kwargs={'autocommit': True, 'row_factory': dict_row, 'prepare_threshold': None}, timeout=10) as pool:
        await pool.wait(timeout=15)
        saver = AsyncPostgresSaver(pool)
        if setup:
            await saver.setup()  # Only the explicit deployment migration command may create tables.
        else:
            async with pool.connection() as connection:
                await connection.execute('SELECT 1 FROM checkpoint_migrations LIMIT 1')
        previous, _active = _active, saver
        try:
            yield saver
        finally:
            _active = previous
