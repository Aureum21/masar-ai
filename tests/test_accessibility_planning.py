"""Offline accessibility decisions and supplier fixtures. No real bookings or model calls."""
import os
os.environ['MASAR_ENV']='test'
os.environ.setdefault('DATABASE_URL','postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0')
import unittest
from types import SimpleNamespace
from unittest.mock import patch,AsyncMock,Mock
from fastapi import HTTPException
from domain.accessibility import compatibility,clean_evidence,provider_evidence,venue_evidence,annotate_candidates
from domain.planning import BriefDetails,PlanningDraft
from domain.itinerary_validation import validate_proposal,PlanConflict
from domain.planning_choices import auto_option,advance
from domain.research_preview import research_preview
from services.accessibility_evidence import remember,trusted_results
from passport.equivalent import equivalent_task,validate_equivalent

def brief(**changes):
    return BriefDetails(start_date='2027-01-01',end_date='2027-01-01',flight_requirement='not_needed',stay_requirement='not_needed',traveller_support=[dict(traveller=1,needs=['step_free'],essential=['step_free'])],**changes).model_dump(mode='json')

def fact(value):
    return {'value':value,'status':'reported','source':'Fixture venue','source_url':'https://example.com/access','last_checked':'2026-10-30'}

def plan(**changes):
    return {'days':[{'day_number':1,'theme':'Explore','activities':[{'title':'Fixture visit','place_id':'kite-beach','duration_minutes':30,**changes}]}]}

class AccessibilityDecisions(unittest.TestCase):
    def test_missing_source_never_becomes_a_confirmed_fact(self):
        evidence=clean_evidence({'facts':{'step_free_entrance':{'value':True,'status':'confirmed'}}})
        self.assertEqual(evidence['facts']['step_free_entrance']['status'],'unknown')
        self.assertTrue(compatibility(evidence,brief())['unknown'])

    def test_known_negative_conflicts_unknown_does_not(self):
        self.assertTrue(compatibility({'facts':{'step_free_entrance':fact(False)}},brief())['conflicts'])
        self.assertFalse(compatibility(None,brief())['conflicts'])
        self.assertTrue(compatibility(None,brief())['unknown'])

    def test_missing_and_zero_supplier_measurements_are_not_positive(self):
        evidence=provider_evidence({'accessibilityAttributes':{'entranceDoorWidth':0,'showerChair':''}},'hotel-1')
        self.assertEqual(evidence['facts'],{})
        evidence=provider_evidence({'accessibilityAttributes':{'attributes':['entranceLeveled']}},'hotel-1')
        self.assertTrue(evidence['facts']['step_free_entrance']['value'])
        self.assertEqual(evidence['facts']['step_free_entrance']['status'],'reported')

    def test_property_and_room_evidence_are_separate(self):
        details={'hotelFacilities':['Wheelchair-accessible room']}
        self.assertNotIn('wheelchair_room',provider_evidence(details,'h')['facts'])
        room={'id':7,'roomAmenities':[{'name':'Entire unit wheelchair accessible'}]}
        self.assertTrue(provider_evidence(details,'h',room)['facts']['wheelchair_room']['value'])
        room['roomAmenities']=[{'name':'Not wheelchair accessible'}]
        self.assertNotIn('wheelchair_room',provider_evidence(details,'h',room)['facts'])

    def test_provider_evidence_survives_bounded_preview(self):
        evidence=provider_evidence({'accessibilityAttributes':{'attributes':['entranceLeveled']}},'h')
        result=research_preview('accommodation_result',{'rooms':[{'offerId':'o','hotelId':'h','roomId':7,'accessibility':evidence,'property_accessibility':evidence}]})
        self.assertEqual(result['content']['rooms'][0]['accessibility'],evidence)
        self.assertEqual(result['content']['rooms'][0]['roomId'],'7')

    def test_model_cannot_invent_supplier_evidence(self):
        content={'rooms':[{'offerId':'unseen','accessibility':{'facts':{'wheelchair_room':fact(True)}}}]}
        self.assertEqual(trusted_results(content)['rooms'][0]['accessibility']['facts'],{})
        remember('room','seen',{'scope':'room','facts':{'wheelchair_room':fact(True)}})
        content['rooms'][0]['offerId']='seen'
        self.assertTrue(trusted_results(content)['rooms'][0]['accessibility']['facts']['wheelchair_room']['value'])

    def test_known_conflicting_candidates_are_filtered_before_synthesis(self):
        with patch.dict('domain.accessibility.VENUE_FACTS',{'blocked':{'step_free_entrance':fact(False)}}):
            result=annotate_candidates({'events':[{'place_id':'blocked'},{'place_id':'unreported'}]},brief())
        self.assertEqual(len(result['events']),1)
        self.assertTrue(result['events'][0]['accessibility_review']['unknown'])

    def test_save_rejects_conflicts_and_does_not_trust_model_facts(self):
        value=PlanningDraft(brief=BriefDetails.model_validate(brief())).model_dump(mode='json')
        with patch.dict('domain.accessibility.VENUE_FACTS',{'kite-beach':{'step_free_entrance':fact(False)}}):
            with self.assertRaises(PlanConflict):validate_proposal(plan(accessibility={'facts':{'step_free_entrance':fact(True)}}),value,1)

    def test_daily_notes_keep_unknown_access_and_walking_visible(self):
        value=PlanningDraft(brief=BriefDetails.model_validate(brief())).model_dump(mode='json')
        result=validate_proposal(plan(place_id='unreported'),value,1)
        self.assertIn('Confirm with venue',' '.join(result['days'][0]['accessibility_notes']))
        self.assertIn('unknown',' '.join(result['days'][0]['accessibility_notes']))

    def test_walking_and_rest_limits_are_enforced(self):
        details=BriefDetails.model_validate(brief())
        details.traveller_support[0].max_walk_m=100
        details.traveller_support[0].rest_every_minutes=30
        details.traveller_support[0].rest_minutes=10
        draft=PlanningDraft(brief=details).model_dump(mode='json')
        for activity in [{'walking_distance_m':101},{'duration_minutes':31}]:
            with self.subTest(activity=activity),self.assertRaises(PlanConflict):validate_proposal(plan(**activity),draft,1)
        raw=plan();raw['days'][0]['activities'] += [{'title':'Rest','kind':'rest','duration_minutes':10},{'title':'Explore','duration_minutes':20}]
        self.assertEqual(len(validate_proposal(raw,draft,1)['days']),1)

    def test_essential_room_is_never_chosen_automatically(self):
        b=brief();b['stay_requirement']='needed';b['end_date']='2027-01-02'
        b['traveller_support'][0].update(needs=['wheelchair_room'],essential=['wheelchair_room'])
        room={'offerId':'o','hotelId':'h','price':100,'currency':'AED','accessibility':{'scope':'room','facts':{'wheelchair_room':fact(True)}}}
        run=SimpleNamespace(brief_snapshot={'brief':b},workers=[{'type':'accommodation_result','content':{'rooms':[room]}}])
        self.assertIsNone(auto_option(run,'rooms'))
        flow={'stage':'rooms','selected':{'hotel':{'hotelId':'h'}},'revision':0}
        advance(run,flow,room)
        self.assertEqual(flow['selected']['room']['accessibility_review']['status'],'needs_confirmation')

    def test_booking_guard_requires_confirmation_for_exact_selected_offer(self):
        from routers.trip_bookings import require_support_confirmation,source_key
        run=SimpleNamespace(brief_snapshot={'brief':brief()})
        flow={'selected':{'room':{'offerId':'actual-offer'}}}
        with self.assertRaises(HTTPException):require_support_confirmation(run,flow,'hotel')
        flow['support_confirmations']={'hotel:1':{'status':'confirmed','offer_key':source_key('hotel',flow['selected']['room'])}}
        require_support_confirmation(run,flow,'hotel')
        flow['selected']['room']['offerId']='new-offer'
        with self.assertRaises(HTTPException):require_support_confirmation(run,flow,'hotel')

    def test_equivalent_tasks_require_review_and_are_catalogue_limited(self):
        self.assertIsNone(equivalent_task({'challenge_key':'unregistered'}))
        with self.assertRaises(ValueError):validate_equivalent({'challenge_key':'boxing'},'reflection','short')
        result=validate_equivalent({'challenge_key':'boxing'},'reflection','My reasoned response. '*10)
        self.assertEqual(result['mode'],'manual_equivalent')
        self.assertIn('rubric',equivalent_task({'challenge_key':'bowling'}))

    def test_edits_cannot_remove_support_or_exceed_limits(self):
        from copy import deepcopy
        from domain.trip_edits import validate_edit
        support=[{'traveller':1,'needs':['short_walks'],'essential':[],'max_walk_m':100}]
        previous={'traveller_support':support,'days':[{'id':'day1','day_number':1,'activities':[{'id':'a1','title':'Visit','walking_distance_m':50}]}]}
        proposed=deepcopy(previous);proposed['traveller_support']=[]
        validate_edit(previous,proposed)
        self.assertEqual(proposed['traveller_support'],support)
        proposed['days'][0]['activities'][0]['walking_distance_m']=101
        with self.assertRaises(HTTPException):validate_edit(previous,proposed)

    def test_ordinary_activity_status_update_preserves_detailed_accessibility_notes(self):
        from copy import deepcopy
        from domain.trip_edits import validate_edit
        support=[{'traveller':1,'needs':['step_free'],'essential':['step_free']}]
        notes=['Kite Beach: confirm accessible toilets and ramp before visit.']
        previous={
            'traveller_support':support,
            'days':[{
                'id':'day1',
                'day_number':1,
                'accessibility_notes':notes,
                'activities':[{'id':'a1','title':'Kite Beach','place_id':'kite-beach','status':'planned'}]
            }]
        }
        proposed=deepcopy(previous)
        proposed['days'][0]['activities'][0]['status']='completed'
        validate_edit(previous,proposed)
        self.assertEqual(proposed['days'][0]['accessibility_notes'],notes)

    def test_daily_notes_survive_normalization_when_an_editor_omits_them(self):
        from domain.trips import normalise_itinerary
        previous=normalise_itinerary({'days':[{'day_number':1,'activities':[],'accessibility_notes':['Confirm the lift.']}],'traveller_support':brief()['traveller_support']},trip_id=1)
        day=dict(previous['days'][0]);day.pop('accessibility_notes')
        result=normalise_itinerary({'days':[day]},previous=previous,trip_id=1)
        self.assertEqual(result['days'][0]['accessibility_notes'],['Confirm the lift.'])
        self.assertEqual(result['traveller_support'],previous['traveller_support'])

class ProviderFixtures(unittest.IsolatedAsyncioTestCase):
    async def test_cached_metadata_is_copied_and_keeps_its_original_check_time(self):
        from services.nutiee import fetch_liteapi_hotel_detail
        client=Mock();client.get=AsyncMock(return_value=Mock(status_code=200,json=lambda:{'data':{'name':'Fixture','rooms':[{'id':7}]}}))
        with patch('services.nutiee._DETAIL_CACHE',{}):
            first=await fetch_liteapi_hotel_detail(client,'cache-fixture','fixture-key')
            stamp=first['_accessibility_checked_at'];first['rooms'][0]['id']='mutated'
            second=await fetch_liteapi_hotel_detail(client,'cache-fixture','fixture-key')
        self.assertEqual(second['rooms'][0]['id'],7)
        self.assertEqual(second['_accessibility_checked_at'],stamp)
        client.get.assert_awaited_once()

    async def test_accessibility_requested_and_room_identity_is_exact(self):
        from services.nutiee import nuitee_get_hotel_rooms,HotelRoomsInput,Occupancy
        client=Mock();client.get=AsyncMock(return_value=Mock(status_code=200,json=lambda:{'data':{'rooms':[{'id':7,'roomName':'Deluxe','roomAmenities':[{'name':'Entire unit wheelchair accessible'}]}]}}))
        client.post=AsyncMock(return_value=Mock(raise_for_status=lambda:None,json=lambda:{'data':[{'roomTypes':[{'offerId':'fixture-offer','offerRetailRate':{'amount':100,'currency':'AED'},'rates':[{'name':'Deluxe','mappedRoomId':7}]}]}]}))
        context=Mock();context.__aenter__=AsyncMock(return_value=client);context.__aexit__=AsyncMock(return_value=None)
        params=HotelRoomsInput(hotelId='h',checkin='2027-01-01',checkout='2027-01-02',occupancies=[Occupancy(rooms=1,adults=1)])
        with patch('services.nutiee.httpx.AsyncClient',return_value=context),patch('services.nutiee._DETAIL_CACHE',{}):result=await nuitee_get_hotel_rooms(params)
        self.assertTrue(client.get.call_args.kwargs['params']['advancedAccessibilityOnly'])
        self.assertTrue(client.post.call_args.kwargs['json']['roomMapping'])
        self.assertTrue(result['rooms'][0]['accessibility']['facts']['wheelchair_room']['value'])
        # Identical names without a matching ID cannot establish accessibility.
        client.post.return_value.json=lambda:{'data':[{'roomTypes':[{'offerId':'other','offerRetailRate':{'amount':100,'currency':'AED'},'rates':[{'name':'Deluxe','mappedRoomId':8}]}]}]}
        with patch('services.nutiee.httpx.AsyncClient',return_value=context):result=await nuitee_get_hotel_rooms(params)
        self.assertEqual(result['rooms'][0]['accessibility']['facts'],{})
