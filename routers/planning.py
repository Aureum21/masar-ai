"""Account-saved briefs, revision checks and pre-research requirements.

No migration or provider call is performed by importing or using this router.
"""
from datetime import datetime,timezone
from uuid import uuid4
from fastapi import APIRouter,Depends,HTTPException,Response
from sqlalchemy import select,text
from sqlalchemy.ext.asyncio import AsyncSession
import auth,models
from domain.planning import PlanningDraft,SaveBrief,research_policy

router=APIRouter(prefix='/api/v1/planning',tags=['planning'])


async def schema_ready(db):
    return bool(await db.scalar(text("SELECT to_regclass('public.trip_briefs') IS NOT NULL")))


async def require_schema(db):
    if not await schema_ready(db):
        raise HTTPException(503,'Account-saved briefs are awaiting the reviewed database update. Your device draft is still available.')


def brief_response(record):
    return {'revision':record.revision,'draft':record.payload,'updated_at':record.updated_at.isoformat(),
            'requirements':research_policy(record.payload)}


@router.get('/status')
async def status(response:Response,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    response.headers['Cache-Control']='no-store'
    from routers.planning_runs import runs_ready
    return {'briefs_available':await schema_ready(db),'durable_planning_available':await runs_ready(db)}


@router.get('/brief')
async def get_brief(response:Response,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    response.headers['Cache-Control']='no-store'
    await require_schema(db)
    record=await db.scalar(select(models.TripBriefRecord).where(models.TripBriefRecord.user_id==user.id))
    return brief_response(record) if record else {'revision':0,'draft':None,'updated_at':None,'requirements':None}


@router.put('/brief')
async def save_brief(body:SaveBrief,response:Response,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    response.headers['Cache-Control']='no-store'
    await require_schema(db)
    # Lock the owner's row even for first insert, so two devices cannot both create revision 1.
    await db.execute(select(models.User.id).where(models.User.id==user.id).with_for_update())
    record=await db.scalar(select(models.TripBriefRecord).where(models.TripBriefRecord.user_id==user.id).with_for_update().execution_options(populate_existing=True))
    revision=record.revision if record else 0
    if body.expected_revision!=revision:
        raise HTTPException(409,'This brief changed on another device. Review the account version before saving again.')
    payload=body.draft.model_dump(mode='json')
    # IDs are generated/retained by the server, never adopted from another account's client draft.
    identity=record.id if record else str(uuid4())
    payload['id']=identity
    now=datetime.now(timezone.utc)
    if record:
        record.payload=payload;record.revision+=1;record.updated_at=now
    else:
        record=models.TripBriefRecord(id=identity,user_id=user.id,payload=payload,revision=1,updated_at=now)
        db.add(record)
    await db.commit()
    await db.refresh(record)
    return brief_response(record)


async def owned_brief(db,user_id,identity,revision):
    await require_schema(db)
    record=await db.scalar(select(models.TripBriefRecord).where(models.TripBriefRecord.id==str(identity),models.TripBriefRecord.user_id==user_id))
    if not record:raise HTTPException(404,'Trip brief not found')
    if record.revision!=revision:raise HTTPException(409,'Your saved brief has changed. Open it again before starting research.')
    return PlanningDraft.model_validate(record.payload).model_dump(mode='json')
