"""Exercise upgrade/downgrade with a legacy trip in the isolated database only."""
import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
from config.runtime import database_url

if os.getenv("MASAR_ENV") != "test":
    raise SystemExit("Requires MASAR_ENV=test")
url = database_url()  # Rejects every other host/port/database.
root = Path(__file__).resolve().parents[1]


def migrate(target):
    subprocess.run([sys.executable,"-m","alembic","downgrade" if target=="4ca5b00ba069" else "upgrade",target],cwd=root,check=True)


async def fixture(action, trip_id=None):
    import asyncpg
    conn=await asyncpg.connect(url.replace("postgresql+asyncpg://","postgresql://"))
    try:
        if action=="insert":
            return await conn.fetchval("INSERT INTO trips (user_id,title,itinerary_data) VALUES (990,'Phase 1 migration fixture',$1::json) RETURNING id",json.dumps({"days":[{"theme":"Legacy","activities":[]}]}))
        row=await conn.fetchrow("SELECT title,itinerary_data FROM trips WHERE id=$1",trip_id)
        assert row['title']=="Phase 1 migration fixture"
        assert json.loads(row['itinerary_data'])=={"days":[{"theme":"Legacy","activities":[]}]}
        assert await conn.fetchval("SELECT count(*) FROM places")==7
        assert await conn.fetchval("SELECT count(*) FROM information_schema.columns WHERE table_name='users' AND column_name IN ('date_of_birth','gender')")==2
        await conn.execute("DELETE FROM trips WHERE id=$1",trip_id)
    finally:
        await conn.close()


if __name__=="__main__":
    migrate("4ca5b00ba069")
    trip_id=asyncio.run(fixture("insert"))
    migrate("head")
    asyncio.run(fixture("verify",trip_id))
    print("PASS: legacy trip retained, seven frozen place seeds, existing DOB/gender columns preserved")
