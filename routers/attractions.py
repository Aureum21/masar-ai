"""Authenticated editorial destinations, distinct from live provider discovery."""
from typing import Literal
from fastapi import APIRouter,Depends,Query
from pydantic import BaseModel,Field
from sqlalchemy.ext.asyncio import AsyncSession
import auth
from services.attractions import search_attractions
Region=Literal['all','dubai','abudhabi','sharjah','ajman','rasalkhaimah','fujairah','ummalquwain']
router=APIRouter(prefix='/api/v1/catalogue',tags=['attractions'])
@router.get('')
async def browse(region:Region='all',q:str=Query(default='',max_length=160),offset:int=Query(default=0,ge=0,le=10000),limit:int=Query(default=12,ge=1,le=200),user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    return await search_attractions(db,region,q,offset,limit)
class Resolve(BaseModel):
    ids:list[str]=Field(max_length=30)
@router.post('/resolve')
async def resolve(body:Resolve,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    result=await search_attractions(db,ids=body.ids,limit=30)
    result['unavailable']=[identity for identity in body.ids if identity not in {item['id'] for item in result['items']}]
    return result
