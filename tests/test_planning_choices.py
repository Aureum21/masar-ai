"""Isolated database workflow tests; provider/LLM calls are fixture-only."""
import os
os.environ['MASAR_ENV']='test'
os.environ.setdefault('DATABASE_URL','postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0')
os.environ['LANGSMITH_TRACING']='false'
os.environ['SECRET_KEY']='choice-fixture'
import asyncio,unittest
from uuid import uuid4
from types import SimpleNamespace
from unittest.mock import patch,AsyncMock,Mock
from sqlalchemy import select
from database import AsyncSessionLocal
import models
from domain.planning_choices import initial_flow,put_flow,flow_state,auto_option,quoted_budget,quote
from domain.research_preview import research_preview,stored_results
from domain.itinerary_validation import validate_proposal,PlanConflict
from domain.planning import structured_routing
from services.planning_runs import claim_run,execute_run,save_run_trip,record_chunk
from tests.test_planning_runs import DurableRuns
from tests.test_planning_brief import draft
from tests.test_itinerary_validation import proposal

FLIGHTS={'flights':[{'offer_id':'f1','airline':'Fixture Air','total_amount':'1500.55','currency':'AED','slices':[]}, {'offer_id':'f2','airline':'Fixture Air','total_amount':'1800','currency':'AED','slices':[]}]}
HOTELS={'hotels':[{'hotelId':'h1','name':'Fixture hotel','price':800,'currency':'AED'},{'hotelId':'h2','name':'Other hotel','price':950,'currency':'AED'}]}
ROOMS={'rooms':[{'offerId':'r1','hotelId':'h1','name':'Deluxe room','price':'850.25','currency':'AED','images':['https://example.com/room.jpg']}]}

class ChoiceContracts(unittest.TestCase):
    def test_room_snapshots_preserve_offer_currency_and_gallery_without_secrets(self):
        preview=research_preview('accommodation_result',{**ROOMS,'token':'secret'})
        restored=stored_results([preview])[1][0]
        self.assertEqual(restored['content']['rooms'][0]['offerId'],'r1')
        self.assertEqual(restored['content']['rooms'][0]['images'],ROOMS['rooms'][0]['images'])
        self.assertNotIn('token',str(restored))
    def test_quote_totals_use_exact_decimal_and_never_mix_currencies_or_add_daily_estimates(self):
        budget=quoted_budget({'selected':{'flight':FLIGHTS['flights'][0],'room':ROOMS['rooms'][0]}})
        self.assertEqual(budget['currency_totals'],[{'currency':'AED','amount':'2350.80'}])
        room={**ROOMS['rooms'][0],'currency':'USD'}
        budget=quoted_budget({'selected':{'flight':FLIGHTS['flights'][0],'room':room}})
        self.assertEqual(len(budget['currency_totals']),2)
        self.assertEqual(budget['booking_status'],'not_booked')
        self.assertEqual(quoted_budget({'selected':{}})['currency_totals'],[])
    def test_automatic_comparison_rejects_missing_quotes_and_cross_currency_comparison(self):
        run=SimpleNamespace(workers=[{'type':'flight_result','content':{'flights':[{'offer_id':'bad','total_amount':True,'currency':'AED'},{'offer_id':'usd','total_amount':1,'currency':'USD'},*FLIGHTS['flights']]}}])
        self.assertEqual(auto_option(run,'flights')['offer_id'],'f1')
        for amount in [None,'NaN','Infinity',True,-1,0]:self.assertIsNone(quote({'total_amount':amount,'currency':'AED'},'flights'))
    def test_final_research_does_not_search_chosen_financial_services_again(self):
        value=draft();value['brief'].update(flight_requirement='needed',stay_requirement='needed',origin='LHR')
        decision=structured_routing({'trip_brief':value,'planning_context':{'stage':'research'}})
        self.assertEqual(decision['parallel_workers'],['event_agent','logistics_agent'])
    def test_recommended_stop_ids_do_not_pretend_to_be_shortlist_selections(self):
        raw=proposal();raw['days'][0]['activities'][0].update(selection_id='museum-of-the-future',place_id='museum-of-the-future')
        checked=validate_proposal(raw,draft(),3)
        self.assertNotIn('selection_id',checked['days'][0]['activities'][0])
        raw['days'][0]['activities'][0].update(selection_id='wrong-unrelated-id')
        with self.assertRaises(PlanConflict):validate_proposal(raw,draft(),3)
    def test_alias_repair_preserves_exact_selected_product_and_required_stops(self):
        value=draft();value['selections']=[{'id':'sheikh-zayed-mosque','priority':'must_visit'}]
        raw=proposal();raw['days'][0]['activities'][0].update(selection_id='grand-mosque',place_id='sheikh-zayed-grand-mosque')
        self.assertEqual(validate_proposal(raw,value,3)['days'][0]['activities'][0]['selection_id'],'sheikh-zayed-mosque')
        value['selections']=[{'id':'burj-khalifa-sky','priority':'must_visit'}]
        raw['days'][0]['activities'][0].update(selection_id='burj-khalifa',place_id='burj-khalifa')
        with self.assertRaises(PlanConflict):validate_proposal(raw,value,3)

class ChoiceWorkflow(unittest.IsolatedAsyncioTestCase):
    asyncSetUp=DurableRuns.asyncSetUp
    asyncTearDown=DurableRuns.asyncTearDown
    create=DurableRuns.create
    get=DurableRuns.get
    async def start(self,auto=False,flight=True,stay=True):
        value=self.brief['draft'];value['brief'].update(origin='LHR',flight_requirement='needed' if flight else 'not_needed',stay_requirement='needed' if stay else 'not_needed',flight_selection='masar' if auto else 'user',stay_selection='masar' if auto else 'user')
        response=await self.client.put('/api/v1/planning/brief',json={'expected_revision':1,'draft':value})
        self.assertEqual(response.status_code,200,response.text);self.body['brief_revision']=2
        return await self.create()
    async def publish(self,kind,content):
        identity,token=await claim_run()
        async def fixture(*args):yield {'worker_result':(kind,content)}
        await execute_run(identity,token,fixture)
        return await self.get(identity)
    async def choose(self,run,identity=None,**extra):
        flow=run['choice_flow']
        return await self.client.post('/api/v1/planning/runs/'+run['id']+'/choice',json={'stage':flow['stage'],'expected_revision':flow['revision'],'option_id':identity,**extra})
    async def test_empty_flight_response_fails_with_flight_specific_guidance(self):
        await self.start()
        run=await self.publish('flight_result',{'flights':[]})
        self.assertEqual(run['status'],'failed');self.assertIn('Flight search:',run['message'])
        self.assertIn('starting airport',run['message'])

    async def test_flight_provider_error_survives_saved_failure(self):
        await self.start()
        run=await self.publish('flight_result',{'flights':[],'error':'Flight dates are in the past.'})
        self.assertEqual(run['message'],'Flight search: Flight dates are in the past.')

    async def test_past_dates_block_creation_and_retry_before_provider_calls(self):
        value=self.brief['draft'];value['brief'].update(start_date='2000-01-01',end_date='2000-01-03')
        saved=await self.client.put('/api/v1/planning/brief',json={'expected_revision':1,'draft':value})
        self.assertEqual(saved.status_code,200);self.body['brief_revision']=2
        response=await self.client.post('/api/v1/planning/runs',json=self.body)
        self.assertEqual(response.status_code,422);self.assertIn('past',response.json()['detail'])
        # Existing failed snapshots can age out even when they were valid at creation.
        value['brief'].update(start_date='2027-01-01',end_date='2027-01-03')
        await self.client.put('/api/v1/planning/brief',json={'expected_revision':2,'draft':value})
        self.body['brief_revision']=3;run=await self.create()
        async with AsyncSessionLocal() as db:
            record=await db.get(models.PlanningRun,run['id'])
            record.status='failed';record.brief_snapshot={**record.brief_snapshot,'brief':{**record.brief_snapshot['brief'],'start_date':'2000-01-01','end_date':'2000-01-03'}}
            await db.commit()
        response=await self.client.post('/api/v1/planning/runs/'+run['id']+'/retry')
        self.assertEqual(response.status_code,422);self.assertIn('original saved dates',response.json()['detail'])

    async def test_manual_flight_hotel_room_resume_and_atomic_quoted_trip_save(self):
        run=await self.start();self.assertEqual(run['choice_flow']['stage'],'flights')
        self.assertEqual((await self.choose(run,'f1')).status_code,409)
        run=await self.publish('flight_result',FLIGHTS)
        self.assertEqual(run['status'],'awaiting_choice');self.assertIsNone(await claim_run())
        self.assertEqual((await self.get(run['id']))['research_results'][0]['content']['flights'][0]['offer_id'],'f1')
        self.assertEqual((await self.choose(run,'forged')).status_code,422)
        self.actor=self.other;self.assertEqual((await self.choose(run,'f1')).status_code,404);self.actor=self.owner
        self.body['request_id']=str(uuid4());self.assertEqual((await self.client.post('/api/v1/planning/runs',json=self.body)).status_code,409)
        chosen=await self.choose(run,'f1');self.assertEqual(chosen.status_code,200,chosen.text)
        self.assertEqual((await self.choose(run,'f2')).status_code,409)
        run=await self.publish('accommodation_result',HOTELS);self.assertEqual(run['choice_flow']['stage'],'hotels')
        self.assertEqual((await self.choose(run,'h1')).status_code,200)
        identity,token=await claim_run()
        with patch('services.nutiee.nuitee_get_hotel_rooms',new_callable=AsyncMock,return_value=ROOMS) as rates:
            await execute_run(identity,token)
        args=rates.await_args.args[0]
        self.assertEqual((args.hotelId,args.checkin,args.checkout),('h1','2027-01-01','2027-01-03'))
        run=await self.get(identity);self.assertEqual(run['status'],'awaiting_choice')
        self.assertEqual(run['choice_flow']['selected']['flight']['offer_id'],'f1')
        self.assertEqual((await self.choose(run,'r1',price='0')).status_code,422)
        self.assertEqual((await self.choose(run,'r1')).status_code,200)
        identity,token=await claim_run()
        async with AsyncSessionLocal() as db:
            record=await db.get(models.PlanningRun,identity)
            self.assertEqual(record.attempts,1,'normal choice stages must not consume retries')
            trip=models.Trip(user_id=self.owner.id,title='Fixture final',itinerary_data={'days':[],'quoted_budget':{'fake':True}})
            saved=await save_run_trip(db,identity,token,self.owner.id,trip)
            self.assertEqual(saved['status'],'success')
            self.assertEqual(trip.itinerary_data['quoted_budget']['currency_totals'],[{'currency':'AED','amount':'2350.80'}])
            self.assertEqual(trip.featured_hotel['offerId'],'r1')
        async def final(*args):yield {'final':True,'response':'Saved'}
        await execute_run(identity,token,final)
        self.assertEqual((await self.get(identity))['status'],'completed')
    async def test_auto_flow_advances_all_financial_stages_without_user_waits(self):
        await self.start(auto=True)
        for kind,content,next_stage in [('flight_result',FLIGHTS,'hotels'),('accommodation_result',HOTELS,'rooms'),('accommodation_result',ROOMS,'research')]:
            run=await self.publish(kind,content)
            self.assertEqual(run['status'],'queued');self.assertEqual(run['choice_flow']['stage'],next_stage)
        self.assertEqual(run['choice_flow']['selected']['flight']['offer_id'],'f1')
        self.assertEqual(run['choice_flow']['selected']['room']['offerId'],'r1')
    async def test_change_hotel_returns_to_persisted_list_without_another_provider_call(self):
        await self.start(flight=False)
        run=await self.publish('accommodation_result',HOTELS);await self.choose(run,'h1')
        run=await self.publish('accommodation_result',ROOMS)
        response=await self.client.post('/api/v1/planning/runs/'+run['id']+'/change-hotel',json={'expected_revision':run['choice_flow']['revision']})
        self.assertEqual(response.status_code,200,response.text)
        run=response.json();self.assertEqual(run['choice_flow']['stage'],'hotels')
        self.assertEqual(len(run['research_results'][0]['content']['hotels']),2)
        self.assertEqual((await self.choose(run,'h2')).status_code,200)
    async def test_cancellation_fences_waiting_choices_and_retry_cannot_skip_selection(self):
        await self.start(stay=False);run=await self.publish('flight_result',FLIGHTS)
        self.assertEqual((await self.client.post('/api/v1/planning/runs/'+run['id']+'/retry')).status_code,409)
        self.assertTrue(run['can_cancel']);self.assertFalse(run['can_retry'])
        response=await self.client.post('/api/v1/planning/runs/'+run['id']+'/cancel')
        self.assertEqual(response.json()['status'],'cancelled');self.assertEqual((await self.choose(run,'f1')).status_code,409)
    async def test_empty_results_never_advance_or_reuse_old_quotes(self):
        await self.start(stay=False)
        run=await self.publish('flight_result',{'flights':[]})
        self.assertEqual(run['status'],'failed');self.assertEqual(run['choice_flow']['selected'],{})
        self.assertTrue(run['can_retry'])

    async def test_specialist_stage_streams_real_cards_and_never_calls_trip_synthesis(self):
        from services.planning_runs import agent_chunks
        from langchain_core.messages import AIMessage
        from MasarAi import MasarAi
        await self.start(stay=False);identity,token=await claim_run()
        flight=Mock(return_value={'messages':[AIMessage(content='Fixture flights')]})
        planner=Mock(side_effect=AssertionError('Synthesis must wait for the selection'))
        async def setup(agent,planning=False):
            self.assertTrue(planning);agent.flight_agent=flight
            agent.flight_save=Mock(return_value={'flight_result':FLIGHTS})
            agent.trip_planner_agent=planner
        with patch.object(MasarAi,'setup',setup):
            await execute_run(identity,token)
        run=await self.get(identity)
        self.assertEqual(run['status'],'awaiting_choice');self.assertEqual([{k:v for k,v in f.items() if k!='choice_id'} for f in run['research_results'][0]['content']['flights']],FLIGHTS['flights'])
        flight.assert_called_once();planner.assert_not_called()
    async def test_no_trip_can_save_before_financial_choices_finish(self):
        run=await self.start();identity,token=await claim_run()
        async with AsyncSessionLocal() as db:
            result=await save_run_trip(db,identity,token,self.owner.id,models.Trip(user_id=self.owner.id,title='Too early',itinerary_data={'days':[]}))
            self.assertIn('error',result)
        self.assertIsNone((await self.get(identity))['trip_id'])


class LongOfferSelection(unittest.IsolatedAsyncioTestCase):
    asyncSetUp=ChoiceWorkflow.asyncSetUp
    asyncTearDown=ChoiceWorkflow.asyncTearDown
    create=ChoiceWorkflow.create
    get=ChoiceWorkflow.get
    start=ChoiceWorkflow.start
    publish=ChoiceWorkflow.publish
    choose=ChoiceWorkflow.choose
    async def test_long_room_id_roundtrips_and_is_selected_by_short_reference(self):
        await self.start(flight=False)
        run=await self.publish('accommodation_result',HOTELS);await self.choose(run,'h1')
        opaque='provider-offer-'+('AbCd1234'*1024)
        rooms={'rooms':[{**ROOMS['rooms'][0],'offerId':opaque}]}
        run=await self.publish('accommodation_result',rooms)
        card=run['research_results'][0]['content']['rooms'][0]
        self.assertEqual(card['offerId'],opaque)
        self.assertLess(len(card['choice_id']),100)
        self.assertEqual((await self.choose(run,'choice:forged')).status_code,422)
        response=await self.choose(run,card['choice_id'])
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(response.json()['choice_flow']['stage'],'research')
        self.assertEqual(response.json()['choice_flow']['selected']['room']['offerId'],opaque)


class SpecialistChain(unittest.IsolatedAsyncioTestCase):
    async def test_hotel_stage_can_finish_discovery_then_rates_before_pausing(self):
        import json
        from MasarAi import MasarAi
        from langchain_core.messages import AIMessage,HumanMessage,ToolMessage
        agent=MasarAi();value=draft();value['brief']['stay_requirement']='needed'
        agent.accom_tools=[]
        agent.accommodation_agent=Mock(side_effect=[
            {'messages':[AIMessage(content='',tool_calls=[{'id':'discover','name':'search_google_places','args':{}}])]},
            {'messages':[AIMessage(content='',tool_calls=[{'id':'rates','name':'search_hotels','args':{}}])]},
            {'messages':[AIMessage(content='Dated hotels found')]},
        ])
        agent.accommodation_save=Mock(return_value={'accommodation_result':HOTELS})
        node=Mock();node.ainvoke=AsyncMock(side_effect=[
            {'messages':[ToolMessage(content=json.dumps({'places':[]}),tool_call_id='discover')]},
            {'messages':[ToolMessage(content=json.dumps(HOTELS),tool_call_id='rates')]},
        ])
        with patch('MasarAi.ToolNode',return_value=node):
            result=await agent.parallel_dispatch({'messages':[HumanMessage(content='Find a stay')],'trip_brief':value,'planning_context':{'stage':'hotels'},'parallel_workers':['accommodation_agent']})
        self.assertEqual(node.ainvoke.await_count,2)
        self.assertEqual(result['accommodation_result'],HOTELS)

    async def test_hotel_choice_options_come_from_tool_data_not_ai_written_json(self):
        import json
        from MasarAi import MasarAi
        from langchain_core.messages import AIMessage,HumanMessage,ToolMessage
        agent=MasarAi();fake=AIMessage(content=json.dumps(HOTELS))
        state={'messages':[HumanMessage(content='Find hotels'),fake],'planning_context':{'stage':'hotels'}}
        self.assertEqual(agent.accommodation_save(state)['accommodation_result']['hotels'],[])
        state['messages']=[state['messages'][0],ToolMessage(content=json.dumps(HOTELS),name='search_hotels',tool_call_id='rates'),AIMessage(content='Here are the options')]
        self.assertEqual(agent.accommodation_save(state)['accommodation_result']['hotels'],HOTELS['hotels'])
