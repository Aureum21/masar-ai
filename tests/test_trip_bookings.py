"""Booking flows use only isolated DB fixtures and mocked providers; never real purchases."""
import os
os.environ['MASAR_ENV']='test'
os.environ.setdefault('DATABASE_URL','postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0')
os.environ['LANGSMITH_TRACING']='false';os.environ['SECRET_KEY']='booking-task-fixture'
import unittest
from datetime import datetime,timedelta,timezone
from unittest.mock import patch,Mock,AsyncMock
from sqlalchemy import delete
import httpx,models
from database import AsyncSessionLocal
from tests.test_planning_runs import DurableRuns
from domain.planning_choices import flow_state,put_flow
from services.booking_records import BookingOperation
from services.flight_search import search

CONTACT={'firstName':'Fixture','lastName':'Guest','email':'fixture@example.com','phoneCountryCode':'971','phoneNumber':'501234567'}
PASSENGER={'firstName':'Fixture','lastName':'Guest','birthday':'1990-01-01','gender':'M','nationality':'AE','documentType':'passport','documentNumber':'TESTDOC123','documentIssueCountry':'AE','documentExpiry':'2035-01-01','passengerType':0}
ROOM={'hotelId':'h1','offerId':'provider-room-'+('x'*3000),'name':'Deluxe','price':'2000','currency':'AED'}
FLIGHT={'offer_id':'provider-flight-'+('x'*3000),'airline':'Fixture Air','total_amount':'1500','currency':'AED','slices':[]}

class BookingTasks(unittest.IsolatedAsyncioTestCase):
    create=DurableRuns.create
    async def asyncSetUp(self):
        await DurableRuns.asyncSetUp(self)
        run=await self.create()
        async with AsyncSessionLocal() as db:
            record=await db.get(models.PlanningRun,run['id'])
            record.brief_snapshot={**record.brief_snapshot,'brief':{**record.brief_snapshot['brief'],'travellers':2}}
            flow=flow_state(record);flow['selected']={'room':ROOM,'hotel':{'name':'Fixture hotel','hotelId':'h1'},'flight':FLIGHT};put_flow(record,flow)
            trip=models.Trip(user_id=self.owner.id,title='Booking fixture',itinerary_data={'days':[],'travel_choices':flow['selected'],'travel_party_size':2})
            db.add(trip);await db.flush();record.trip_id=trip.id;record.status='completed';self.trip_id=trip.id
            await db.commit()
        self.base=f'/api/v1/trip-bookings/{self.trip_id}'
    async def asyncTearDown(self):
        async with AsyncSessionLocal() as db:
            await db.execute(delete(BookingOperation).where(BookingOperation.user_id.in_([self.owner.id,self.other.id])))
            await db.execute(delete(models.Booking).where(models.Booking.user_id.in_([str(self.owner.id),str(self.other.id)])))
            await db.execute(delete(models.PreBooking).where(models.PreBooking.user_id.in_([str(self.owner.id),str(self.other.id)])))
            await db.commit()
        await DurableRuns.asyncTearDown(self)
    async def hotel_hold(self):
        provider=AsyncMock(return_value={'prebook_id':'hold-hotel-1','final_price':2100,'currency':'AED','room_name':'Deluxe','checkin':'2027-01-01','checkout':'2027-01-03'})
        with patch('routers.trip_bookings.nuitee_prebook',provider):
            response=await self.client.post(self.base+'/prebook',json={'kind':'hotel'})
        self.assertEqual(response.status_code,200,response.text)
        provider.assert_awaited_once_with(ROOM['offerId']);return response.json()
    async def test_hotel_prebook_then_explicit_booking_is_linked_and_idempotent(self):
        held=await self.hotel_hold();self.assertEqual(held['status'],'HELD');self.assertEqual(held['amount'],2100)
        body={'kind':'hotel','prebook_id':held['prebook_id'],'confirm_payment':True,'contact':CONTACT,'guest_names':[{'firstName':'A','lastName':'Guest'},{'firstName':'B','lastName':'Guest'}]}
        provider=AsyncMock(return_value={'status':'CONFIRMED','booking_id':'hotel-reference-1','sandbox':True})
        with patch('services.booking_records.nuitee_confirm_booking',provider):
            one=await self.client.post(self.base+'/book',json=body);two=await self.client.post(self.base+'/book',json=body)
        self.assertEqual(one.status_code,200,one.text);self.assertEqual(two.status_code,200,two.text)
        self.assertEqual(one.json()['confirmation']['total_amount'],'2100');self.assertEqual(one.json()['confirmation']['amount_source'],'accepted_prebook')
        trip=(await self.client.get(f'/api/v1/trips/{self.trip_id}')).json()
        confirmed=[item for item in trip['reservations'] if item['status']=='CONFIRMED']
        self.assertEqual(confirmed[0]['total_amount'],'2100');self.assertEqual(confirmed[0]['environment'],'sandbox')
        self.assertEqual(one.json()['confirmation']['trip_id'],self.trip_id);self.assertEqual(one.json()['confirmation']['status'],'CONFIRMED')
        provider.assert_awaited_once();self.assertEqual(len(provider.await_args.args[0].guests),2)
        self.assertTrue(all(g.occupancyNumber==1 for g in provider.await_args.args[0].guests))
        records=(await self.client.get(self.base)).json();self.assertEqual(records['travellers'],2)
        self.assertEqual([o['status'] for o in records['operations']],['HELD','CONFIRMED'])
    async def test_ownership_posted_offer_tampering_and_payment_consent(self):
        self.actor=self.other
        self.assertEqual((await self.client.post(self.base+'/prebook',json={'kind':'hotel'})).status_code,404)
        self.actor=self.owner
        self.assertEqual((await self.client.post(self.base+'/prebook',json={'kind':'hotel','offerId':'forged'})).status_code,422)
        self.assertEqual((await self.client.post(self.base+'/book',json={'kind':'hotel','prebook_id':'none','confirm_payment':False})).status_code,422)
        self.assertEqual((await self.client.post(self.base+'/book',json={'kind':'flight','prebook_id':'none','confirm_payment':True})).status_code,409)
    async def test_flight_prebook_requires_all_passengers_and_booking_uses_saved_hold(self):
        provider=AsyncMock(return_value={'prebook_id':'hold-flight-1','amount':1550,'currency':'AED','payment_methods':['ACC_CREDIT_CARD']})
        with patch('routers.trip_bookings.flight_prebook',provider):
            bad=await self.client.post(self.base+'/prebook',json={'kind':'flight','contact':CONTACT,'passengers':[PASSENGER]})
            self.assertEqual(bad.status_code,422);provider.assert_not_awaited()
            body={'kind':'flight','contact':CONTACT,'passengers':[PASSENGER,{**PASSENGER,'firstName':'Other','documentNumber':'TESTDOC456'}]}
            held=await self.client.post(self.base+'/prebook',json=body);again=await self.client.post(self.base+'/prebook',json=body)
        self.assertEqual(held.status_code,200,held.text);self.assertEqual(again.status_code,200);provider.assert_awaited_once()
        self.assertEqual(provider.await_args.args[0],FLIGHT['offer_id'])
        booker=AsyncMock(return_value={'status':'CONFIRMED','booking_id':'flight-reference-1','sandbox':True})
        with patch('routers.trip_bookings.flight_book',booker):
            payload={'kind':'flight','prebook_id':'hold-flight-1','confirm_payment':True}
            booked=await self.client.post(self.base+'/book',json=payload);repeat=await self.client.post(self.base+'/book',json=payload)
        self.assertEqual(booked.status_code,200,booked.text);self.assertEqual(repeat.status_code,200)
        booker.assert_awaited_once_with('hold-flight-1');self.assertEqual(booked.json()['confirmation']['status'],'CONFIRMED')
    async def test_ambiguous_prebook_outcome_is_not_automatically_retried(self):
        provider=AsyncMock(side_effect=httpx.ReadTimeout('fixture timeout'))
        with patch('routers.trip_bookings.nuitee_prebook',provider):
            first=await self.client.post(self.base+'/prebook',json={'kind':'hotel'})
            second=await self.client.post(self.base+'/prebook',json={'kind':'hotel'})
        self.assertEqual(first.status_code,502);self.assertEqual(second.status_code,409);provider.assert_awaited_once()
        self.assertEqual((await self.client.get(self.base)).json()['operations'][0]['status'],'UNKNOWN')

class BookingDateGuard(unittest.IsolatedAsyncioTestCase):
    asyncSetUp=BookingTasks.asyncSetUp
    asyncTearDown=BookingTasks.asyncTearDown
    create=BookingTasks.create
    async def test_changed_trip_dates_block_old_offer_prebooking(self):
        async with AsyncSessionLocal() as db:
            trip=await db.get(models.Trip,self.trip_id);trip.itinerary_data={**trip.itinerary_data,'start_date':'2027-02-01'};await db.commit()
        with patch('routers.trip_bookings.nuitee_prebook',new_callable=AsyncMock) as provider:
            response=await self.client.post(self.base+'/prebook',json={'kind':'hotel'})
        self.assertEqual(response.status_code,409);provider.assert_not_awaited()

class FlightSearch(unittest.TestCase):
    def dates(self):
        today=datetime.now(timezone.utc).date();return (today+timedelta(days=30)).isoformat(),(today+timedelta(days=35)).isoformat()
    def test_roundtrip_directions_and_sandbox_results_are_preserved(self):
        departure,return_date=self.dates();response=Mock();response.json.return_value={'data':[{'journeys':[{'segments':[{'originCode':'LHR','destinationCode':'DXB','departureTime':departure+'T08:00:00','arrivalTime':departure+'T18:00:00','direction':'OUTBOUND','carrier':{'marketingName':'Nuitee Air'}}],'offers':[{'offerId':'provider-opaque','pricing':{'display':{'total':1700,'currency':'AED'}}}]}]}]}
        with patch.dict(os.environ,{'NUTIEE_API_KEY':'sand_fixture'}),patch('services.flight_search.requests.post',return_value=response) as request:
            result=search(' lhr ','dxb',departure,return_date,2)
        legs=request.call_args.kwargs['json']['legs'];self.assertEqual([l['direction'] for l in legs],['OUTBOUND','INBOUND'])
        self.assertEqual(result['offers'][0]['airline'],'Nuitee Air');self.assertEqual(result['offers'][0]['environment'],'sandbox')
        self.assertEqual(request.call_args.kwargs['json']['adults'],2)
    def test_provider_search_errors_are_not_hidden_or_fabricated(self):
        departure,_=self.dates();response=Mock();response.json.return_value={'error':{'code':51099,'description':'provider search failed'}}
        with patch.dict(os.environ,{'NUTIEE_API_KEY':'sand_fixture'}),patch('services.flight_search.requests.post',return_value=response):result=search('LHR','DXB',departure)
        self.assertEqual(result['offers'],[]);self.assertIn('51099',result['error'])
    def test_invalid_airports_or_dates_do_not_call_the_provider(self):
        with patch('services.flight_search.requests.post') as request:
            self.assertEqual(search('London','DXB','UNKNOWN')['offers'],[])
            self.assertEqual(search('LHR','DXB','UNKNOWN')['offers'],[])
        request.assert_not_called()


class SandboxBooking(unittest.IsolatedAsyncioTestCase):
    asyncSetUp=BookingTasks.asyncSetUp
    asyncTearDown=BookingTasks.asyncTearDown
    create=BookingTasks.create
    hotel_hold=BookingTasks.hotel_hold
    async def test_sandbox_hotel_simulation_needs_no_card_or_payment_confirmation(self):
        with patch.dict(os.environ,{'NUTIEE_API_KEY':'sand_fixture'}):
            self.assertTrue((await self.client.get(self.base)).json()['simulation'])
            held=await self.hotel_hold()
            provider=AsyncMock(return_value={'status':'CONFIRMED','booking_id':'sandbox-hotel-1','sandbox':True})
            with patch('services.booking_records.nuitee_confirm_booking',provider):
                response=await self.client.post(self.base+'/book',json={'kind':'hotel','prebook_id':held['prebook_id'],'confirm_simulation':True,'contact':CONTACT,'guest_names':[{'firstName':'A','lastName':'Guest'},{'firstName':'B','lastName':'Guest'}]})
            self.assertEqual(response.status_code,200,response.text)
            self.assertEqual(response.json()['confirmation']['environment'],'sandbox')
            provider.assert_awaited_once()
    async def test_client_cannot_turn_live_booking_into_simulation(self):
        with patch.dict(os.environ,{'NUTIEE_API_KEY':'live_fixture','TRAVEL_PROVIDER_ENVIRONMENT':'live'}):
            held=await self.hotel_hold()
            with patch('services.booking_records.nuitee_confirm_booking',new_callable=AsyncMock) as provider:
                response=await self.client.post(self.base+'/book',json={'kind':'hotel','prebook_id':held['prebook_id'],'confirm_simulation':True,'contact':CONTACT,'guest_names':[{'firstName':'A','lastName':'Guest'},{'firstName':'B','lastName':'Guest'}]})
            self.assertEqual(response.status_code,409);provider.assert_not_awaited()
    async def test_sandbox_flight_simulation_does_not_require_saved_card_capability(self):
        with patch.dict(os.environ,{'NUTIEE_API_KEY':'sand_fixture'}):
            provider=AsyncMock(return_value={'prebook_id':'sandbox-flight-hold','amount':1500,'currency':'AED','payment_methods':[]})
            with patch('routers.trip_bookings.flight_prebook',provider):
                held=await self.client.post(self.base+'/prebook',json={'kind':'flight','contact':CONTACT,'passengers':[PASSENGER,{**PASSENGER,'firstName':'Other','documentNumber':'TESTDOC456'}]})
            self.assertEqual(held.status_code,200,held.text)
            booker=AsyncMock(return_value={'status':'CONFIRMED','booking_id':'sandbox-flight-1','sandbox':True})
            with patch('routers.trip_bookings.flight_book',booker):
                response=await self.client.post(self.base+'/book',json={'kind':'flight','prebook_id':'sandbox-flight-hold','confirm_simulation':True})
            self.assertEqual(response.status_code,200,response.text)
            self.assertEqual(response.json()['confirmation']['environment'],'sandbox')
            booker.assert_awaited_once()
class ReservationBudget(unittest.TestCase):
    def test_legacy_price_is_recovered_only_from_matching_hold_without_mutating_records(self):
        from services.booking_records import reservation_payloads
        def op(**fields):
            return BookingOperation(id='fixture',user_id=1,trip_id=7,kind='hotel',source_key='p1',status='CONFIRMED',provider_reference='booking-1',environment='sandbox',result={},**fields)
        booked=op()
        hold=BookingOperation(id='hold',user_id=1,trip_id=7,kind='hotel_hold',status='HELD',environment='sandbox',result={'prebook_id':'p1','amount':'3843.92','currency':'AED'})
        recovered=reservation_payloads([booked,hold])[0]
        self.assertEqual(recovered['total_amount'],'3843.92');self.assertEqual(recovered['amount_source'],'accepted_prebook');self.assertEqual(booked.result,{})
        for field,value in [('user_id',2),('trip_id',8),('environment','live')]:
            original=getattr(hold,field);setattr(hold,field,value)
            self.assertIsNone(reservation_payloads([booked,hold])[0]['total_amount']);setattr(hold,field,original)
        booked.result={'total_amount':'3900','currency':'AED'}
        self.assertEqual(reservation_payloads([booked,hold])[0]['total_amount'],'3900')
    def test_invalid_prices_are_not_reported_as_zero(self):
        from services.booking_records import valid_amount
        for value in [None,True,'NaN','Infinity','-1','not a price']:
            self.assertIsNone(valid_amount(value,'AED'))
        self.assertIsNone(valid_amount('10','invalid'))
        self.assertEqual(valid_amount('0','aed'),{'total_amount':'0','currency':'AED'})
