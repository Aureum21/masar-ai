"""Durable queue, fenced leases and one saved trip per planning run."""
import asyncio
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from sqlalchemy import select, func
from database import AsyncSessionLocal
import models
from domain.research_preview import research_preview,stored_results
from domain.planning import research_policy
from domain.planning_choices import flow_state,put_flow,public_flow,options,selectable,auto_option,advance,quoted_budget,choice_reference

MAX_ATTEMPTS = 3
LEASE_SECONDS = 90
RUN_TIMEOUT_SECONDS = 1200
TERMINAL = {'completed','failed','interrupted','cancelled'}


def now():
    return datetime.now(timezone.utc)


def public_run(run):
    workers,results=stored_results(run.workers)
    for result in results:
        for key,stage in [('flights','flights'),('hotels','hotels'),('rooms','rooms')]:
            for item in result['content'].get(key,[]):item['choice_id']=choice_reference(item,stage)
    flow=public_flow(run)
    waiting=bool(flow and flow['awaiting'] and run.status=='interrupted')
    return {'id':run.id,'status':'awaiting_choice' if waiting else run.status,'choice_flow':flow,'attempts':run.attempts,'max_attempts':MAX_ATTEMPTS,
            'brief_revision':run.brief_revision,'progress':run.progress,'workers':workers,'research_results':results,'enabled_workers':research_policy(run.brief_snapshot)['workers'],
            'message':run.message,'trip_id':run.trip_id,'response':run.response,
            'created_at':run.created_at.isoformat(),'updated_at':run.updated_at.isoformat(),
            'can_retry':not waiting and run.status in {'failed','interrupted'} and run.attempts<MAX_ATTEMPTS,
            'can_cancel':waiting or run.status in {'queued','running'}}


async def expire_runs(db, user_id=None):
    query=select(models.PlanningRun).where(models.PlanningRun.status=='running',models.PlanningRun.lease_expires_at<func.now()).with_for_update(skip_locked=True)
    if user_id is not None:query=query.where(models.PlanningRun.user_id==user_id)
    for run in (await db.scalars(query)).all():
        # The trip and its reference commit in one transaction. A crash after save is recoverable.
        run.status='completed' if run.trip_id else 'interrupted'
        run.message='Your draft is saved.' if run.trip_id else 'Planning was interrupted. You can retry this saved request.'
        run.lease_token=None;run.lease_expires_at=None;run.updated_at=now()
    await db.flush()


async def claim_run():
    async with AsyncSessionLocal() as db:
        await expire_runs(db)
        run=await db.scalar(select(models.PlanningRun).where(models.PlanningRun.status=='queued').order_by(models.PlanningRun.created_at).with_for_update(skip_locked=True).limit(1))
        if not run:
            await db.commit();return None
        flow=flow_state(run)
        run.status='running'
        if not (flow and flow.get('resume')):run.attempts+=1
        if flow:flow['resume']=False;put_flow(run,flow)
        run.lease_token=str(uuid4())
        run.lease_expires_at=now()+timedelta(seconds=LEASE_SECONDS)
        run.updated_at=now();run.message='Connecting the places and services your trip needs.'
        run.progress=(run.progress+['Research started.'])[-24:]
        if not flow:run.workers=[]
        else:
            refresh={'flights':{'flight_result'},'hotels':{'accommodation_result'},'rooms':{'accommodation_result'},'research':{'event_result','logistics_result'}}[flow['stage']]
            run.workers=[x for x in run.workers if (x if isinstance(x,str) else x.get('type')) not in refresh]
        await db.commit()
        return (run.id,run.lease_token)


async def locked_lease(db, run_id, token, user_id=None):
    query=select(models.PlanningRun).where(models.PlanningRun.id==run_id,models.PlanningRun.status=='running',models.PlanningRun.lease_token==token,models.PlanningRun.lease_expires_at>func.now()).with_for_update()
    if user_id is not None:query=query.where(models.PlanningRun.user_id==int(user_id))
    return await db.scalar(query.execution_options(populate_existing=True))


async def heartbeat(run_id,token):
    async with AsyncSessionLocal() as db:
        run=await locked_lease(db,run_id,token)
        if not run:return False
        run.lease_expires_at=now()+timedelta(seconds=LEASE_SECONDS)
        run.updated_at=now();await db.commit();return True


async def record_chunk(run_id,token,chunk):
    async with AsyncSessionLocal() as db:
        run=await locked_lease(db,run_id,token)
        if not run:return False
        if chunk.get('status_update'):
            # Store bounded human-readable progress, not model traces/provider payloads.
            run.progress=(run.progress+[str(chunk['status_update'])[:400]])[-24:]
            if str(chunk['status_update']).startswith('Planning needs your review:'):
                run.message='Planning needs your review: Some itinerary stops could not be matched safely to your shortlist. Retry the saved request; your choices are preserved.'
                run.progress=run.progress[:-1]+[run.message]
        worker=chunk.get('worker_result')
        if isinstance(worker,(list,tuple)) and len(worker)==2:
            preview=research_preview(worker[0],worker[1])
            if preview:
                if worker[0]=='flight_result' and isinstance(worker[1],dict) and worker[1].get('error'):run.message='Flight search: '+str(worker[1]['error'])[:400]
                names,_=stored_results(run.workers)
                run.workers=[item for item in run.workers if (item if isinstance(item,str) else item.get('type'))!=worker[0]]+[preview]
        if chunk.get('error'):raise RuntimeError('Planning agent failed')
        if chunk.get('final'):
            # A model result alone is never proof of a save.
            if not run.trip_id:raise RuntimeError('No durable trip was saved')
            run.response=str(chunk.get('response') or 'Your trip draft is saved.')[:20000]
        run.updated_at=now();await db.commit();return True


async def finish_run(run_id,token,failed=False):
    async with AsyncSessionLocal() as db:
        run=await locked_lease(db,run_id,token)
        if not run:return
        flow=flow_state(run)
        if flow and flow['stage']!='research' and not failed and not run.trip_id:
            valid=[item for item in options(run,flow['stage']) if selectable(item,flow['stage'])]
            if not valid:
                run.status='failed'
                if not run.message.startswith('Flight search:'):run.message='Flight search: No usable flight quotes were returned. Check your dates and starting airport in the trip brief, then start a new request.' if flow['stage']=='flights' else 'No usable options were returned for this stage. Retry research or review your travel dates.'
            else:
                mode=run.brief_snapshot['brief'].get('flight_selection' if flow['stage']=='flights' else 'stay_selection','user')
                chosen=auto_option(run,flow['stage']) if mode=='masar' else None
                if chosen:advance(run,flow,chosen)
                else:
                    flow['awaiting']=True;flow['revision']+=1;put_flow(run,flow)
                    run.status='interrupted';run.message={'flights':'Choose a flight to shape the rest of your trip.','hotels':'Browse a hotel’s rooms to choose your stay.','rooms':'Choose a room quote to continue planning.'}[flow['stage']]
            run.lease_token=None;run.lease_expires_at=None;run.updated_at=now();await db.commit();return
        run.status='completed' if run.trip_id else 'failed'
        if run.trip_id:run.message='Your draft is saved. Review it before making reservations.'
        elif not run.message.startswith(('Planning needs your review:','Flight search:')):run.message='Research could not finish. Your brief is safe; you can retry.' if failed else 'Research ended without a saved trip. You can retry.'
        run.lease_token=None;run.lease_expires_at=None;run.updated_at=now()
        await db.commit()


async def agent_chunks(run_id,token):
    from domain.preferences import normalise_preferences
    from MasarAi import MasarAi
    async with AsyncSessionLocal() as db:
        run=await locked_lease(db,run_id,token)
        if not run:return
        user=await db.get(models.User,run.user_id)
        if not user:return
        draft=run.brief_snapshot;user_id=str(user.id);flow=flow_state(run)
        preferences=normalise_preferences(user.travel_preferences)
    if flow and flow['stage']=='rooms':
        from services.nutiee import HotelRoomsInput,Occupancy,nuitee_get_hotel_rooms
        details=draft['brief']
        if details['start_date']==details['end_date']:raise ValueError('A hotel stay needs at least one night.')
        yield {'status_update':'Accommodation Agent: Fetching room quotes for your selected hotel and travel dates...'}
        rates=await nuitee_get_hotel_rooms(HotelRoomsInput(hotelId=flow['selected']['hotel']['hotelId'],checkin=details['start_date'],checkout=details['end_date'],occupancies=[Occupancy(rooms=1,adults=details['travellers'])]))
        yield {'worker_result':('accommodation_result',rates)}
        return
    agent=MasarAi();agent.masar_ai_id='planning:'+run_id+':'+token
    await agent.setup(planning=True)
    if flow and flow['stage'] in {'flights','hotels'}:
        # Run only the required specialist, ending before itinerary synthesis. This
        # uses the same tools/extractors and custom-event stream as the chat graph.
        from MasarAi import TripState
        from langgraph.graph import StateGraph,START,END
        worker='flight_agent' if flow['stage']=='flights' else 'accommodation_agent'
        async def specialist(state):
            return await agent.parallel_dispatch({**state,'parallel_workers':[worker],
                'feedback_on_work':'Use search_hotels for dated hotel options when finding hotels. Do not browse rooms yet. Research '+flow['stage']+' ONLY for these exact dates and travellers. Return structured options from provider tools. Do not book or prebook. '+__import__('json').dumps(draft)})
        graph=StateGraph(TripState);graph.add_node('specialist',specialist);graph.add_edge(START,'specialist');graph.add_edge('specialist',END)
        agent.graph=graph.compile()
        async for chunk in agent.run_stream('Find '+flow['stage']+' for this trip.',user_id=user_id,user_preferences=preferences,trip_brief=draft,planning_context={'stage':flow['stage']}):
            if not chunk.get('final'):yield chunk
        return
    prompt='Build a recommendation-only UAE itinerary from the validated Trip Brief. Preserve selected place identities, priorities, and actual travel dates. Save the trip exactly once. No booking, prebooking or email.'
    async for chunk in agent.run_stream(message=prompt,user_id=user_id,user_preferences=preferences,trip_brief=draft,planning_run_id=run_id,planning_lease_token=token,planning_context=flow):
        yield chunk


async def execute_run(run_id,token,source=None):
    source=source or agent_chunks
    async def consume():
        async for chunk in source(run_id,token):
            if not await record_chunk(run_id,token,chunk):return
    async def supervise():
        while True:
            await asyncio.sleep(20)
            if not await heartbeat(run_id,token):return
    work=asyncio.create_task(consume());monitor=asyncio.create_task(supervise())
    try:
        async with asyncio.timeout(RUN_TIMEOUT_SECONDS):
            done,_=await asyncio.wait([work,monitor],return_when=asyncio.FIRST_COMPLETED)
            if monitor in done:
                await monitor # propagate a DB failure; never leave an unfenced task running
                work.cancel()
            else:
                await work
                await finish_run(run_id,token)
    except asyncio.CancelledError:
        # Graceful worker shutdown leaves a short lease. Recovery labels it interrupted.
        raise
    except Exception:
        await finish_run(run_id,token,failed=True)
    finally:
        work.cancel();monitor.cancel()
        await asyncio.gather(work,monitor,return_exceptions=True)


async def save_run_trip(db,run_id,token,user_id,trip):
    """Atomic insert + result link, fenced against cancel/retry/expired workers."""
    run=await locked_lease(db,run_id,token,user_id)
    if not run:return {'error':'This planning attempt is no longer active. No trip was saved.'}
    if run.trip_id:
        return {'status':'success','trip_id':run.trip_id,'message':'The existing draft for this run is already saved.'}
    flow=flow_state(run)
    if flow:
        if flow['stage']!='research' or flow.get('awaiting'):return {'error':'Flight and stay choices must finish before saving.'}
        selected=flow.get('selected',{});brief=run.brief_snapshot['brief']
        if brief.get('flight_requirement')=='needed' and not selected.get('flight'):return {'error':'Choose a flight first.'}
        if brief.get('stay_requirement')=='needed' and not selected.get('room'):return {'error':'Choose a room first.'}
        trip.itinerary_data={**trip.itinerary_data,'travel_choices':selected,'travel_party_size':brief['travellers'],'quoted_budget':quoted_budget(flow)}
        if selected.get('hotel'):trip.featured_hotel={**selected['hotel'],'room_name':selected['room'].get('name'),'offerId':selected['room'].get('offerId'),'price':selected['room']['price'],'currency':selected['room']['currency']}
    event=next((item.get('content',{}) for item in run.workers if isinstance(item,dict) and item.get('type')=='event_result'),{})
    if event.get('event_search'):
        data=dict(trip.itinerary_data);review=dict(data.get('planning_review',{}));warnings=list(review.get('warnings',[]))
        warnings.append({'code':'live_event_research','message':event['event_search']['message']})
        if any(item.get('kind')=='live_event' for item in event.get('events',[])) and not any(a.get('event_date') for d in data.get('days',[]) for a in d.get('activities',[])):
            warnings.append({'code':'events_not_scheduled','message':'Dated events were found but none were scheduled. Review timing and your interests before choosing one.'})
        review['warnings']=warnings;data['planning_review']=review;data['event_research']=event['event_search'];trip.itinerary_data=data
    db.add(trip);await db.flush()
    run.trip_id=trip.id;run.updated_at=now()
    await db.commit()
    return {'status':'success','trip_id':trip.id,'message':'Trip saved successfully'}
