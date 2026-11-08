"""Owner-scoped tests for Daily Promotional Challenge Wheel and Coins Ledger."""
import os
os.environ['MASAR_ENV'] = 'test'
os.environ.setdefault('DATABASE_URL', 'postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0')

import unittest
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import httpx
from sqlalchemy import select
from tests import test_passport as fixture
from passport.models import DailyPromoAssignment, DailyCoinLedger, Award
from passport import promotions as promo

DUBAI_TZ = ZoneInfo("Asia/Dubai")


class DailyPromotionsAPI(unittest.IsolatedAsyncioTestCase):
    asyncSetUp = fixture.PassportTests.asyncSetUp
    asyncTearDown = fixture.PassportTests.asyncTearDown

    async def test_today_endpoint_returns_unspun_status_and_wheel_pool(self):
        res = await self.client.get('/daily-promotions/today')
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertFalse(data['has_spun'])
        self.assertIsNone(data['assignment'])
        self.assertEqual(len(data['wheel_pool']), 7)
        self.assertNotIn('game:tourist-arcade', [sector['template_id'] for sector in data['wheel_pool']])
        self.assertEqual([sector['slot'] for sector in data['wheel_pool']], list(range(7)))
        self.assertGreater(data['seconds_remaining'], 0)
        self.assertEqual(data['coins_balance'], 0)

    async def test_spin_draws_persisted_assignment_matching_server_slot(self):
        res = await self.client.post('/daily-promotions/spin')
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        assignment = data['assignment']
        self.assertIsNotNone(assignment)
        self.assertEqual(assignment['state'], 'drawn')
        self.assertEqual(assignment['reward_coins'], 1)
        self.assertIn(assignment['kind'], {'game', 'venue'})
        self.assertEqual(data['selected_slot'], assignment['selected_slot'])

        # Second spin on the same Dubai day returns the exact same assignment
        res2 = await self.client.post('/daily-promotions/spin')
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertEqual(data2['assignment']['id'], assignment['id'])
        self.assertEqual(data2['selected_slot'], assignment['selected_slot'])

    async def test_accept_and_reject_lifecycle(self):
        spin_res = await self.client.post('/daily-promotions/spin')
        assignment_id = spin_res.json()['assignment']['id']

        # Accept
        accept_res = await self.client.post(f'/daily-promotions/{assignment_id}/accept')
        self.assertEqual(accept_res.status_code, 200)
        self.assertIn(accept_res.json()['assignment']['state'], {'accepted', 'in_progress'})

        # Rejecting makes it terminal for the day
        reject_res = await self.client.post(f'/daily-promotions/{assignment_id}/reject')
        self.assertEqual(reject_res.status_code, 200)
        self.assertEqual(reject_res.json()['assignment']['state'], 'rejected')

        # Cannot start game session on rejected assignment
        sess_res = await self.client.post(f'/daily-promotions/{assignment_id}/game-sessions')
        self.assertEqual(sess_res.status_code, 400)

    async def test_game_flow_validates_session_and_awards_coin_once(self):
        # Create a game assignment directly
        pool = promo.build_wheel_pool()
        game_slot = next(s for s in pool if s['kind'] == 'game')
        async with self.sessions() as db:
            assignment = DailyPromoAssignment(
                id='test-game-assign-1',
                user_id=1,
                dubai_day=promo.current_dubai_day(),
                template_id=game_slot['template_id'],
                kind='game',
                selected_slot=game_slot['slot'],
                wheel_pool=pool,
                template_snapshot=promo.PROMOTIONAL_TEMPLATES[game_slot['template_id']],
                state='drawn',
                coins_reward=1,
                drawn_at=datetime.now(timezone.utc),
                expires_at=promo.dubai_midnight_expiry()
            )
            db.add(assignment)
            await db.commit()

        # Start game session
        sess_res = await self.client.post(f'/daily-promotions/{assignment.id}/game-sessions')
        self.assertEqual(sess_res.status_code, 200, sess_res.text)
        session_id = sess_res.json()['session_id']

        # Fail completion due to low score
        fail_res = await self.client.post(f'/daily-promotions/{assignment.id}/game-complete', json={
            'session_id': session_id,
            'score': 10,
            'elapsed_seconds': 20,
            'details': {'parcel_delivered': False}
        })
        self.assertEqual(fail_res.status_code, 200)
        self.assertEqual(fail_res.json()['status'], 'retry')
        self.assertEqual(fail_res.json()['coins_awarded'], 0)

        # Successful completion
        success_res = await self.client.post(f'/daily-promotions/{assignment.id}/game-complete', json={
            'session_id': session_id,
            'score': 200,
            'elapsed_seconds': 45,
            'details': {'parcel_delivered': True}
        })
        self.assertEqual(success_res.status_code, 200)
        self.assertEqual(success_res.json()['status'], 'completed')
        self.assertEqual(success_res.json()['coins_awarded'], 1)
        self.assertEqual(success_res.json()['balance'], 1)

        # Duplicate complete call does not credit again
        dup_res = await self.client.post(f'/daily-promotions/{assignment.id}/game-complete', json={
            'session_id': session_id,
            'score': 200,
            'elapsed_seconds': 45,
            'details': {'parcel_delivered': True}
        })
        self.assertEqual(dup_res.status_code, 200)
        self.assertEqual(dup_res.json()['balance'], 1)

        # Coins balance endpoint returns 1
        coins_res = await self.client.get('/daily-promotions/coins')
        self.assertEqual(coins_res.json()['balance'], 1)

        # XP and awards remain 0 (separate balance)
        summary = await self.client.get('/summary')
        self.assertEqual(summary.json()['xp'], 0)

    async def test_venue_flow_reflection_submission_awards_coins(self):
        pool = promo.build_wheel_pool()
        venue_slot = next(s for s in pool if s['kind'] == 'venue')
        async with self.sessions() as db:
            assignment = DailyPromoAssignment(
                id='test-venue-assign-1',
                user_id=1,
                dubai_day=promo.current_dubai_day(),
                template_id=venue_slot['template_id'],
                kind='venue',
                selected_slot=venue_slot['slot'],
                wheel_pool=pool,
                template_snapshot=promo.PROMOTIONAL_TEMPLATES[venue_slot['template_id']],
                state='accepted',
                coins_reward=1,
                drawn_at=datetime.now(timezone.utc),
                expires_at=promo.dubai_midnight_expiry()
            )
            db.add(assignment)
            await db.commit()

        # Submit reflection
        sub_res = await self.client.post(f'/daily-promotions/{assignment.id}/submissions', json={
            'idempotency_key': 'test-venue-reflection-key-1',
            'evidence_type': 'reflection',
            'text': 'Studied the barjeel windcatchers and passive cooling architecture across Al Fahidi.',
        })
        self.assertEqual(sub_res.status_code, 200, sub_res.text)
        self.assertEqual(sub_res.json()['status'], 'completed')
        self.assertEqual(sub_res.json()['coins_awarded'], 1)
        self.assertEqual(sub_res.json()['balance'], 1)

        # History includes the record
        hist_res = await self.client.get('/daily-promotions/history')
        self.assertEqual(hist_res.status_code, 200)
        history = hist_res.json()['history']
        self.assertTrue(any(h['id'] == assignment.id for h in history))

    async def test_notifications_inbox_includes_daily_promotion(self):
        res = await self.client.get('/notifications')
        self.assertEqual(res.status_code, 200)
        notifs = res.json()['notifications']
        promo_notif = next((n for n in notifs if n.get('type') == 'daily_promotion'), None)
        self.assertIsNotNone(promo_notif)
        self.assertIn(promo_notif['action'], {'spin', 'resume', 'view'})
        self.assertEqual(promo_notif['icon'], '🎡')

    async def test_expired_game_cannot_award_even_with_live_session(self):
        session_id = 'expired-session'
        async with self.sessions() as db:
            db.add(DailyPromoAssignment(
                id='expired-game', user_id=1, dubai_day=promo.current_dubai_day(),
                template_id='game:sikka-run', kind='game', selected_slot=0,
                wheel_pool=promo.build_wheel_pool(),
                template_snapshot=promo.PROMOTIONAL_TEMPLATES['game:sikka-run'],
                state='in_progress', coins_reward=1, game_session_id=session_id,
                expires_at=datetime.now(timezone.utc)-timedelta(seconds=1)
            ))
            await db.commit()
        response = await self.client.post('/daily-promotions/expired-game/game-complete', json={
            'session_id': session_id, 'score': 200, 'elapsed_seconds': 45
        })
        self.assertEqual(response.status_code, 400, response.text)
        self.assertIn('expired', response.text)
        self.assertEqual((await self.client.get('/daily-promotions/coins')).json()['balance'], 0)
        history = (await self.client.get('/daily-promotions/history')).json()['history']
        self.assertEqual(history[0]['state'], 'expired')
        session = await self.client.post('/daily-promotions/expired-game/game-sessions')
        self.assertEqual(session.status_code, 400, session.text)

    async def test_other_games_cannot_use_sikka_delivery_to_bypass_objective(self):
        pool = promo.build_wheel_pool()
        async with self.sessions() as db:
            assignment = DailyPromoAssignment(
                id='puzzle-delivery-bypass', user_id=1, dubai_day=promo.current_dubai_day(),
                template_id='game:landmark-puzzle', kind='game', selected_slot=2, wheel_pool=pool,
                template_snapshot=promo.PROMOTIONAL_TEMPLATES['game:landmark-puzzle'],
                state='drawn', coins_reward=1, expires_at=promo.dubai_midnight_expiry()
            )
            db.add(assignment)
            await db.commit()
        session = (await self.client.post('/daily-promotions/puzzle-delivery-bypass/game-sessions')).json()
        response = await self.client.post('/daily-promotions/puzzle-delivery-bypass/game-complete', json={
            'session_id': session['session_id'], 'score': 0, 'details': {'parcel_delivered': True}
        })
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['status'], 'retry')
        self.assertEqual((await self.client.get('/daily-promotions/coins')).json()['balance'], 0)

    async def test_other_user_cannot_access_daily_assignment(self):
        assignment = (await self.client.post('/daily-promotions/spin')).json()['assignment']
        for action in ['accept', 'reject', 'game-sessions']:
            response = await self.client.post(f"/daily-promotions/{assignment['id']}/{action}", headers={'X-Test-User': '2'})
            self.assertEqual(response.status_code, 404, response.text)
