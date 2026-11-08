"""Owner-scoped SQLite API tests for support records and equivalent challenge awards."""
import os
os.environ['MASAR_ENV']='test'
os.environ.setdefault('DATABASE_URL','postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0')
import unittest
from uuid import uuid4
from unittest.mock import patch,AsyncMock
import httpx
import models
from sqlalchemy import select
from tests import test_passport as fixture
from domain.planning import PlanningDraft,BriefDetails
from domain.planning_choices import put_flow
from passport.models import Award

class AccessibilityAPI(unittest.IsolatedAsyncioTestCase):
    asyncSetUp=fixture.PassportTests.asyncSetUp
    asyncTearDown=fixture.PassportTests.asyncTearDown
    accept=fixture.PassportTests.accept
    real_photo_challenge=fixture.PassportTests.real_photo_challenge

    async def test_landmark_equivalent_needs_no_photos_or_quiz_and_is_not_auto_awarded(self):
        _,challenge=await self.real_photo_challenge()
        self.assertIn('named details',challenge['equivalent_task']['rubric'])
        payload={'evidence_type':'reflection','equivalent':'true','idempotency_key':'landmark-equivalent-1','text':'The card describes a calligraphic facade and an open centre. The writing creates a patterned surface around a contrasting empty space. I interpret the contrast as a useful question about what we know and what remains unexplored; I am studying the card, not reporting a visit.'}
        result=await self.client.post(f"/challenges/{challenge['id']}/submissions",data=payload)
        self.assertEqual(result.status_code,200,result.text)
        self.assertEqual(result.json()['submission']['status'],'pending')
        self.assertEqual(result.json()['submission']['verification']['mode'],'manual_equivalent')
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)

    async def test_equivalent_requires_authorized_review_and_shares_one_award(self):
        async with self.sessions() as db:
            trip=models.Trip(user_id=1,title='Inclusive mall visit',destination='Dubai',duration_days=1,itinerary_data={'days':[{'day_number':1,'activities':[{'id':'task','title':'Bowling','place_id':'city-centre-mirdif','challenge':{'key':'bowling','place_id':'city-centre-mirdif'}}]}]})
            db.add(trip);await db.commit();trip_id=trip.id
        response=await self.client.post(f'/trips/{trip_id}/activate',json={'interests':['discovery'],'pace':'light'})
        self.assertEqual(response.status_code,200,response.text)
        challenge=response.json()['challenges'][0]
        self.assertIn('rubric',challenge['equivalent_task'])
        await self.accept(challenge)
        payload={'evidence_type':'reflection','equivalent':'true','idempotency_key':'equivalent-fixture-1','text':'Direction and spin change the path of the ball, and lane conditions can also affect it. A strike clears all ten pins on the first roll, while a spare uses two rolls. I would ask staff about available ramps and the step-free route before choosing how to join in.'}
        result=await self.client.post(f"/challenges/{challenge['id']}/submissions",data=payload)
        self.assertEqual(result.status_code,200,result.text)
        submission=result.json()['submission'];self.assertEqual(submission['status'],'pending')
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)
        replay=await self.client.post(f"/challenges/{challenge['id']}/submissions",data=payload)
        self.assertEqual(replay.json()['submission']['id'],submission['id'])
        unauthorized=await self.client.post(f"/review/submissions/{submission['id']}",json={'decision':'accepted','feedback':'Meets rubric'})
        self.assertEqual(unauthorized.status_code,403)
        operator={'X-Test-User':'2','X-Passport-Operator-Key':'isolated-test-operator'}
        queue=(await self.client.get('/review/submissions',headers=operator)).json()['submissions']
        self.assertIn('Review rubric',queue[0]['instructions'])
        for _ in range(2):
            reviewed=await self.client.post(f"/review/submissions/{submission['id']}",headers=operator,json={'decision':'accepted','feedback':'Meets every observation criterion.'})
            self.assertEqual(reviewed.status_code,200,reviewed.text)
        summary=(await self.client.get('/summary')).json()
        self.assertEqual(summary['xp'],challenge['xp']);self.assertEqual(len(summary['stamps']),1)
        self.assertEqual(summary['stamps'][0]['verification'],'operator reviewed equivalent task')
        other=await self.client.post(f"/challenges/{challenge['id']}/submissions",data={**payload,'idempotency_key':'another-path-fixture'})
        self.assertEqual(other.status_code,409)
        async with self.sessions() as db:self.assertEqual(len((await db.scalars(select(Award))).all()),1)

    async def test_support_record_ownership_and_booking_gate(self):
        from routers.trip_bookings import router
        self.client._transport.app.include_router(router)
        async with self.sessions() as db:
            details=BriefDetails(start_date='2027-01-01',end_date='2027-01-02',traveller_support=[{'traveller':1,'needs':['wheelchair_room'],'essential':['wheelchair_room']}])
            trip=models.Trip(user_id=1,title='Accessible stay',destination='Dubai',duration_days=2,itinerary_data={'days':[]})
            db.add(trip);await db.flush()
            run=models.PlanningRun(id=str(uuid4()),user_id=1,brief_id=str(uuid4()),brief_revision=1,brief_snapshot=PlanningDraft(brief=details).model_dump(mode='json'),request_id=str(uuid4()),request_hash='fixture',status='completed',message='Saved',trip_id=trip.id)
            put_flow(run,{'selected':{'room':{'hotelId':'h','offerId':'real-fixture-offer'}},'stage':'research','revision':0})
            db.add(run);await db.commit();trip_id=trip.id
        async with httpx.AsyncClient(transport=self.client._transport,base_url='http://test') as client:
            url=f'/api/v1/trip-bookings/{trip_id}'
            saved=await client.put(url+'/support',json={'traveller':1,'kind':'hotel','status':'confirmed','reference':'Hotel access team, reference TEST123'})
            self.assertEqual(saved.status_code,200,saved.text)
            foreign=await client.put(url+'/support',headers={'X-Test-User':'2'},json={'traveller':1,'kind':'hotel','status':'confirmed','reference':'Foreign edit'})
            self.assertEqual(foreign.status_code,404)
            response=await client.get(url)
            self.assertEqual(response.json()['support_confirmations']['hotel:1']['reported_by'],'traveller')
            await client.put(url+'/support',json={'traveller':1,'kind':'hotel','status':'requested','reference':''})
            with patch('routers.trip_bookings.nuitee_prebook',new_callable=AsyncMock) as provider:
                blocked=await client.post(url+'/book',json={'kind':'hotel','prebook_id':'not-held','confirm_simulation':True})
            self.assertEqual(blocked.status_code,409);self.assertIn('support checklist',blocked.json()['detail']);provider.assert_not_called()
