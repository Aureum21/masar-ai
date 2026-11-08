"""Offline proposal validation: no provider or model calls."""
import os
os.environ['MASAR_ENV']='test'
os.environ.setdefault('DATABASE_URL','postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0')
os.environ['SECRET_KEY']='isolated-validation-fixture'
os.environ['LANGSMITH_TRACING']='false'
import json,unittest
from unittest.mock import Mock,AsyncMock,patch
from langchain_core.messages import AIMessage,ToolMessage
from domain.itinerary_validation import validate_proposal,PlanConflict,catalogue,research_instructions
from tests.test_planning_brief import draft

def proposal():
    return {'days':[{'day_number':day,'theme':'Explore','activities':[{'title':'Explore Dubai','start_time':'10:00','end_time':'11:00','cost':0}]} for day in range(1,4)]}

class ProposalChecks(unittest.TestCase):
    def codes(self,raw,value=None,duration=3,omissions=None):
        with self.assertRaises(PlanConflict) as error:validate_proposal(raw,value or draft(),duration,omissions)
        return {item['code'] for item in error.exception.issues}
    def test_exact_days_and_dates_required(self):
        raw=proposal();raw['days'][0]['date']='2027-02-01'
        self.assertIn('day_date',self.codes(raw))
        raw=proposal();raw['days'].pop()
        self.assertIn('day_coverage',self.codes(raw))
        raw=proposal();raw['days'][1]['day_number']=1
        self.assertIn('day_order',self.codes(raw))
        self.assertIn('day_coverage',self.codes(proposal(),duration=2))
    def test_required_stop_cannot_silently_disappear(self):
        value=draft();value['selections']=[{'id':'museum-of-the-future','priority':'must_visit'}]
        self.assertIn('missing_required',self.codes(proposal(),value))
        raw=proposal();raw['days'][0]['activities'][0].update(selection_id='museum-of-the-future')
        result=validate_proposal(raw,value,3)
        self.assertEqual(result['days'][0]['activities'][0]['place_id'],'museum-of-the-future')
        self.assertTrue(result['planning_review']['required_stops_checked'])
        self.assertNotIn('place_id',raw['days'][0]['activities'][0])
    def test_ticketed_product_is_not_replaced_by_the_general_landmark(self):
        value=draft();value['selections']=[{'id':'burj-khalifa-sky','priority':'must_visit'}]
        raw=proposal();raw['days'][0]['activities'][0]['place_id']='burj-khalifa'
        self.assertIn('missing_required',self.codes(raw,value))
        raw['days'][0]['activities'][0]['selection_id']='burj-khalifa-sky'
        self.assertEqual(validate_proposal(raw,value,3)['days'][0]['activities'][0]['product_id'],'burj-khalifa-sky')
    def test_identity_conflicts_and_bad_identifier_shapes_are_rejected(self):
        value=draft();value['selections']=[{'id':'museum-of-the-future','priority':'must_visit'}]
        raw=proposal();raw['days'][0]['activities'][0].update(selection_id='museum-of-the-future',place_id='burj-khalifa')
        self.assertIn('selection_identity',self.codes(raw,value))
        raw['days'][0]['activities'][0]['selection_id']=['museum-of-the-future']
        self.assertIn('selection_identity',self.codes(raw,value))
    def test_optional_omission_needs_a_reason_and_is_recorded(self):
        value=draft();value['selections']=[{'id':'louvre-abu-dhabi','priority':'optional'}]
        self.assertIn('omission_reason',self.codes(proposal(),value))
        reason=[{'selection_id':'louvre-abu-dhabi','reason':'Keep this Dubai trip relaxed; Abu Dhabi would add another intercity journey.'}]
        result=validate_proposal(proposal(),value,3,reason)
        self.assertEqual(result['planning_review']['omitted_optional'][0]['reason'],reason[0]['reason'])
        self.assertEqual(result['planning_review']['omitted_optional'][0]['name'],'Louvre Abu Dhabi')
    def test_overlap_and_insufficient_declared_travel_gap_fail(self):
        raw=proposal();raw['days'][0]['activities'].append({'title':'Next stop','start_time':'11:10','end_time':'12:00','travel_minutes_from_previous':30})
        self.assertIn('overlap',self.codes(raw))
        raw['days'][0]['activities'][1]['start_time']='10:30'
        self.assertIn('overlap',self.codes(raw))
    def test_invalid_time_cost_duration_and_event_day_fail(self):
        for changes,code in [({'start_time':'25:00'},'time_format'),({'duration_minutes':-5},'duration'),({'duration_minutes':30},'duration'),({'cost':-1},'cost'),({'event_date':'2027-01-03'},'event_date')]:
            raw=proposal();raw['days'][0]['activities'][0].update(changes)
            self.assertIn(code,self.codes(raw))
    def test_unknown_timings_and_availability_are_honestly_flagged(self):
        raw=proposal();raw['days'][0]['activities']=[{'title':'Explore the neighbourhood','time':'Afternoon'}]
        codes={p['code'] for p in validate_proposal(raw,draft(),3)['planning_review']['warnings']}
        self.assertTrue({'timing_unverified','availability_unverified','route_estimates'}<=codes)
    def test_closed_challenge_catalogue_ignores_model_verified_claim(self):
        for key in ['boxing','bowling','sunset-seeker','invented-challenge']:
            raw=proposal();raw['days'][0]['activities'][0].update(place_id='burj-khalifa',challenge={'key':key,'venue':{'verified':True,'kind':'mall','facilities':['bowling','punching-machine']}})
            self.assertIn('unsupported_challenge',self.codes(raw))
    def test_supported_heritage_is_canonical_and_never_awards_points(self):
        raw=proposal();raw['days'][0]['activities'][0].update(place_id='sheikh-zayed-mosque',challenge={'key':'heritage-detective','reward_points':100},points_awarded=100)
        item=validate_proposal(raw,draft(),3)['days'][0]['activities'][0]
        self.assertEqual(item['challenge']['place_id'],'sheikh-zayed-grand-mosque');self.assertEqual(item['challenge']['reward_status'],'not_awarded');self.assertNotIn('points_awarded',item)
        raw['days'][0]['activities'].append({'title':'Another capture','place_id':'museum-of-the-future','challenge':'heritage-detective'})
        self.assertIn('daily_challenge_limit',self.codes(raw))
        value=draft();value['brief']['challenges_enabled']=False
        self.assertIn('challenge_disabled',self.codes(raw,value))
    def test_full_research_and_catalogue_preserve_late_selected_data(self):
        state={'event_result':{'events':[{'name':'x'*2500},{'name':'Important last must-visit','id':'google:tail'}]}}
        self.assertIn('google:tail',research_instructions(state))
        entries=catalogue(['burj-khalifa-sky'])['places']
        self.assertEqual(entries[0]['product_id'],'burj-khalifa-sky')
        self.assertEqual(catalogue(['louvre-abu-dhabi'])['places'][0]['challenge_keys'],[])
    def test_planner_stops_after_two_repairs_without_another_model_call(self):
        from MasarAi import MasarAi
        agent=MasarAi();agent.trip_planner_llm=Mock()
        error=json.dumps({'status':'validation_error','issues':[{'code':'missing_required','message':'Include the required museum.','field':'selections'}]})
        messages=[ToolMessage(name='save_trip_to_database',content=error,tool_call_id=str(i)) for i in range(3)]
        result=agent.trip_planner_agent({'trip_brief':draft(),'messages':messages})
        agent.trip_planner_llm.invoke.assert_not_called()
        self.assertIn('Planning needs your review:',result['status_updates'][0])
        self.assertIsNone(agent.trip_planner_save({'messages':messages+[AIMessage(content='Done!') ]})['saved_trip_id'])

class SaveBoundary(unittest.IsolatedAsyncioTestCase):
    async def test_invalid_new_plan_is_rejected_before_any_database_write(self):
        from masarAiTools import save_trip_to_database,TripItineraryDay
        value=draft();value['selections']=[{'id':'museum-of-the-future','priority':'must_visit'}]
        with patch('masarAiTools.AsyncSessionLocal') as sessions:
            result=await save_trip_to_database.coroutine(title='Invalid',destination='Dubai',duration_days=3,budget_tier='Standard',vibes=[],itinerary_days=[TripItineraryDay(**day) for day in proposal()['days']],config={'configurable':{'user_id':'1','trip_brief':value}})
        self.assertEqual(result['status'],'validation_error');sessions.assert_not_called()
    async def test_legacy_unstructured_chat_save_retains_its_existing_path(self):
        from masarAiTools import save_trip_to_database,TripItineraryDay
        db=AsyncMock();db.add=Mock();sessions=Mock();sessions.return_value.__aenter__=AsyncMock(return_value=db);sessions.return_value.__aexit__=AsyncMock(return_value=False)
        with patch('masarAiTools.AsyncSessionLocal',sessions):
            await save_trip_to_database.coroutine(title='Legacy',destination='Dubai',duration_days=1,budget_tier='Standard',vibes=[],itinerary_days=[TripItineraryDay(day_number=1,theme='Legacy',activities=[{'title':'Visit Al Fahidi','place_id':'al-fahidi'}])],config={'configurable':{'user_id':'1'}})
        db.add.assert_called_once();db.commit.assert_awaited_once()


class RepairGraph(unittest.IsolatedAsyncioTestCase):
    async def test_three_invalid_proposals_end_without_a_write_or_fourth_model_call(self):
        from MasarAi import MasarAi,TripState
        from langgraph.graph import StateGraph,START,END
        from langgraph.prebuilt import ToolNode
        from masarAiTools import save_trip_to_database
        value=draft();value['selections']=[{'id':'museum-of-the-future','priority':'must_visit'}]
        args={'title':'Missing museum','destination':'Dubai','duration_days':3,'budget_tier':'Standard','vibes':[],
              'hero_image_url':None,'featured_hotel':None,'itinerary_days':proposal()['days']}
        agent=MasarAi();agent.trip_planner_llm=Mock()
        agent.trip_planner_llm.invoke.side_effect=lambda _:AIMessage(content='',tool_calls=[{'id':'save','name':'save_trip_to_database','args':args}])
        graph=StateGraph(TripState);graph.add_node('planner',agent.trip_planner_agent)
        graph.add_node('tools',ToolNode([save_trip_to_database]));graph.add_node('finish',agent.trip_planner_save)
        graph.add_edge(START,'planner');graph.add_conditional_edges('planner',agent.trip_planner_router,{'trip_planner_tools':'tools','trip_planner_save':'finish'})
        graph.add_edge('tools','planner');graph.add_edge('finish',END);agent.graph=graph.compile()
        with patch('masarAiTools.AsyncSessionLocal') as sessions:
            chunks=[chunk async for chunk in agent.run_stream('Plan',user_id='1',trip_brief=value)]
        self.assertEqual(agent.trip_planner_llm.invoke.call_count,3);sessions.assert_not_called()
        self.assertIsNone(chunks[-1]['saved_trip_id'])
        self.assertTrue(any('required stop' in str(item) for item in chunks))
