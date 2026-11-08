"""Offline contracts and isolated-Postgres brief tests. No external model/provider calls."""
import os
os.environ['MASAR_ENV']='test'
os.environ.setdefault('DATABASE_URL','postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0')
os.environ['SECRET_KEY']='isolated-planning-fixture'
os.environ['LANGSMITH_TRACING']='false'

import asyncio,json,unittest
from datetime import date
from unittest.mock import Mock,AsyncMock,patch
from types import SimpleNamespace
import httpx
from pydantic import ValidationError
from sqlalchemy import select,delete
from sqlalchemy.ext.asyncio import AsyncSession
from domain.planning import PlanningDraft,BriefDetails,research_policy,structured_routing,saved_trip_identity
from main import app
from database import engine,AsyncSessionLocal
import auth,models


def draft(**choices):
    return PlanningDraft(brief=BriefDetails(start_date='2027-01-01',end_date='2027-01-03',flight_requirement='not_needed',stay_requirement='not_needed',**choices)).model_dump(mode='json')


class Contracts(unittest.TestCase):
    def test_past_dates_are_saved_but_cannot_start_research(self):
        value=draft();value['brief'].update(start_date='2026-10-06',end_date='2026-10-09')
        policy=research_policy(value,today=date(2026,10,26))
        self.assertFalse(policy['ready']);self.assertEqual(policy['workers'],[])
        self.assertIn('past',policy['missing'][0]['message'])
        value['brief'].update(start_date='2026-10-26',end_date='2026-10-29')
        self.assertTrue(research_policy(value,today=date(2026,10,26))['ready'])

    def test_unknown_services_clarify_before_any_research(self):
        policy=research_policy(PlanningDraft())
        self.assertFalse(policy['ready']);self.assertEqual(policy['workers'],[])
        self.assertIn('flight_requirement',[p['field'] for p in policy['missing']])

    def test_services_are_selected_only_when_explicitly_needed(self):
        value=draft()
        self.assertEqual(research_policy(value)['workers'],['event_agent','logistics_agent'])
        value['brief']['stay_requirement']='already_arranged'
        self.assertNotIn('accommodation_agent',research_policy(value)['workers'])
        value['brief']['stay_requirement']='needed'
        self.assertIn('accommodation_agent',research_policy(value)['workers'])
        value['brief'].update(flight_requirement='needed',origin='London')
        self.assertIn('flight_agent',research_policy(value)['workers'])
        value['brief']['origin']=''
        self.assertEqual(research_policy(value)['workers'],[])

    def test_payload_rejects_foreign_metadata_duplicates_and_invalid_dates(self):
        value=draft();value['selections']=[{'id':'museum-of-the-future','priority':'must_visit','rating':5}]
        with self.assertRaises(ValidationError):PlanningDraft.model_validate(value)
        value['selections']=[{'id':'google:ChIJ_test','priority':'must_visit'}]*2
        with self.assertRaises(ValidationError):PlanningDraft.model_validate(value)
        value['selections']=[];value['brief']['end_date']='2026-12-31'
        with self.assertRaises(ValidationError):PlanningDraft.model_validate(value)
        self.assertIsNone(BriefDetails(start_date='',end_date='').start_date)

    def test_structured_routing_bypasses_model_decisions(self):
        from MasarAi import MasarAi
        agent=MasarAi();agent.orchestrator_structured=Mock()
        result=agent.orchestrator({'trip_brief':draft()})
        self.assertEqual(result['parallel_workers'],['event_agent','logistics_agent'])
        agent.orchestrator_structured.invoke.assert_not_called()
        result=structured_routing({'trip_brief':PlanningDraft().model_dump(mode='json')})
        self.assertEqual(result['next_worker'],'NEED_USER_INPUT')

    def test_only_typed_success_is_a_saved_trip(self):
        self.assertEqual(saved_trip_identity('{"status":"success","trip_id":12}'),12)
        for content in ['Saved with ID: 12','{"error":"failed","message":"ID: 12"}','{"status":"success","trip_id":true}','{"status":"success","trip_id":"12"}']:
            self.assertIsNone(saved_trip_identity(content))

    def test_failed_save_cannot_announce_trip_ready(self):
        from MasarAi import MasarAi
        from langchain_core.messages import AIMessage,ToolMessage
        result=MasarAi().trip_planner_save({'messages':[ToolMessage(content='{"error":"fixture"}',name='save_trip_to_database',tool_call_id='one'),AIMessage(content='Everything saved!')]})
        self.assertIsNone(result['saved_trip_id']);self.assertIn('could not be saved',result['trip_planner_result'])


class WorkerGuards(unittest.IsolatedAsyncioTestCase):
    async def test_planning_tools_cannot_book_or_email(self):
        from MasarAi import MasarAi
        agent=MasarAi();agent.build_graph=AsyncMock()
        with patch('MasarAi.ChatOpenAI'):
            await agent.setup(planning=True)
        names={t.name for tools in [agent.accom_tools,agent.flight_tools,agent.orchestrator_tools] for t in tools}
        self.assertTrue({'makePrebook','book_flight','confirm_booking','send_email','update_trip_in_database'}.isdisjoint(names))
        self.assertIn('search_flights',names);self.assertIn('save_trip_to_database',names)

    async def test_parallel_dispatch_filters_disallowed_workers_again(self):
        from MasarAi import MasarAi
        from langchain_core.messages import AIMessage
        agent=MasarAi()
        for name in ['event','logistics']:
            setattr(agent,name+'_agent',Mock(return_value={'messages':[AIMessage(content='fixture')]}))
            setattr(agent,name+'_save',Mock(return_value={name+'_result':{'conversational_message':'fixture'}}))
        agent.flight_agent=Mock(side_effect=AssertionError('Flight worker must not run'))
        agent.accommodation_agent=Mock(side_effect=AssertionError('Hotel worker must not run'))
        result=await agent.parallel_dispatch({'trip_brief':draft(),'parallel_workers':['event_agent','logistics_agent','flight_agent','accommodation_agent'],'messages':[],'feedback_on_work':'Research only'})
        self.assertIn('event_result',result)
        agent.flight_agent.assert_not_called();agent.accommodation_agent.assert_not_called()


class BriefOwnership(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.connection=await engine.connect();self.transaction=await self.connection.begin()
        self.db=AsyncSession(bind=self.connection,expire_on_commit=False,join_transaction_mode='create_savepoint')
        self.owner=models.User(email='planning-owner@example.com',name='Owner',hashed_password='fixture')
        self.other=models.User(email='planning-other@example.com',name='Other',hashed_password='fixture')
        self.db.add_all([self.owner,self.other]);await self.db.commit()
        async def db_override():yield self.db
        async def owner_override():return self.owner
        app.dependency_overrides[auth.get_db]=db_override;app.dependency_overrides[auth.get_current_user]=owner_override
        self.client=httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://fixture')

    async def asyncTearDown(self):
        await self.client.aclose();app.dependency_overrides.clear()
        await self.db.close();await self.transaction.rollback();await self.connection.close();await engine.dispose()

    async def save(self,revision=0,value=None):
        return await self.client.put('/api/v1/planning/brief',json={'expected_revision':revision,'draft':value or draft()})

    async def test_save_restore_revisions_and_conflict_preserve_newer_data(self):
        self.assertEqual((await self.client.get('/api/v1/planning/brief')).json()['revision'],0)
        first=(await self.save()).json()
        self.assertEqual(first['revision'],1);self.assertTrue(first['requirements']['ready'])
        self.assertIsNotNone(first['draft']['id'])
        value=first['draft'];value['brief']['origin']='Abu Dhabi'
        self.assertEqual((await self.save(1,value)).json()['revision'],2)
        self.assertEqual((await self.save(1,value)).status_code,409)
        restored=(await self.client.get('/api/v1/planning/brief')).json()
        self.assertEqual(restored['draft']['brief']['origin'],'Abu Dhabi')
        self.assertEqual(restored['revision'],2)

    async def test_other_account_cannot_use_or_read_saved_brief(self):
        first=(await self.save()).json()
        async def other_override():return self.other
        app.dependency_overrides[auth.get_current_user]=other_override
        self.assertIsNone((await self.client.get('/api/v1/planning/brief')).json()['draft'])
        with patch('MasarAi.MasarAi.setup',new_callable=AsyncMock) as setup:
            response=await self.client.post('/api/v1/chat',json={'message':'Plan my trip','thread_id':'foreign-brief','brief_id':first['draft']['id'],'brief_revision':1})
        self.assertEqual(response.status_code,404);setup.assert_not_awaited()
        other=(await self.save(value=first['draft'])).json()
        self.assertNotEqual(other['draft']['id'],first['draft']['id'])

    async def test_stale_saved_handoff_fails_before_research(self):
        first=(await self.save()).json();await self.save(1,first['draft'])
        with patch('MasarAi.MasarAi.setup',new_callable=AsyncMock) as setup:
            response=await self.client.post('/api/v1/chat',json={'message':'Plan','thread_id':'stale','brief_id':first['draft']['id'],'brief_revision':1})
        self.assertEqual(response.status_code,409);setup.assert_not_awaited()

    async def test_unknown_inline_requirements_ask_before_model_or_provider(self):
        with patch('MasarAi.MasarAi.setup',new_callable=AsyncMock) as setup,patch('requests.get',side_effect=AssertionError('No external provider')):
            response=await self.client.post('/api/v1/chat',json={'message':'Plan my trip','thread_id':'clarification','trip_brief':PlanningDraft().model_dump(mode='json')})
        self.assertEqual(response.status_code,200);self.assertIn('flight_requirement',response.text)
        self.assertIn('/plan',response.text);setup.assert_not_awaited()

    async def test_pending_schema_preserves_device_fallback(self):
        with patch('routers.planning.schema_ready',new_callable=AsyncMock,return_value=False):
            status=await self.client.get('/api/v1/planning/status')
            save=await self.save()
        self.assertFalse(status.json()['briefs_available']);self.assertEqual(save.status_code,503)

    async def test_rejects_invalid_payload_and_conflicting_chat_context(self):
        value=draft();value['selections']=[{'id':'unsupported-place','priority':'must_visit'}]
        self.assertEqual((await self.save(value=value)).status_code,422)
        response=await self.client.post('/api/v1/chat',json={'message':'Plan','brief_id':'00000000-0000-0000-0000-000000000000','brief_revision':1,'trip_brief':draft()})
        self.assertEqual(response.status_code,422)


class ConcurrentSave(unittest.IsolatedAsyncioTestCase):
    async def test_first_save_is_serialised_across_real_transactions(self):
        async with AsyncSessionLocal() as db:
            owner=models.User(email='concurrent-planning@example.com',name='Concurrent',hashed_password='fixture')
            db.add(owner);await db.commit();identity=owner.id
        async def user_override():return SimpleNamespace(id=identity)
        async def db_override():
            async with AsyncSessionLocal() as db:yield db
        app.dependency_overrides[auth.get_current_user]=user_override;app.dependency_overrides[auth.get_db]=db_override
        try:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://fixture') as client:
                responses=await asyncio.gather(*[client.put('/api/v1/planning/brief',json={'expected_revision':0,'draft':draft()}) for _ in range(2)])
                self.assertEqual(sorted(r.status_code for r in responses),[200,409])
        finally:
            app.dependency_overrides.clear()
            async with AsyncSessionLocal() as db:
                await db.execute(delete(models.User).where(models.User.id==identity));await db.commit()
            await engine.dispose()
