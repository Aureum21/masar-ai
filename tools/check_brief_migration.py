"""Round-trip the brief migration only in the explicitly isolated test database."""
import os,asyncio,json,subprocess,sys
from pathlib import Path
from config.runtime import database_url
if os.getenv('MASAR_ENV')!='test':raise SystemExit('Requires isolated test mode')
url=database_url()
root=Path(__file__).resolve().parents[1]
def migrate(action,target):subprocess.run([sys.executable,'-m','alembic',action,target],cwd=root,check=True)

async def fixture(action,identity=None):
    import asyncpg
    connection=await asyncpg.connect(url.replace('postgresql+asyncpg://','postgresql://'))
    try:
        if action=='insert':
            return await connection.fetchval("INSERT INTO trips(user_id,title,itinerary_data) VALUES(991,'Brief migration legacy fixture',$1::json) RETURNING id",json.dumps({'days':[{'theme':'Legacy','activities':[]}]}))
        row=await connection.fetchrow('SELECT title,itinerary_data FROM trips WHERE id=$1',identity)
        assert row['title']=='Brief migration legacy fixture'
        assert json.loads(row['itinerary_data'])=={'days':[{'theme':'Legacy','activities':[]}]}
        assert await connection.fetchval("SELECT to_regclass('public.trip_briefs') IS NOT NULL")
        assert await connection.fetchval('SELECT count(*) FROM places')==7
        await connection.execute('DELETE FROM trips WHERE id=$1',identity)
    finally:await connection.close()

if __name__=='__main__':
    migrate('downgrade','20261023_places')
    identity=asyncio.run(fixture('insert'))
    migrate('upgrade','head')
    asyncio.run(fixture('verify',identity))
    print('PASS: additive brief upgrade/downgrade preserves legacy trip and place seeds')
