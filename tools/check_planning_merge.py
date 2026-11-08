"""Exercise both migration parents on disposable Postgres. Never targets app data."""
import os,asyncio,json,subprocess,sys
from pathlib import Path
from config.runtime import database_url
if os.getenv('MASAR_ENV')!='test':raise SystemExit('Requires isolated test mode')
url=database_url()
root=Path(__file__).resolve().parents[1]
def migrate(action,target):subprocess.run([sys.executable,'-m','alembic',action,target],cwd=root,check=True)

async def fixture(action):
    import asyncpg
    connection=await asyncpg.connect(url.replace('postgresql+asyncpg://','postgresql://'))
    try:
        if action=='insert':
            await connection.execute("INSERT INTO booking_operations(id,user_id,kind,source_key,request_digest,status,environment,result,created_at) VALUES('planning-merge-fixture',991,'hotel','planning-merge-fixture','fixture','PENDING','test',$1::json,now())",json.dumps({'preserve':'existing alazar booking'}))
            return
        result=await connection.fetchval("SELECT result FROM booking_operations WHERE id='planning-merge-fixture'")
        assert json.loads(result)=={'preserve':'existing alazar booking'}
        assert await connection.fetchval('SELECT version_num FROM alembic_version')=='20261023_join'
        assert await connection.fetchval("SELECT to_regclass('public.trip_briefs') IS NOT NULL")
        assert await connection.fetchval("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'passport_%'")==8
        await connection.execute("DELETE FROM booking_operations WHERE id='planning-merge-fixture'")
    finally:await connection.close()

if __name__=='__main__':
    # Reset only the explicitly disposable database to reproduce each parent exactly.
    migrate('downgrade','base')
    migrate('upgrade','93b1e7c4a602')
    asyncio.run(fixture('insert'))
    migrate('upgrade','head')
    asyncio.run(fixture('verify'))
    migrate('downgrade','base')
    migrate('upgrade','20261023_briefs')
    migrate('upgrade','head')
    print('PASS: both parent histories upgrade; alazar booking fixture and eight Passport tables preserved')
