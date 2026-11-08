"""Read-only catalogue queries; editorial data is seeded explicitly, never on a GET."""
from services.attraction_media import hydrate_catalogue_images
from sqlalchemy import select,func,or_,text
from fastapi import HTTPException
from models import Attraction
async def require_catalogue(db):
    if not await db.scalar(text("SELECT to_regclass('public.attractions') IS NOT NULL")):
        raise HTTPException(503,'The attraction catalogue needs its database update. Existing Explore picks remain available.')
async def search_attractions(db,region='all',query='',offset=0,limit=12,ids=None,hydrate_media=True):
    await require_catalogue(db)
    filters=[]
    if region!='all':filters.append(Attraction.emirate==region)
    if query.strip():
        term=query.strip().replace('\\','\\\\').replace('%','\\%').replace('_','\\_')
        filters.append(or_(Attraction.name.ilike('%'+term+'%',escape='\\'),Attraction.kind.ilike('%'+term+'%',escape='\\')))
    if ids is not None:filters.append(Attraction.id.in_(ids))
    total=await db.scalar(select(func.count()).select_from(Attraction).where(*filters))
    records=(await db.scalars(select(Attraction).where(*filters).order_by(Attraction.emirate,Attraction.name,Attraction.id).offset(offset).limit(limit))).all()
    items=[dict(item.data,id=item.id,title=item.name,emirate=item.emirate,kind=item.kind) for item in records]
    from domain.accessibility import venue_evidence
    for item in items:item['accessibility']=venue_evidence(item['id'])
    if hydrate_media:
        items=await hydrate_catalogue_images(items)
    else:
        items=[{key:value for key,value in item.items() if key not in {'photoAssets','attribution','imageFallbacks'}} for item in items]
    return {'items':items,'total':total,'offset':offset,'limit':limit,'nextOffset':offset+limit if offset+limit<total else None}
