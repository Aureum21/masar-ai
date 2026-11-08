"""Run only against the disposable database. All provider outcomes are fixtures."""
import os
os.environ["MASAR_ENV"] = "test"
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0")
os.environ["LANGSMITH_TRACING"] = "false"
os.environ["NUTIEE_API_KEY"] = "fixture-only"
os.environ["SECRET_KEY"] = "phase1-isolated-fixture-key-not-a-real-secret"

import unittest
from unittest.mock import patch, Mock, AsyncMock
from datetime import datetime, timezone
from copy import deepcopy
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import ValidationError
from config.runtime import database_url
from domain.preferences import normalise_preferences
from domain.places import resolve_place, challenge_is_eligible
from domain.trips import normalise_itinerary, TripBrief
from database import engine
from main import app
import models, auth, schemas


class Contracts(unittest.TestCase):
    def test_test_mode_rejects_other_databases(self):
        with patch.dict(os.environ, {"DATABASE_URL":"postgresql://user:secret@remote/production"}):
            with self.assertRaises(RuntimeError): database_url()

    def test_preferences_merge_and_explicit_empty(self):
        result=normalise_preferences({"interests":["Heritage"],"custom_notes":"Keep me"},{"vibes":[],"dietary":["Halal"]})
        self.assertEqual(result["interests"], [])
        self.assertEqual(result["vibes"], [])
        self.assertEqual(result["dietary_restrictions"], ["Halal"])
        self.assertEqual(result["custom_notes"], "Keep me")

    def test_legacy_trip_stable_unscheduled_and_not_mutated(self):
        raw={"days":[{"day_number":1,"theme":"Dubai","activities":[{"title":"Visit"}]}]}
        before=deepcopy(raw)
        one=normalise_itinerary(raw,trip_id=55)
        self.assertEqual(one,normalise_itinerary(raw,trip_id=55))
        self.assertEqual(before,raw)
        self.assertIsNone(one["start_date"])
        self.assertIsNone(one["days"][0]["date"])
        self.assertNotEqual(one["days"][0]["id"],one["days"][0]["activities"][0]["id"])

    def test_dates_and_invalid_ranges(self):
        raw={"days":[{"activities":[]},{"activities":[]}]}
        result=normalise_itinerary(raw,start_date="2026-12-31",end_date="2027-01-01")
        self.assertEqual(result["days"][1]["date"],"2027-01-01")
        with self.assertRaises(ValidationError): normalise_itinerary(raw,start_date="2026-12-31",end_date="2026-12-30")
        with self.assertRaises(ValidationError): normalise_itinerary(raw,status="active")
        with self.assertRaises(ValidationError): normalise_itinerary(raw,start_date="2026-12-31",end_date="2026-12-31")

    def test_ids_survive_activity_move(self):
        old=normalise_itinerary({"days":[{"activities":[{"title":"Museum"}]},{"activities":[]}]},trip_id=5)
        new=normalise_itinerary({"days":[{"activities":[]},{"activities":[{"title":"Museum"}]}]},trip_id=5,previous=old,revision=2)
        self.assertEqual(old["days"][0]["activities"][0]["id"],new["days"][1]["activities"][0]["id"])
        self.assertEqual(new["revision"],2)

    def test_legacy_shapes_and_api_contract(self):
        for raw in [[{"activities":[]}], '{"days":[{"activities":[]}]}', {"Day 1":{"activities":[]}}, "Saved trip text"]:
            result=normalise_itinerary(raw,trip_id=1)
            self.assertEqual(len(result["days"]),1)
        response=schemas.TripResponse.model_validate(dict(id=1,user_id=1,title="Legacy",created_at=datetime.now(timezone.utc),itinerary_data=[{"activities":[]}]))
        self.assertIsNone(response.start_date)
        self.assertEqual(response.itinerary_data["schema_version"],2)
        request=schemas.TripCreate(title="Dated",start_date="2027-01-01",itinerary_data={"days":[{"activities":[]}]})
        self.assertEqual(request.itinerary_data["days"][0]["date"],"2027-01-01")
        self.assertEqual(normalise_itinerary({"days":[{"theme":None,"activities":None}]})["days"][0]["activities"],[])

    def test_places_and_supported_challenges(self):
        self.assertEqual(resolve_place("burj-khalifa-sky"),{"place_id":"burj-khalifa","product_id":"burj-khalifa-sky"})
        for key in ["burj","future","mosque"]: self.assertTrue(challenge_is_eligible("heritage-detective",key))
        self.assertFalse(challenge_is_eligible("heritage-detective","al-noor"))
        self.assertFalse(challenge_is_eligible("new-ai-invention","future"))
        self.assertFalse(challenge_is_eligible("bowling",venue={"kind":"mall"}))
        self.assertTrue(challenge_is_eligible("bowling",venue={"verified":True,"kind":"mall","facilities":["bowling"]}))
        self.assertFalse(challenge_is_eligible("boxing",venue={"verified":True,"kind":"mall","facilities":["bowling"]}))
        self.assertTrue(challenge_is_eligible("sunset-seeker",venue={"verified":True,"kind":"beach","accessible":True,"sunset_window_valid":True}))

    def test_brief_does_not_infer_flight_or_hotel(self):
        self.assertEqual(TripBrief().flight_requirement,"unknown")
        self.assertEqual(TripBrief(stay_requirement="not_needed").stay_requirement,"not_needed")

    def test_flight_failures_and_demo_offers_cannot_confirm(self):
        from masarAiTools import search_flights, book_flight
        with patch("requests.post",side_effect=RuntimeError("fixture failure")) as provider:
            search=search_flights.invoke({"origin":"LHR","destination":"DXB","departure_date":"2027-01-01"})
            self.assertIn("error",search)
            self.assertEqual(search["offers"],[])
            booking=book_flight.invoke({"offer_id":"real-offer","passengers":[]})
            self.assertEqual(booking["status"],"UNKNOWN")
        with patch("requests.post") as provider:
            result=book_flight.invoke({"offer_id":"off_mock_LHRDXB","passengers":[]})
            self.assertEqual(result["status"],"REJECTED")
            provider.assert_not_called()

    def test_provider_without_confirmation_is_pending(self):
        from masarAiTools import book_flight
        prebook=Mock();prebook.json.return_value={"data":{"prebookId":"fixture-prebook"}}
        book=Mock();book.json.return_value={"data":{"bookingId":"fixture-booking"}}
        with patch("requests.post",side_effect=[prebook,book]):
            result=book_flight.invoke({"offer_id":"real-offer","passengers":[]})
            self.assertEqual(result["status"],"PENDING")


class Ownership(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.connection=await engine.connect()
        self.transaction=await self.connection.begin()
        self.db=AsyncSession(bind=self.connection,expire_on_commit=False,join_transaction_mode="create_savepoint")
        self.owner=models.User(email="owner@example.com",name="Owner",hashed_password="fixture")
        self.other=models.User(email="other@example.com",name="Other",hashed_password="fixture")
        self.db.add_all([self.owner,self.other]);await self.db.flush()
        self.db.add(models.Conversation(id="private-thread",user_id=self.owner.id,title="Private"))
        self.db.add(models.PreBooking(prebook_id="private-prebook",user_id=str(self.owner.id)))
        await self.db.commit()
        async def db_override(): yield self.db
        async def user_override(): return self.other
        app.dependency_overrides[auth.get_db]=db_override
        app.dependency_overrides[auth.get_current_user]=user_override
        self.client=httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url="http://fixture")

    async def asyncTearDown(self):
        await self.client.aclose();app.dependency_overrides.clear()
        await self.db.close();await self.transaction.rollback();await self.connection.close()
        await engine.dispose()

    async def test_foreign_conversation_cannot_read_or_append(self):
        response=await self.client.post('/api/v1/chat',json={"message":"Read private history","thread_id":"private-thread"})
        self.assertEqual(response.status_code,404)
        count=await self.db.scalar(select(func.count()).select_from(models.Message))
        self.assertEqual(count,0)
        response=await self.client.get('/api/v1/conversations/private-thread/messages')
        self.assertEqual(response.status_code,404)

    async def test_foreign_prebook_never_calls_provider(self):
        with patch('main.nuitee_confirm_booking',new_callable=AsyncMock) as provider:
            response=await self.client.post('/api/v1/bookings/confirm',json={"prebook_id":"private-prebook","holder":{"firstName":"A","lastName":"B","email":"a@example.com","phone":"1"},"guests":[]})
            self.assertEqual(response.status_code,404)
            provider.assert_not_awaited()

    async def test_agent_booking_tool_checks_owner_before_provider(self):
        from masarAiTools import confirm_booking
        session_context=AsyncMock()
        session_context.__aenter__.return_value=self.db
        with patch('masarAiTools.AsyncSessionLocal',return_value=session_context), patch('masarAiTools.nuitee_confirm_booking',new_callable=AsyncMock) as provider:
            result=await confirm_booking.ainvoke({"prebook_id":"private-prebook","holder":{"firstName":"A","lastName":"B","email":"a@example.com","phone":"1"},"guests":[]},config={"configurable":{"user_id":str(self.other.id)}})
            self.assertEqual(result["error"],"Prebooking not found")
            provider.assert_not_awaited()

    async def test_profile_merge_and_email_token_refresh(self):
        self.other.travel_preferences={"custom_notes":"Preserve"};await self.db.commit()
        response=await self.client.put('/api/v1/users/me',json={"travel_preferences":{"vibes":["Heritage"]}})
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json()["travel_preferences"]["custom_notes"],"Preserve")
        self.assertEqual(response.json()["travel_preferences"]["interests"],["Heritage"])
        response=await self.client.put('/api/v1/users/me',json={"email":"changed@example.com"})
        self.assertTrue(response.json()["access_token"])
        from jose import jwt
        claims=jwt.decode(response.json()["access_token"],auth.SECRET_KEY,algorithms=[auth.ALGORITHM])
        self.assertEqual(claims["sub"],"changed@example.com")

    async def test_urlencoded_login_returns_a_token(self):
        with patch('auth.verify_password',return_value=True):
            response=await self.client.post('/api/v1/auth/login',data={"username":self.other.email,"password":"fixture"})
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json()["token_type"],"bearer")
        self.assertTrue(response.json()["access_token"])

    async def test_old_and_dated_trips_persist_without_new_columns(self):
        response=await self.client.post('/api/v1/trips',json={"title":"Dated","start_date":"2027-01-01","end_date":"2027-01-02","itinerary_data":{"days":[{"activities":[{"title":"Museum","place_id":"future"}]}]}})
        self.assertEqual(response.status_code,200,response.text)
        trip=response.json()
        self.assertEqual(trip['start_date'],'2027-01-01')
        self.assertEqual(trip['itinerary_data']['days'][0]['activities'][0]['place_id'],'museum-of-the-future')
        again=(await self.client.get(f"/api/v1/trips/{trip['id']}")).json()
        self.assertEqual(trip['itinerary_data'],again['itinerary_data'])


if __name__=='__main__': unittest.main()
