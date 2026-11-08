"""Idempotently seed only reviewed editorial attractions. Never delete existing rows."""
import asyncio
from sqlalchemy.dialects.postgresql import insert
from database import AsyncSessionLocal,engine
from models import Attraction
from domain.attractions import ATTRACTIONS
from services.attractions import require_catalogue
async def seed():
    async with AsyncSessionLocal() as db:
        await require_catalogue(db)
        for item in ATTRACTIONS:
            statement=insert(Attraction).values(id=item['id'],name=item['title'],emirate=item['emirate'],kind=item['kind'],data=item)
            await db.execute(statement.on_conflict_do_nothing(index_elements=['id']))
        await db.commit()
    print(f'Catalogue seed checked: {len(ATTRACTIONS)} destinations across seven emirates. Existing rows preserved.')
async def main():
    try:await seed()
    finally:await engine.dispose()
if __name__=='__main__':asyncio.run(main())
