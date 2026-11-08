"""Real isolated PostgreSQL transactions; agents/providers are never invoked."""
import os
os.environ['MASAR_ENV']='test'
os.environ.setdefault('DATABASE_URL','postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0')
os.environ['SECRET_KEY']='isolated-run-fixture'
os.environ['LANGSMITH_TRACING']='false'
import asyncio,unittest
from datetime import timedelta
from uuid import uuid4
from types import SimpleNamespace
from unittest.mock import patch,AsyncMock
import httpx
from sqlalchemy import select,delete,func
from main import app
from database import AsyncSessionLocal,engine
import models,auth
from services.planning_runs import claim_run,execute_run,save_run_trip,heartbeat,now,expire_runs
from tests.test_planning_brief import draft


class DurableRuns(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        async with AsyncSessionLocal() as db:
            self.owner=models.User(email=f'run-{uuid4()}@example.com',name='Run fixture',hashed_password='fixture')
            self.other=models.User(email=f'other-{uuid4()}@example.com',name='Other',hashed_password='fixture')
            db.add_all([self.owner,self.other]);await db.commit()
        self.actor=self.owner
        async def current_user():return self.actor
        async def sessions():
            async with AsyncSessionLocal() as db:yield db
        app.dependency_overrides[auth.get_current_user]=current_user
        app.dependency_overrides[auth.get_db]=sessions
        self.client=httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://fixture')
        saved=await self.client.put('/api/v1/planning/brief',json={'expected_revision':0,'draft':draft()})
        self.assertEqual(saved.status_code,200)
        self.brief=saved.json()
        self.body={'brief_id':self.brief['draft']['id'],'brief_revision':1,'request_id':str(uuid4())}

    async def asyncTearDown(self):
        await self.client.aclose();app.dependency_overrides.clear()
        async with AsyncSessionLocal() as db:
            await db.execute(delete(models.PlanningRun).where(models.PlanningRun.user_id.in_([self.owner.id,self.other.id])))
            await db.execute(delete(models.Trip).where(models.Trip.user_id.in_([self.owner.id,self.other.id])))
            await db.execute(delete(models.User).where(models.User.id.in_([self.owner.id,self.other.id])))
            await db.commit()
        await engine.dispose()

    async def create(self):
        response=await self.client.post('/api/v1/planning/runs',json=self.body)
        self.assertEqual(response.status_code,201,response.text)
        return response.json()

    async def get(self,identity):
        return (await self.client.get('/api/v1/planning/runs/'+identity)).json()

    async def test_creation_is_idempotent_across_concurrent_requests(self):
        with patch('MasarAi.MasarAi.setup',new_callable=AsyncMock) as setup:
            responses=await asyncio.gather(*[self.client.post('/api/v1/planning/runs',json=self.body) for _ in range(2)])
        self.assertEqual(sorted(r.status_code for r in responses),[200,201])
        self.assertEqual(responses[0].json()['id'],responses[1].json()['id']);setup.assert_not_awaited()
        self.body['brief_revision']=2
        self.assertEqual((await self.client.post('/api/v1/planning/runs',json=self.body)).status_code,409)

    async def test_owner_isolation_for_read_cancel_retry_and_brief(self):
        run=await self.create();self.actor=self.other
        for method,path in [('get',''),('post','/cancel'),('post','/retry')]:
            response=await getattr(self.client,method)('/api/v1/planning/runs/'+run['id']+path)
            self.assertEqual(response.status_code,404)
        self.assertEqual((await self.client.get('/api/v1/planning/runs')).json(),[])
        self.assertEqual((await self.client.post('/api/v1/planning/runs',json=self.body)).status_code,404)

    async def test_missing_requirements_stale_brief_and_unavailable_schema(self):
        self.body['brief_revision']=2
        self.assertEqual((await self.client.post('/api/v1/planning/runs',json=self.body)).status_code,409)
        self.body['brief_revision']=1
        with patch('routers.planning_runs.runs_ready',new_callable=AsyncMock,return_value=False):
            self.assertEqual((await self.client.post('/api/v1/planning/runs',json=self.body)).status_code,503)
        value=self.brief['draft'];value['brief']['flight_requirement']='unknown'
        await self.client.put('/api/v1/planning/brief',json={'expected_revision':1,'draft':value})
        self.body['brief_revision']=2
        self.assertEqual((await self.client.post('/api/v1/planning/runs',json=self.body)).status_code,422)

    async def test_refresh_and_brief_edits_keep_immutable_run_snapshot(self):
        run=await self.create()
        value=self.brief['draft'];value['brief']['origin']='Changed later'
        await self.client.put('/api/v1/planning/brief',json={'expected_revision':1,'draft':value})
        async with AsyncSessionLocal() as db:
            record=await db.get(models.PlanningRun,run['id'])
            self.assertEqual(record.brief_snapshot['brief']['origin'],'')
        self.assertEqual((await self.get(run['id']))['status'],'queued')
        self.assertEqual((await self.client.get('/api/v1/planning/runs')).json()[0]['id'],run['id'])

    async def test_only_one_worker_can_claim_and_admission_blocks_second_run(self):
        run=await self.create();self.body['request_id']=str(uuid4())
        self.assertEqual((await self.client.post('/api/v1/planning/runs',json=self.body)).status_code,409)
        claims=await asyncio.gather(claim_run(),claim_run())
        active=[c for c in claims if c]
        self.assertEqual(len(active),1);self.assertEqual(active[0][0],run['id'])
        self.assertTrue(await heartbeat(*active[0]))

    async def test_cancel_fences_late_worker_and_retains_brief(self):
        run=await self.create();identity,token=await claim_run()
        response=await self.client.post(f'/api/v1/planning/runs/{identity}/cancel')
        self.assertEqual(response.json()['status'],'cancelled')
        self.assertFalse(await heartbeat(identity,token))
        async with AsyncSessionLocal() as db:
            result=await save_run_trip(db,identity,token,self.owner.id,models.Trip(user_id=self.owner.id,title='Late',itinerary_data={'days':[]}))
            self.assertIn('error',result)
        self.assertEqual((await self.client.get('/api/v1/planning/brief')).json()['revision'],1)

    async def test_expired_attempt_is_interrupted_and_old_token_cannot_save(self):
        run=await self.create();identity,token=await claim_run()
        async with AsyncSessionLocal() as db:
            record=await db.get(models.PlanningRun,identity);record.lease_expires_at=now()-timedelta(seconds=1);await db.commit()
        self.assertEqual((await self.get(identity))['status'],'interrupted')
        retry=await self.client.post(f'/api/v1/planning/runs/{identity}/retry')
        self.assertEqual(retry.json()['status'],'queued')
        new_id,new_token=await claim_run();self.assertEqual(new_id,identity);self.assertNotEqual(new_token,token)
        async with AsyncSessionLocal() as db:
            result=await save_run_trip(db,identity,token,self.owner.id,models.Trip(user_id=self.owner.id,title='Stale',itinerary_data={'days':[]}))
            self.assertIn('error',result)

    async def test_save_tool_repeated_calls_and_recovery_create_one_trip(self):
        from masarAiTools import save_trip_to_database,TripItineraryDay
        run=await self.create();identity,token=await claim_run()
        config={'configurable':{'user_id':str(self.owner.id),'trip_brief':self.brief['draft'],'planning_run_id':identity,'planning_lease_token':token}}
        args=dict(title='Fixture trip',destination='Dubai',duration_days=3,budget_tier='Standard',vibes=[],itinerary_days=[TripItineraryDay(day_number=day,theme='Culture',activities=[{'title':'Visit Al Fahidi','place_id':'al-fahidi','time':'10:00'}]) for day in range(1,4)],config=config)
        first=await save_trip_to_database.coroutine(**args)
        second=await save_trip_to_database.coroutine(**args)
        self.assertEqual(first['status'],'success');self.assertEqual(first['trip_id'],second['trip_id'])
        async with AsyncSessionLocal() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(models.Trip).where(models.Trip.user_id==self.owner.id)),1)
            record=await db.get(models.PlanningRun,identity);record.lease_expires_at=now()-timedelta(seconds=1);await db.commit()
        recovered=await self.get(identity)
        self.assertEqual(recovered['status'],'completed');self.assertEqual(recovered['trip_id'],first['trip_id'])
        # A lost HTTP response may be retried even after the brief revision changed.
        value=self.brief['draft'];value['brief']['origin']='Later'
        await self.client.put('/api/v1/planning/brief',json={'expected_revision':1,'draft':value})
        replay=await self.client.post('/api/v1/planning/runs',json=self.body)
        self.assertEqual(replay.status_code,200);self.assertEqual(replay.json()['trip_id'],first['trip_id'])

    async def test_worker_cannot_claim_model_success_without_a_saved_trip(self):
        run=await self.create();claim=await claim_run()
        async def fake(*_):yield {'final':True,'saved_trip_id':987654,'response':'Saved!'}
        await execute_run(*claim,source=fake)
        state=await self.get(run['id'])
        self.assertEqual(state['status'],'failed');self.assertIsNone(state['trip_id']);self.assertNotIn('987654',str(state))

    async def test_worker_success_persists_progress_and_result(self):
        run=await self.create();claim=await claim_run()
        async def fake(identity,token):
            yield {'status_update':'Finding culture stops'}
            yield {'worker_result':('event_result',{'events':[]})}
            async with AsyncSessionLocal() as db:
                saved=await save_run_trip(db,identity,token,self.owner.id,models.Trip(user_id=self.owner.id,title='Success',itinerary_data={'days':[]}))
            yield {'final':True,'saved_trip_id':saved['trip_id'],'response':'Your draft is ready.'}
        await execute_run(*claim,source=fake)
        state=await self.get(run['id'])
        self.assertEqual(state['status'],'completed');self.assertIn('event_result',state['workers']);self.assertIn('Finding culture stops',state['progress']);self.assertIsNotNone(state['trip_id'])

    async def test_retries_are_bounded_and_errors_do_not_expose_provider_details(self):
        run=await self.create()
        async def fake(*_):
            raise RuntimeError('secret-provider-token')
            yield
        for attempt in range(3):
            await execute_run(*(await claim_run()),source=fake)
            state=await self.get(run['id']);self.assertEqual(state['attempts'],attempt+1)
            self.assertNotIn('secret-provider-token',str(state))
            response=await self.client.post(f"/api/v1/planning/runs/{run['id']}/retry")
            self.assertEqual(response.status_code,200 if attempt<2 else 409)
        self.assertFalse((await self.get(run['id']))['can_retry'])

    async def test_timeout_and_worker_shutdown_preserve_recoverable_state(self):
        run=await self.create();claim=await claim_run()
        async def slow(*_):
            await asyncio.sleep(10)
            yield {'status_update':'Never'}
        with patch('services.planning_runs.RUN_TIMEOUT_SECONDS',0.03):
            await execute_run(*claim,source=slow)
        self.assertEqual((await self.get(run['id']))['status'],'failed')
        await self.client.post(f"/api/v1/planning/runs/{run['id']}/retry")
        claim=await claim_run();task=asyncio.create_task(execute_run(*claim,source=slow))
        await asyncio.sleep(.03);task.cancel()
        with self.assertRaises(asyncio.CancelledError):await task
        async with AsyncSessionLocal() as db:
            record=await db.get(models.PlanningRun,run['id']);record.lease_expires_at=now()-timedelta(seconds=1);await db.commit()
        self.assertEqual((await self.get(run['id']))['status'],'interrupted')
