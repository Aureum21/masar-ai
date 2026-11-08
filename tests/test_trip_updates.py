"""Tests for Trip Workspace PATCH /api/v1/trips/{trip_id} and revision safety."""
import os
os.environ["MASAR_ENV"] = "test"
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0")
os.environ["LANGSMITH_TRACING"] = "false"
os.environ["SECRET_KEY"] = "trip-workspace-test-secret"

import unittest
from unittest.mock import patch, Mock, AsyncMock
from copy import deepcopy
import httpx
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from domain.trips import normalise_itinerary
from database import engine
from main import app
import models, auth, schemas


class ItineraryContracts(unittest.TestCase):
    def test_activity_reorder_and_custom_fields_preserved(self):
        old = normalise_itinerary({
            "days": [
                {
                    "day_number": 1,
                    "theme": "Arrival",
                    "activities": [
                        {"title": "Check in", "status": "visited", "cost": 0},
                        {"title": "Burj Khalifa", "status": "pending", "cost": 180}
                    ]
                }
            ]
        }, trip_id=101)
        
        # Reorder activities and update status
        act1 = old["days"][0]["activities"][0]
        act2 = old["days"][0]["activities"][1]
        reordered = {
            "days": [
                {
                    "day_number": 1,
                    "theme": "Arrival",
                    "activities": [
                        {**act2, "status": "visited"},
                        act1
                    ]
                }
            ]
        }
        updated = normalise_itinerary(reordered, trip_id=101, previous=old, revision=2)
        self.assertEqual(updated["revision"], 2)
        self.assertEqual(updated["days"][0]["activities"][0]["id"], act2["id"])
        self.assertEqual(updated["days"][0]["activities"][0]["status"], "visited")
        self.assertEqual(updated["days"][0]["activities"][1]["id"], act1["id"])

    def test_activity_remove_preserves_remaining_ids(self):
        old = normalise_itinerary({
            "days": [
                {
                    "day_number": 1,
                    "activities": [
                        {"title": "Stop A"},
                        {"title": "Stop B"},
                        {"title": "Stop C"}
                    ]
                }
            ]
        }, trip_id=102)
        
        remaining = [old["days"][0]["activities"][0], old["days"][0]["activities"][2]]
        updated = normalise_itinerary({
            "days": [{"day_number": 1, "activities": remaining}]
        }, trip_id=102, previous=old, revision=2)
        
        self.assertEqual(len(updated["days"][0]["activities"]), 2)
        self.assertEqual(updated["days"][0]["activities"][0]["id"], old["days"][0]["activities"][0]["id"])
        self.assertEqual(updated["days"][0]["activities"][1]["id"], old["days"][0]["activities"][2]["id"])

    def test_undated_trip_cannot_be_activated(self):
        raw = {"days": [{"activities": [{"title": "Explore"}]}]}
        with self.assertRaises(ValidationError):
            normalise_itinerary(raw, status="active")

    def test_dated_trip_activation_succeeds(self):
        raw = {"days": [{"activities": [{"title": "Explore"}]}]}
        res = normalise_itinerary(raw, start_date="2027-02-01", end_date="2027-02-01", status="active")
        self.assertEqual(res["status"], "active")
        self.assertEqual(res["start_date"], "2027-02-01")


class TripUpdatesApi(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.connection = await engine.connect()
        self.transaction = await self.connection.begin()
        self.db = AsyncSession(bind=self.connection, expire_on_commit=False, join_transaction_mode="create_savepoint")
        self.owner = models.User(email="trip_owner@example.com", name="TripOwner", hashed_password="fixture")
        self.other = models.User(email="other_user@example.com", name="OtherUser", hashed_password="fixture")
        self.db.add_all([self.owner, self.other])
        await self.db.flush()

        # Seed an initial trip for owner
        initial_itinerary = normalise_itinerary({
            "days": [
                {
                    "day_number": 1,
                    "theme": "Historic Sharjah",
                    "activities": [
                        {"title": "Sharjah Art Museum", "time": "10:00"},
                        {"title": "Al Noor Mosque", "time": "14:00"}
                    ]
                }
            ]
        }, trip_id=999)
        self.trip = models.Trip(
            user_id=self.owner.id,
            title="Sharjah Culture Trip",
            destination="Sharjah",
            itinerary_data=initial_itinerary,
            duration_days=1,
            budget_tier="Moderate"
        )
        self.db.add(self.trip)
        await self.db.commit()

        self.current_user = self.owner
        async def db_override(): yield self.db
        async def user_override(): return self.current_user
        app.dependency_overrides[auth.get_db] = db_override
        app.dependency_overrides[auth.get_current_user] = user_override
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://fixture")

    async def asyncTearDown(self):
        await self.client.aclose()
        app.dependency_overrides.clear()
        await self.db.close()
        await self.transaction.rollback()
        await self.connection.close()
        await engine.dispose()

    async def test_other_user_cannot_update_trip(self):
        self.current_user = self.other
        res = await self.client.patch(f"/api/v1/trips/{self.trip.id}", json={"title": "Hacked Title"})
        self.assertEqual(res.status_code, 404)

    async def test_stale_revision_rejected_with_409(self):
        # Current revision is 1; pass expected_revision = 99
        res = await self.client.patch(f"/api/v1/trips/{self.trip.id}", json={
            "expected_revision": 99,
            "title": "New Title"
        })
        self.assertEqual(res.status_code, 409)
        self.assertIn("Conflict", res.json()["detail"])

    async def test_successful_update_increments_revision(self):
        res = await self.client.patch(f"/api/v1/trips/{self.trip.id}", json={
            "expected_revision": 1,
            "title": "Updated Cultural Journey"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["title"], "Updated Cultural Journey")
        self.assertEqual(data["revision"], 2)

    async def test_undated_trip_activation_returns_400(self):
        res = await self.client.patch(f"/api/v1/trips/{self.trip.id}", json={
            "status": "active", "expected_revision": 1
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("Undated trips cannot be activated", res.json()["detail"])

    async def test_delete_other_users_trip_is_hidden(self):
        self.current_user=self.other
        response=await self.client.delete(f'/api/v1/trips/{self.trip.id}')
        self.assertEqual(response.status_code,404)
        self.assertIsNotNone(await self.db.get(models.Trip,self.trip.id))

    async def test_delete_trip_cleans_evidence_and_keeps_awards_and_bookings(self):
        import tempfile
        from pathlib import Path
        from uuid import uuid4
        from passport.models import PassportTrip,PassportActivity,Challenge,Submission,Award,PassportEvent,uid
        from passport.service import save_image
        from tests.test_passport import test_png
        from services.booking_records import BookingOperation
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ,{'PASSPORT_EVIDENCE_DIR':folder}):
            activity=PassportActivity(id=uid(),trip_id=self.trip.id,fingerprint='fixture',day_number=1,title='Fixture',location='Fixture',active=True)
            self.db.add(activity);await self.db.flush()
            challenge=Challenge(id=uid(),user_id=self.owner.id,trip_id=self.trip.id,activity_id=activity.id,template_key='fixture-v1',state='completed',payload={'title':'Fixture challenge'})
            self.db.add(challenge);await self.db.flush()
            photo_name=save_image(self.owner.id,test_png(),'image/png')
            path=Path(folder)/str(self.owner.id)/photo_name
            submission=Submission(id=uid(),user_id=self.owner.id,challenge_id=challenge.id,idempotency_key='delete-fixture',request_hash='fixture',evidence_type='photo',text='Fixture observation',image_name=photo_name,image_type='image/png',status='accepted',feedback='Reviewed fixture')
            self.db.add(submission);await self.db.flush()
            award=Award(id=uid(),user_id=self.owner.id,trip_id=self.trip.id,challenge_id=challenge.id,submission_id=submission.id,xp=60,is_demo=False,stamp={'title':'Fixture stamp','evidence_available':True})
            booking=BookingOperation(id=str(uuid4()),user_id=self.owner.id,kind='hotel',source_key=uuid4().hex,request_digest='fixture',trip_id=self.trip.id,status='CONFIRMED',environment='sandbox',provider_reference='fixture-only')
            run=models.PlanningRun(id=uuid4().hex,user_id=self.owner.id,brief_id=uuid4().hex,brief_revision=1,brief_snapshot={},request_id=uuid4().hex,request_hash='fixture',status='completed',attempts=1,progress=[],workers=[],message='Saved',response='Saved fixture',trip_id=self.trip.id)
            notice=PassportEvent(id=uid(),user_id=self.owner.id,trip_id=self.trip.id,type='notification',title='Fixture',description='{}',is_demo=False,source_key=uuid4().hex)
            self.db.add_all([award,booking,run,notice]);await self.db.commit()
            trip_id=self.trip.id
            response=await self.client.delete(f'/api/v1/trips/{trip_id}')
            self.assertEqual(response.status_code,200,response.text)
            self.assertFalse(path.exists())
            submission_id,award_id,booking_id,run_id,notice_id=submission.id,award.id,booking.id,run.id,notice.id
            self.db.expire_all()
            self.assertIsNone(await self.db.get(models.Trip,trip_id))
            self.assertIsNone(await self.db.get(Submission,submission_id))
            saved=await self.db.get(Award,award_id)
            self.assertEqual(saved.xp,60)
            self.assertTrue(saved.stamp['trip_deleted'])
            self.assertFalse(saved.stamp['evidence_available'])
            kept=await self.db.get(BookingOperation,booking_id)
            self.assertEqual(kept.status,'CONFIRMED')
            self.assertIsNone(kept.trip_id)
            removed_run=await self.db.get(models.PlanningRun,run_id)
            self.assertEqual(removed_run.status,'cancelled')
            self.assertIsNone(removed_run.trip_id)
            self.assertIsNone(await self.db.get(PassportEvent,notice_id))


class ConcurrentTripWrites(unittest.IsolatedAsyncioTestCase):
    async def test_two_tabs_cannot_overwrite_the_same_revision(self):
        import asyncio
        from uuid import uuid4
        from database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            owner=models.User(email=f'concurrency-{uuid4().hex}@example.com',name='Fixture',hashed_password='unused')
            db.add(owner);await db.flush()
            trip=models.Trip(user_id=owner.id,title='Concurrent fixture',duration_days=1,itinerary_data=normalise_itinerary({'days':[{'activities':[{'title':'Walk'}]}]},trip_id='concurrent'))
            db.add(trip);await db.commit();owner_id,trip_id=owner.id,trip.id
        async def session():
            async with AsyncSessionLocal() as db:yield db
        async def identity():return models.User(id=owner_id)
        app.dependency_overrides[auth.get_db]=session
        app.dependency_overrides[auth.get_current_user]=identity
        try:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://fixture') as client:
                responses=await asyncio.gather(*[client.patch(f'/api/v1/trips/{trip_id}',json={'expected_revision':1,'title':title}) for title in ['First change','Second change']])
                self.assertEqual(sorted(r.status_code for r in responses),[200,409])
                final=await client.get(f'/api/v1/trips/{trip_id}')
                self.assertEqual(final.json()['revision'],2)
        finally:
            app.dependency_overrides.clear()
            async with AsyncSessionLocal() as db:
                await db.delete(await db.get(models.Trip,trip_id))
                await db.delete(await db.get(models.User,owner_id))
                await db.commit()
            await engine.dispose()
