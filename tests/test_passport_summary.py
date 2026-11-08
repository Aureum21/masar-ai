"""Dashboard reads stay bounded as the number of saved trips grows."""
from datetime import date, timedelta
from unittest.mock import patch
from sqlalchemy import event, select, func
import models
from passport.models import PassportTrip
from passport import service
import tests.test_passport as fixture
import unittest


class SummaryTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp = fixture.PassportTests.asyncSetUp
    asyncTearDown = fixture.PassportTests.asyncTearDown
    demo = fixture.PassportTests.demo

    async def test_many_trips_use_four_read_queries_without_sidecar_writes_or_user_lock(self):
        tomorrow = (date.today() + timedelta(days=2)).isoformat()
        end = (date.today() + timedelta(days=3)).isoformat()
        async with self.sessions() as db:
            db.add_all([models.Trip(user_id=1, title=f'Trip {i}', itinerary_data={'start_date':tomorrow,'end_date':end,'revision':3,'days':[]}) for i in range(25)])
            db.add(models.Trip(user_id=2,title='Other user',itinerary_data={}))
            await db.commit()
        statements = []
        def capture(conn, cursor, statement, params, context, many):
            statements.append(statement)
        event.listen(self.engine.sync_engine, 'before_cursor_execute', capture)
        try:
            with patch.object(service, 'user_lock', side_effect=AssertionError('summary must not lock')):
                response = await self.client.get('/summary')
        finally:
            event.remove(self.engine.sync_engine, 'before_cursor_execute', capture)
        self.assertEqual(response.status_code,200,response.text)
        data=response.json()
        self.assertEqual(data['stats']['trips'],25)
        self.assertEqual(len(data['active_trips']),25)
        self.assertEqual(data['active_trips'][0]['revision'],3)
        self.assertEqual(data['active_trips'][0]['start_date'],tomorrow)
        self.assertEqual(data['active_trips'][0]['status'],'upcoming')
        self.assertEqual(data['active_trips'][0]['progress'],{'completed':0,'total':0})
        self.assertEqual(len(statements),4,statements)
        self.assertTrue(all(statement.lstrip().upper().startswith('SELECT') for statement in statements))
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(PassportTrip)),0)

    async def test_existing_challenge_progress_matches_trip_detail(self):
        trip_id, detail = await self.demo()
        summary=(await self.client.get('/summary')).json()
        actual=next(trip for trip in summary['active_trips'] if trip['id']==trip_id)
        async with self.sessions() as db:
            expected=await service.trip_view(db,await db.get(models.Trip,trip_id))
        self.assertEqual(actual,expected)
