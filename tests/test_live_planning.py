"""Offline progressive research and persisted card contracts."""
import os
os.environ['MASAR_ENV']='test'
os.environ.setdefault('DATABASE_URL','postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0')
os.environ['SECRET_KEY']='isolated-live-fixture'
os.environ['LANGSMITH_TRACING']='false'
import json,threading,unittest
from unittest.mock import Mock
from domain.research_preview import research_preview,stored_results
from services.planning_runs import claim_run,record_chunk
from tests import test_planning_runs as fixtures

class PreviewContracts(unittest.TestCase):
    def test_presentation_fields_only_and_credential_urls_rejected(self):
        value=research_preview('event_result',{'events':[{'name':'Museum','description':'Explore architecture','api_key':'secret','raw':{'token':'secret'},'imageUrl':'https://example.com/image?api_key=secret','link':'javascript:alert(1)'}]})
        self.assertEqual(value['content']['events'],[{'name':'Museum','description':'Explore architecture'}])
        self.assertNotIn('secret',json.dumps(value))
    def test_snapshots_are_bounded_and_keep_the_original_count(self):
        value=research_preview('event_result',{'events':[{'name':str(i),'description':'x'*5000} for i in range(30)]})
        self.assertEqual(len(value['content']['events']),12)
        self.assertTrue(value['content']['preview_limited'])
        names,restored=stored_results([value,'logistics_result'])
        self.assertEqual(names,['event_result','logistics_result'])
        self.assertEqual(restored[0]['content']['total_items'],30)
    def test_old_name_only_records_and_malformed_payloads_remain_safe(self):
        self.assertEqual(stored_results(['event_result','event_result','bogus']),(['event_result'],[]))
        self.assertIsNone(research_preview('event_result','not json'))
        self.assertEqual(research_preview('flight_result',{'flights':[{'airline':'A'}]})['content']['flights'][0]['slices'],[])

class ProgressiveStream(unittest.IsolatedAsyncioTestCase):
    async def test_first_cards_arrive_before_the_slow_worker_finishes(self):
        from MasarAi import MasarAi,TripState
        from langgraph.graph import StateGraph,START,END
        from langchain_core.messages import AIMessage
        from tests.test_planning_brief import draft
        agent=MasarAi();gate=threading.Event()
        agent.event_agent=Mock(return_value={'messages':[AIMessage(content='fixture')]})
        agent.event_save=Mock(return_value={'event_result':{'events':[{'name':'Museum'}]},'status_updates':['Event Agent: Places found.']})
        def slow(state):gate.wait(3);return {'messages':[AIMessage(content='fixture')]}
        agent.logistics_agent=slow
        agent.logistics_save=Mock(return_value={'logistics_result':{'routes':[]}})
        async def node(state):
            return await agent.parallel_dispatch({**state,'parallel_workers':['event_agent','logistics_agent']})
        graph=StateGraph(TripState);graph.add_node('research',node);graph.add_edge(START,'research');graph.add_edge('research',END)
        agent.graph=graph.compile()
        found=False;event_count=0
        try:
            async for chunk in agent.run_stream('Plan',user_id='1',trip_brief=draft()):
                if chunk.get('worker_result') and chunk['worker_result'][0]=='event_result':
                    event_count+=1
                    if not found:self.assertFalse(gate.is_set());found=True;gate.set()
        finally:gate.set()
        self.assertTrue(found);self.assertEqual(event_count,1)

class LiveSnapshots(unittest.IsolatedAsyncioTestCase):
    asyncSetUp=fixtures.DurableRuns.asyncSetUp
    asyncTearDown=fixtures.DurableRuns.asyncTearDown
    create=fixtures.DurableRuns.create
    get=fixtures.DurableRuns.get
    async def test_worker_cards_survive_reload_and_replace_without_duplicates(self):
        run=await self.create();identity,token=await claim_run()
        chunk={'worker_result':('event_result',{'events':[{'name':'Museum','imageUrl':'https://example.com/museum.jpg','api_key':'hidden'}]})}
        self.assertTrue(await record_chunk(identity,token,chunk))
        first=await self.get(identity)
        self.assertEqual(first['research_results'][0]['content']['events'][0]['name'],'Museum')
        self.assertNotIn('hidden',json.dumps(first))
        self.assertEqual(first['enabled_workers'],['event_agent','logistics_agent'])
        await record_chunk(identity,token,chunk)
        self.assertEqual(len((await self.get(identity))['research_results']),1)
        await self.client.post(f'/api/v1/planning/runs/{identity}/cancel')
        self.assertFalse(await record_chunk(identity,token,{'worker_result':('event_result',{'events':[{'name':'Late'}]})}))
        self.assertEqual((await self.get(identity))['research_results'][0]['content']['events'][0]['name'],'Museum')


class OpaqueOfferContracts(unittest.TestCase):
    def test_long_identifiers_are_exact_but_display_text_stays_bounded(self):
        from domain.research_preview import MAX_PROVIDER_ID_LENGTH
        from routers.planning_runs import PlanningChoice
        identity='opaque:'+('x'*8000)
        content={'rooms':[{'offerId':identity,'hotelId':'h1','description':'d'*4000,'price':123,'currency':'AED'}]}
        preview=research_preview('accommodation_result',content)
        room=stored_results([preview])[1][0]['content']['rooms'][0]
        self.assertEqual(room['offerId'],identity)
        self.assertEqual(len(room['description']),2000)
        self.assertEqual(PlanningChoice(stage='rooms',expected_revision=1,option_id=identity).option_id,identity)
        content['rooms'][0]['offerId']='x'*(MAX_PROVIDER_ID_LENGTH+1)
        self.assertEqual(research_preview('accommodation_result',content)['content']['rooms'],[])
