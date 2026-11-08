"""Owner-scoped run API; requests enqueue research, never execute it inline."""
import hashlib,json
from uuid import UUID,uuid4
from typing import Literal
from domain.planning_choices import initial_flow,put_flow,flow_state,options,option_id,advance,auto_option,choice_reference
from domain.research_preview import MAX_PROVIDER_ID_LENGTH
from fastapi import APIRouter,Depends,HTTPException,Response
from pydantic import BaseModel,ConfigDict,Field
from sqlalchemy import select,text
from sqlalchemy.ext.asyncio import AsyncSession
import auth,models
from routers.planning import owned_brief
from domain.planning import research_policy
from services.planning_runs import public_run,expire_runs,now,MAX_ATTEMPTS

router=APIRouter(prefix='/api/v1/planning/runs',tags=['planning'])

class CreateRun(BaseModel):
    model_config=ConfigDict(extra='forbid')
    brief_id:UUID
    brief_revision:int=Field(ge=1)
    request_id:UUID

async def runs_ready(db):
    return bool(await db.scalar(text("SELECT to_regclass('public.planning_runs') IS NOT NULL")))

async def require_runs(db):
    if not await runs_ready(db):raise HTTPException(503,'Saved planning runs need the reviewed database update. Your brief is safe.')

async def owner_run(db,user_id,identity):
    await require_runs(db)
    await expire_runs(db,user_id)
    run=await db.scalar(select(models.PlanningRun).where(models.PlanningRun.id==str(identity),models.PlanningRun.user_id==user_id).with_for_update().execution_options(populate_existing=True))
    if not run:raise HTTPException(404,'Planning run not found')
    return run

async def active_request(db,user_id):
    candidates=(await db.scalars(select(models.PlanningRun).where(models.PlanningRun.user_id==user_id,models.PlanningRun.status.in_(['queued','running','interrupted'])))).all()
    return next((run.id for run in candidates if run.status in {'queued','running'} or (flow_state(run) or {}).get('awaiting')),None)

@router.post('',status_code=201)
async def create_run(body:CreateRun,response:Response,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    response.headers['Cache-Control']='no-store'
    await require_runs(db)
    # Serializes duplicate requests and per-owner admission across API processes.
    await db.execute(select(models.User.id).where(models.User.id==user.id).with_for_update())
    fingerprint=hashlib.sha256(f'{body.brief_id}:{body.brief_revision}'.encode()).hexdigest()
    previous=await db.scalar(select(models.PlanningRun).where(models.PlanningRun.user_id==user.id,models.PlanningRun.request_id==str(body.request_id)))
    if previous:
        if previous.request_hash!=fingerprint:raise HTTPException(409,'This request key belongs to another brief revision.')
        response.status_code=200;return public_run(previous)
    draft=await owned_brief(db,user.id,body.brief_id,body.brief_revision)
    policy=research_policy(draft)
    if not policy['ready']:raise HTTPException(422,' '.join(item['message'] for item in policy['missing']))
    await expire_runs(db,user.id)
    active=await active_request(db,user.id)
    if active:raise HTTPException(409,'You already have a planning request in progress. Open it from your trip brief.')
    run=models.PlanningRun(id=str(uuid4()),user_id=user.id,brief_id=str(body.brief_id),brief_revision=body.brief_revision,brief_snapshot=draft,request_id=str(body.request_id),request_hash=fingerprint,status='queued',attempts=0,progress=[],workers=[],message='Your request is saved and waiting to begin.')
    put_flow(run,initial_flow(draft))
    db.add(run);await db.commit();await db.refresh(run)
    return public_run(run)

@router.get('')
async def list_runs(response:Response,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    response.headers['Cache-Control']='no-store';await require_runs(db)
    await expire_runs(db,user.id);await db.commit()
    runs=(await db.scalars(select(models.PlanningRun).where(models.PlanningRun.user_id==user.id).order_by(models.PlanningRun.created_at.desc()).limit(8))).all()
    return [public_run(run) for run in runs]

@router.get('/{identity}')
async def get_run(identity:UUID,response:Response,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    response.headers['Cache-Control']='no-store'
    run=await owner_run(db,user.id,identity);await db.commit()
    return public_run(run)

@router.post('/{identity}/cancel')
async def cancel_run(identity:UUID,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    run=await owner_run(db,user.id,identity)
    if run.status in {'queued','running'} or (run.status=='interrupted' and (flow_state(run) or {}).get('awaiting')):
        run.status='completed' if run.trip_id else 'cancelled'
        run.message='Your draft was already saved.' if run.trip_id else 'Planning cancelled. Your trip brief is still saved.'
        run.lease_token=None;run.lease_expires_at=None;run.updated_at=now()
    await db.commit();return public_run(run)

@router.post('/{identity}/retry')
async def retry_run(identity:UUID,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    # Same lock order as creation to avoid conflicting admission decisions.
    await db.execute(select(models.User.id).where(models.User.id==user.id).with_for_update())
    run=await owner_run(db,user.id,identity)
    if run.trip_id:
        run.status='completed';run.message='Your existing draft is saved.'
    elif (flow_state(run) or {}).get('awaiting') or run.status not in {'failed','interrupted'} or run.attempts>=MAX_ATTEMPTS:
        raise HTTPException(409,'This request cannot be retried. Review your trip brief to start a new request.')
    else:
        policy=research_policy(run.brief_snapshot)
        if not policy['ready']:raise HTTPException(422,' '.join(item['message'] for item in policy['missing'])+' Update your trip brief and start a new request; retry uses the original saved dates.')
        active=await active_request(db,user.id)
        if active:raise HTTPException(409,'Another planning request is already in progress.')
        if not flow_state(run):put_flow(run,initial_flow(run.brief_snapshot))
        run.status='queued';run.message='Your saved request is queued for another attempt.'
        run.lease_token=None;run.lease_expires_at=None;run.updated_at=now()
    await db.commit();return public_run(run)


class PlanningChoice(BaseModel):
    model_config=ConfigDict(extra='forbid')
    stage:Literal['flights','hotels','rooms']
    expected_revision:int=Field(ge=0)
    option_id:str|None=Field(default=None,max_length=MAX_PROVIDER_ID_LENGTH)
    choose_for_me:bool=False

@router.post('/{identity}/choice')
async def choose_option(identity:UUID,body:PlanningChoice,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    await db.execute(select(models.User.id).where(models.User.id==user.id).with_for_update())
    run=await owner_run(db,user.id,identity);flow=flow_state(run)
    if not flow or run.status!='interrupted' or not flow.get('awaiting') or flow['stage']!=body.stage or flow['revision']!=body.expected_revision:
        raise HTTPException(409,'This planning step has changed. Refresh progress before choosing again.')
    if body.choose_for_me and body.option_id:raise HTTPException(422,'Choose an option or ask MASAR to choose, not both.')
    item=auto_option(run,body.stage) if body.choose_for_me else next((x for x in options(run,body.stage) if body.option_id in {option_id(x,body.stage),choice_reference(x,body.stage)}),None)
    if not item:raise HTTPException(422,'Choose one of the returned options. MASAR can only compare usable AED quotes automatically.')
    try:advance(run,flow,item)
    except ValueError as error:raise HTTPException(422,str(error)) from error
    run.updated_at=now();await db.commit();return public_run(run)


class ChoiceRevision(BaseModel):
    model_config=ConfigDict(extra='forbid')
    expected_revision:int=Field(ge=0)

@router.post('/{identity}/change-hotel')
async def change_hotel(identity:UUID,body:ChoiceRevision,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    await db.execute(select(models.User.id).where(models.User.id==user.id).with_for_update())
    run=await owner_run(db,user.id,identity);flow=flow_state(run)
    if not flow or flow['stage']!='rooms' or run.status not in {'interrupted','failed'} or flow['revision']!=body.expected_revision or not flow.get('hotel_options'):
        raise HTTPException(409,'This hotel step has changed. Refresh planning progress.')
    if await active_request(db,user.id) not in {None,run.id}:raise HTTPException(409,'Another planning request is active.')
    flow['selected'].pop('hotel',None);flow['selected'].pop('room',None)
    run.workers=[x for x in run.workers if (x if isinstance(x,str) else x.get('type'))!='accommodation_result']+[{'type':'accommodation_result','content':{'hotels':flow['hotel_options']}}]
    flow['stage']='hotels';flow['awaiting']=True;flow['revision']+=1;put_flow(run,flow)
    run.status='interrupted';run.message='Browse rooms at another hotel.';run.updated_at=now()
    await db.commit();return public_run(run)
