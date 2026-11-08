"""Catalogue and dated-event tests: isolated DB and mocked discovery, no external calls."""
import os
os.environ['MASAR_ENV']='test'
os.environ.setdefault('DATABASE_URL','postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0')
os.environ['LANGSMITH_TRACING']='false'
os.environ['SECRET_KEY']='catalogue-fixture'
import unittest,json
from collections import Counter
from unittest.mock import patch,Mock
from types import SimpleNamespace
from domain.attractions import ATTRACTIONS,BY_ID
from domain.planning import PlanningDraft
from domain.itinerary_validation import validate_proposal,PlanConflict
from passport.catalogue import template_for
from services.planning_events import planning_events
from services.sunset_window import sunset_window
from tests.test_planning_runs import DurableRuns
from tests.test_planning_brief import draft
from tests.test_itinerary_validation import proposal

class CatalogueContracts(unittest.TestCase):
 def test_all_emirates_have_eight_to_ten_real_identities_and_beach_challenges(self):
  self.assertEqual(len(ATTRACTIONS),61);counts=Counter(p['emirate'] for p in ATTRACTIONS)
  self.assertEqual(len(counts),7);self.assertTrue(all(8<=n<=10 for n in counts.values()))
  self.assertEqual(len(BY_ID),len(ATTRACTIONS))
  for p in ATTRACTIONS:
   self.assertTrue(p['sourceUrl'].startswith('https://'));self.assertTrue(22<=p['lat']<=27);self.assertTrue(51<=p['lng']<=57)
   if p['kind']=='beach':self.assertIn('sunset-seeker',p['challengeKeys'])
   value=draft();value['selections']=[{'id':p['id'],'priority':'must_visit'}];PlanningDraft.model_validate(value)
 def test_challenge_validation_uses_catalogue_and_never_model_facilities(self):
  for pid,key in [('city-centre-mirdif','bowling'),('dubai-festival-city-mall','boxing'),('kite-beach','sunset-seeker')]:
   raw=proposal();a=raw['days'][0]['activities'][0];a.update(place_id=pid,challenge={'key':key,'reward_points':999},points_awarded=999)
   if key=='sunset-seeker':a.update(start_time='17:20',end_time='17:40')
   result=validate_proposal(raw,draft(),3)['days'][0]['activities'][0]
   self.assertEqual(result['challenge']['reward_status'],'not_awarded');self.assertNotIn('points_awarded',result)
   template=template_for(result);self.assertIsNotNone(template);self.assertEqual(template['required_photos'],1)
   if key=='boxing':self.assertIn('Confirm',result['challenge']['availability'])
  raw=proposal();raw['days'][0]['activities'][0].update(place_id='qasr-al-watan',challenge={'key':'heritage-detective'})
  with self.assertRaises(PlanConflict):validate_proposal(raw,draft(),3)
 def test_explicit_bowling_takes_daily_priority_over_an_earlier_landmark(self):
  from passport.catalogue import main_challenge_activity
  landmark={'id':'earlier','title':'Burj Khalifa','place_id':'burj-khalifa'}
  bowling={'id':'quest','title':'Bowling','place_id':'city-centre-mirdif','challenge':{'key':'bowling'}}
  self.assertEqual(main_challenge_activity([landmark,bowling])['id'],'quest')

 def test_sunset_is_date_specific_and_cannot_be_scheduled_in_the_morning(self):
  winter=sunset_window('2027-01-01',25.17,55.2);summer=sunset_window('2027-06-21',25.17,55.2)
  self.assertTrue('17:20'<winter['sunset']<'18:00');self.assertTrue('18:50'<summer['sunset']<'19:30');self.assertTrue(winter['estimated'])
  raw=proposal();raw['days'][0]['activities'][0].update(place_id='kite-beach',challenge={'key':'sunset-seeker'})
  with self.assertRaises(PlanConflict) as error:validate_proposal(raw,draft(),3)
  self.assertIn('sunset_timing',{i['code'] for i in error.exception.issues})

class EventResearch(unittest.IsolatedAsyncioTestCase):
 async def test_exact_dates_and_selected_emirates_always_reach_event_search(self):
  value=draft();value['selections']=[{'id':'sheikh-zayed-mosque'},{'id':'kite-beach'}]
  item=SimpleNamespace(id='ticketmaster:event1',title='Fixture concert',eventDate='2027-01-02T19:00:00+04:00',neighborhood='Fixture venue',description='Live music',tagline='',images=[],sourceUrl='https://fixture.example/event',sourceLabel='Ticketmaster')
  with patch('services.planning_events.discover',return_value=SimpleNamespace(items=[item],status='ok',message='Found',checkedAt='2026-10-26')) as discover:
   result=await planning_events(value)
  self.assertEqual(discover.call_count,2)
  self.assertEqual({call.args[0].region for call in discover.call_args_list},{'dubai','abudhabi'})
  self.assertTrue(all(str(call.args[0].start_date)=='2027-01-01' and str(call.args[0].end_date)=='2027-01-03' for call in discover.call_args_list))
  self.assertEqual(len(result['live_events']),1);self.assertEqual(result['events'][0]['event_date'],'2027-01-02')
 async def test_empty_and_unavailable_results_do_not_invent_events(self):
  for status in ['empty','unavailable']:
   with patch('services.planning_events.discover',return_value=SimpleNamespace(items=[],status=status,message='No data',checkedAt='2026-10-26')):
    result=await planning_events(draft())
   self.assertEqual(result['events'],[]);self.assertIn('unavailable' if status=='unavailable' else 'No dated events',result['event_search']['message'])
 async def test_event_extractor_preserves_mandatory_events_alongside_dining(self):
  from MasarAi import MasarAi
  from langchain_core.messages import ToolMessage,AIMessage
  live={'name':'Dated concert','place_id':'ticketmaster:e','event_date':'2027-01-02','kind':'live_event'}
  state={'event_result':{'live_events':[live],'event_search':{'message':'One dated event'}},'messages':[ToolMessage(content=json.dumps({'events':[{'name':'Dinner','place_id':'google:r'}]}),name='search_restaurants',tool_call_id='dining'),AIMessage(content='Findings')]}
  result=MasarAi().event_save(state)['event_result']
  self.assertEqual({e['name'] for e in result['events']},{'Dated concert','Dinner'});self.assertEqual(result['live_events'],[live])

class CatalogueAPI(unittest.IsolatedAsyncioTestCase):
 asyncSetUp=DurableRuns.asyncSetUp
 asyncTearDown=DurableRuns.asyncTearDown
 async def test_pagination_filter_resolution_and_authentication(self):
  first=await self.client.get('/api/v1/catalogue?limit=12');self.assertEqual(first.status_code,200,first.text)
  self.assertEqual(first.json()['total'],58);self.assertEqual(first.json()['nextOffset'],12)
  second=(await self.client.get('/api/v1/catalogue?offset=12&limit=12')).json()
  self.assertFalse({p['id'] for p in first.json()['items']} & {p['id'] for p in second['items']})
  region=(await self.client.get('/api/v1/catalogue?region=fujairah&limit=20')).json()
  self.assertEqual(region['total'],8);self.assertTrue(all(p['emirate']=='fujairah' for p in region['items']))
  search=await self.client.get('/api/v1/catalogue?q=Fort');self.assertEqual(search.status_code,200,search.text);self.assertGreater(search.json()['total'],0)
  resolved=await self.client.post('/api/v1/catalogue/resolve',json={'ids':['kite-beach','masfout-castle']})
  self.assertEqual(len(resolved.json()['items']),2);self.assertEqual(resolved.json()['unavailable'],[])
  self.assertEqual((await self.client.get('/api/v1/catalogue?limit=201')).status_code,422)
  from main import app
  import auth
  override=app.dependency_overrides.pop(auth.get_current_user)
  try:self.assertEqual((await self.client.get('/api/v1/catalogue')).status_code,401)
  finally:app.dependency_overrides[auth.get_current_user]=override

from tests import test_passport as passport_fixture
class DestinationEvidence(unittest.IsolatedAsyncioTestCase):
 asyncSetUp=passport_fixture.PassportTests.asyncSetUp
 asyncTearDown=passport_fixture.PassportTests.asyncTearDown
 accept=passport_fixture.PassportTests.accept
 photo=passport_fixture.PassportTests.photo
 async def test_saved_mall_without_challenge_metadata_activates_exactly_one_bowling_task(self):
  import models
  from passport.catalogue import template_for,main_challenge_activity
  mall={'id':'saved-mall-stop','title':'Palm Jumeirah Mall','place_id':'palm-jumeirah-mall'}
  beach={'id':'saved-beach-stop','title':'Kite Beach','place_id':'kite-beach'}
  self.assertEqual(template_for(mall)['challenge_key'],'bowling')
  self.assertIsNone(template_for({'title':'Other mall','place_id':'unknown-mall'}))
  self.assertIsNone(template_for(beach))
  self.assertEqual(main_challenge_activity([mall,beach])['id'],mall['id'])
  async with self.sessions() as db:
   trip=models.Trip(user_id=1,title='Saved mall itinerary',destination='Dubai',duration_days=1,itinerary_data={'days':[{'day_number':1,'activities':[mall,beach]}]})
   db.add(trip);await db.commit();trip_id=trip.id
  activated=await self.client.post(f'/trips/{trip_id}/activate',json={'interests':['adventure'],'pace':'light'})
  self.assertEqual(activated.status_code,200,activated.text)
  challenges=activated.json()['challenges'];self.assertEqual(len(challenges),1)
  self.assertEqual(challenges[0]['challenge_key'],'bowling')
  self.assertEqual(challenges[0]['source_activity_id'],'saved-mall-stop')
  self.assertEqual(challenges[0]['required_photos'],1)
  self.assertEqual((await self.client.get('/summary')).json()['xp'],0)

 async def test_mall_and_beach_tasks_activate_and_accept_private_evidence_without_automatic_awards(self):
  import models
  for pid,key in [('city-centre-mirdif','bowling'),('dubai-festival-city-mall','boxing'),('kite-beach','sunset-seeker')]:
   async with self.sessions() as db:
    trip=models.Trip(user_id=1,title='Destination task',destination='Dubai',duration_days=1,itinerary_data={'days':[{'day_number':1,'activities':[{'title':'Burj Khalifa','place_id':'burj-khalifa'},{'title':'Challenge stop','place_id':pid,'challenge':{'key':key,'place_id':pid}}]}]})
    db.add(trip);await db.commit();trip_id=trip.id
   activated=await self.client.post(f'/trips/{trip_id}/activate',json={'interests':['adventure'],'pace':'light'})
   self.assertEqual(activated.status_code,200,activated.text)
   challenges=activated.json()['challenges'];self.assertEqual(len(challenges),1);challenge=challenges[0]
   self.assertEqual(challenge['challenge_key'],key);self.assertEqual(challenge['required_photos'],1)
   await self.accept(challenge)
   submitted=await self.photo(challenge,key='destination-'+key+'-evidence')
   self.assertEqual(submitted.status_code,200,submitted.text)
   self.assertEqual(submitted.json()['submission']['status'],'pending')
  self.assertEqual((await self.client.get('/summary')).json()['xp'],0)
