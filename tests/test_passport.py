"""API contract/lifecycle tests. Uses temporary SQLite and no external providers."""
import asyncio
from datetime import date, timedelta
from io import BytesIO
import os
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch
import zlib
from PIL import Image
from PIL.PngImagePlugin import PngInfo

from fastapi import FastAPI, Request
import httpx
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import auth
import models
from database import Base
from passport.models import Award, Challenge, PassportTrip, Submission, Voucher, utcnow
from passport.router import router
from passport.service import preserve_activity_ids, prepare_evidence_cleanup, finish_evidence_cleanup


def test_png():
    def chunk(name, payload):
        return struct.pack('>I', len(payload)) + name + payload + struct.pack('>I', zlib.crc32(name + payload) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b'\x00\xff\x00\x00')) + chunk(b'IEND', b'')


REFLECTION = 'I learned how wooden dhows connect coastal craft with community life. Pearl diving needed divers and boat crews to work together. I wonder how teamwork preserved these memories across generations.'


class PassportTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.settings = patch.dict(os.environ, {'PASSPORT_EVIDENCE_DIR': str(Path(self.temp.name, 'evidence')), 'PASSPORT_OPERATOR_KEY': 'isolated-test-operator', 'PASSPORT_AUTO_BOXING': 'false'})
        self.settings.start()
        self.engine = create_async_engine('sqlite+aiosqlite:///' + Path(self.temp.name, 'test.db').as_posix())
        @event.listens_for(self.engine.sync_engine, 'connect')
        def foreign_keys(connection, _):
            connection.execute('PRAGMA foreign_keys=ON')
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)
        async with self.sessions() as db:
            db.add_all([models.User(id=i, name=f'Traveler {i}', email=f'test{i}@example.com', hashed_password='unused') for i in [1, 2]])
            await db.commit()
        app = FastAPI()
        app.include_router(router)
        async def get_db():
            async with self.sessions() as db:
                yield db
        async def get_user(request: Request):
            i = int(request.headers.get('X-Test-User', 1))
            return models.User(id=i, name=f'Traveler {i}')
        app.dependency_overrides[auth.get_db] = get_db
        app.dependency_overrides[auth.get_current_user] = get_user
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test/api/v1/passport')

    async def asyncTearDown(self):
        await self.client.aclose()
        await self.engine.dispose()
        self.settings.stop()
        self.temp.cleanup()

    async def demo(self):
        response = await self.client.post('/demo-trip')
        self.assertEqual(response.status_code, 200, response.text)
        trip_id = response.json()['trip_id']
        return trip_id, (await self.client.get(f'/trips/{trip_id}')).json()

    async def accept(self, challenge):
        response = await self.client.post(f"/challenges/{challenge['id']}/action", json={'action': 'accept'})
        self.assertEqual(response.status_code, 200, response.text)

    async def reading(self, challenge, key='reflection-test-0001'):
        return await self.client.post(f"/challenges/{challenge['id']}/submissions", data={'evidence_type': 'reflection', 'idempotency_key': key, 'text': REFLECTION, 'choice': 'curves'})

    async def photo(self, challenge, key='photo-test-00001'):
        data={'evidence_type':'photo','idempotency_key':key,'text':'I noticed three architectural details from the permitted public path.'}
        files={'file':('test.png',test_png(),'image/png')}
        if challenge.get('required_photos') == 3:
            data['quiz_answer']='1'
            files=[('photos',(f'test{i}.png',test_png(),'image/png')) for i in range(3)]
        return await self.client.post(f"/challenges/{challenge['id']}/submissions",data=data,files=files)

    async def real_photo_challenge(self):
        async with self.sessions() as db:
            trip = models.Trip(user_id=1, title='Coastal walk', destination='Sharjah', duration_days=1, itinerary_data={'days': [{'activities': [{'title': 'Museum of the Future', 'place_id':'museum-of-the-future', 'location': 'Dubai'}]}]})
            db.add(trip)
            await db.commit()
            trip_id = trip.id
        response = await self.client.post(f'/trips/{trip_id}/activate', json={'interests': ['discovery'], 'pace': 'light'})
        challenge = response.json()['challenges'][0]
        await self.accept(challenge)
        return trip_id, challenge

    async def test_live_review_cannot_be_simulated_and_awards_once(self):
        _, challenge = await self.real_photo_challenge()
        submitted = await self.photo(challenge)
        submission_id = submitted.json()['submission']['id']
        self.assertEqual((await self.client.post(f'/submissions/{submission_id}/demo-approve')).status_code, 403)
        self.assertEqual((await self.client.get('/summary')).json()['xp'], 0)
        operator = {'X-Test-User': '2', 'X-Passport-Operator-Key': 'isolated-test-operator'}
        queue = (await self.client.get('/review/submissions', headers=operator)).json()['submissions']
        self.assertEqual(len(queue), 1)
        for _ in range(2):
            reviewed = await self.client.post(f'/review/submissions/{submission_id}', headers=operator, json={'decision': 'accepted', 'feedback': 'Meets the observation criteria.'})
            self.assertEqual(reviewed.status_code, 200, reviewed.text)
        summary = (await self.client.get('/summary')).json()
        self.assertEqual(summary['xp'], challenge['xp'])
        self.assertEqual(summary['demo_xp'], 0)
        self.assertEqual(len(summary['stamps']), 1)
        self.assertTrue(summary['badges'][0]['earned'])
        _, next_challenge = await self.real_photo_challenge()
        next_id = (await self.photo(next_challenge, 'second-live-photo')).json()['submission']['id']
        reviewed = await self.client.post(f'/review/submissions/{next_id}', headers=operator, json={'decision': 'accepted', 'feedback': 'Meets the observation criteria.'})
        self.assertTrue(any(item['type'] == 'level_up' for item in reviewed.json()['milestones']))
        self.assertEqual((await self.client.get('/summary')).json()['level']['number'], 2)

    async def test_photo_removal_is_owner_scoped_and_preserves_award(self):
        _, challenge = await self.real_photo_challenge()
        submission_id = (await self.photo(challenge)).json()['submission']['id']
        path = f'/submissions/{submission_id}/image'
        self.assertEqual((await self.client.delete(path, headers={'X-Test-User': '2'})).status_code, 404)
        await self.client.post(f'/review/submissions/{submission_id}', headers={'X-Passport-Operator-Key': 'isolated-test-operator'}, json={'decision': 'accepted', 'feedback': 'Meets challenge criteria.'})
        self.assertEqual((await self.client.delete(path)).status_code, 200)
        self.assertEqual((await self.client.get(path)).status_code, 404)
        summary = (await self.client.get('/summary')).json()
        self.assertEqual(len(summary['stamps']), 1)
        self.assertFalse(summary['stamps'][0]['evidence_available'])
        self.assertEqual(list(Path(self.temp.name, 'evidence').rglob('*.png')), [])

    async def test_photo_metadata_removed_and_withdrawal_allows_retry(self):
        trip_id, challenge = await self.real_photo_challenge()
        metadata = PngInfo()
        metadata.add_text('Location', 'private-coordinate-fixture')
        raw = BytesIO()
        Image.new('RGB', (2, 2)).save(raw, format='PNG', pnginfo=metadata)
        submitted = await self.client.post(f"/challenges/{challenge['id']}/submissions", data={'evidence_type': 'photo', 'idempotency_key': 'metadata-test-001', 'text': 'An architectural detail I noticed.', 'quiz_answer':'1'}, files=[('photos',(f'photo{i}.png',raw.getvalue(),'image/png')) for i in range(3)])
        self.assertEqual(submitted.status_code, 200, submitted.text)
        submission_id = submitted.json()['submission']['id']
        response = await self.client.get(f'/submissions/{submission_id}/image')
        self.assertNotIn(b'private-coordinate-fixture', response.content)
        with Image.open(BytesIO(response.content)) as image:
            self.assertNotIn("exif", image.info)
            self.assertNotIn("Location",image.info)
        await self.client.delete(f'/submissions/{submission_id}/image')
        state = (await self.client.get(f'/trips/{trip_id}')).json()['challenges'][0]['state']
        self.assertEqual(state, 'accepted')
        self.assertEqual((await self.photo(challenge, 'replacement-photo')).status_code, 200)

    async def test_deleting_trip_cleans_photos_but_keeps_stamp_snapshot(self):
        trip_id, challenge = await self.real_photo_challenge()
        submission_id = (await self.photo(challenge)).json()['submission']['id']
        await self.client.post(f'/review/submissions/{submission_id}', headers={'X-Passport-Operator-Key': 'isolated-test-operator'}, json={'decision': 'accepted', 'feedback': 'Meets challenge criteria.'})
        async with self.sessions() as db:
            await prepare_evidence_cleanup(db, 1, trip_id)
            await db.delete(await db.get(models.Trip, trip_id))
            await db.commit()
            finish_evidence_cleanup(db)
            self.assertIsNone(await db.get(Submission, submission_id))
        summary = (await self.client.get('/summary')).json()
        self.assertEqual(len(summary['stamps']), 1)
        self.assertTrue(summary['stamps'][0]['trip_deleted'])
        self.assertEqual(list(Path(self.temp.name, 'evidence').rglob('*.png')), [])

    async def test_concurrent_reward_claim_and_expiry(self):
        _, detail = await self.demo()
        await self.accept(detail['challenges'][0])
        await self.reading(detail['challenges'][0])
        offer = (await self.client.get('/rewards')).json()['offers'][0]
        async def claim(key):
            return await self.client.post(f"/rewards/{offer['id']}/claim", json={'idempotency_key': key})
        a, b = await asyncio.gather(claim('concurrent-claim-a'), claim('concurrent-claim-b'))
        self.assertEqual(a.status_code, 200, a.text)
        self.assertEqual(b.status_code, 200, b.text)
        self.assertEqual(a.json()['voucher']['id'], b.json()['voucher']['id'])
        voucher_id = a.json()['voucher']['id']
        async with self.sessions() as db:
            voucher = await db.get(Voucher, voucher_id)
            voucher.expires_at = utcnow() - timedelta(days=1)
            await db.commit()
        self.assertEqual((await self.client.post(f'/vouchers/{voucher_id}/demo-redeem')).status_code, 409)

    async def test_demo_full_journey_wallet_and_separate_xp(self):
        trip_id, detail = await self.demo()
        challenges = detail['challenges']
        self.assertEqual([c['state'] for c in challenges], ['available', 'locked', 'locked'])
        await self.accept(challenges[0])
        first = await self.reading(challenges[0])
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(first.json()['submission']['status'], 'accepted')
        for i in [1, 2]:
            detail = (await self.client.get(f'/trips/{trip_id}')).json()
            self.assertIn('curving line', detail['challenges'][i]['instructions'])
            await self.accept(challenges[i])
            submitted = await self.photo(challenges[i], f'photo-step-{i}-0001')
            self.assertEqual(submitted.status_code, 200, submitted.text)
            submission = submitted.json()['submission']
            self.assertEqual(submission['status'], 'pending')
            approved = await self.client.post(f"/submissions/{submission['id']}/demo-approve")
            self.assertEqual(approved.status_code, 200, approved.text)
            self.assertEqual(len(approved.json()['awards']), 1)
            if i == 2:
                self.assertTrue(any(item['type'] == 'journey_completed' for item in approved.json()['milestones']))
        summary = (await self.client.get('/summary')).json()
        self.assertEqual(summary['xp'], 0)
        self.assertEqual(summary['demo_xp'], 175)
        self.assertEqual(len(summary['stamps']), 3)
        self.assertTrue(all(stamp['is_demo'] for stamp in summary['stamps']))
        offer = (await self.client.get('/rewards')).json()['offers'][1]
        self.assertTrue(offer['eligible'])
        claimed = await self.client.post(f"/rewards/{offer['id']}/claim", json={'idempotency_key': 'claim-unique-test1'})
        voucher = claimed.json()['voucher']
        for _ in range(2):
            redeemed = await self.client.post(f"/vouchers/{voucher['id']}/demo-redeem")
            self.assertEqual(redeemed.status_code, 200, redeemed.text)
            self.assertEqual(redeemed.json()['voucher']['state'], 'redeemed')
        self.assertEqual(len((await self.client.get('/summary')).json()['stamps']), 3)

    async def test_demo_creation_and_submission_are_replay_safe(self):
        trip_id, detail = await self.demo()
        again, _ = await self.demo()
        self.assertEqual(trip_id, again)
        challenge = detail['challenges'][0]
        await self.accept(challenge)
        a, b = await asyncio.gather(self.reading(challenge), self.reading(challenge))
        self.assertEqual(a.status_code, 200, a.text)
        self.assertEqual(b.status_code, 200, b.text)
        self.assertEqual(a.json()['awards'][0]['id'], b.json()['awards'][0]['id'])
        self.assertEqual((await self.client.get('/summary')).json()['demo_xp'], 40)

    async def test_invalid_reflection_can_be_retried(self):
        _, detail = await self.demo()
        challenge = detail['challenges'][0]
        await self.accept(challenge)
        invalid = await self.client.post(f"/challenges/{challenge['id']}/submissions", data={'evidence_type': 'reflection', 'idempotency_key': 'bad-reflection-01', 'text': 'A short answer.', 'choice': 'curves'})
        self.assertEqual(invalid.json()['submission']['status'], 'rejected')
        self.assertEqual((await self.client.get('/summary')).json()['demo_xp'], 0)
        corrected = await self.reading(challenge)
        self.assertEqual(corrected.json()['submission']['status'], 'accepted')

    async def test_user_cannot_access_other_trips_or_evidence(self):
        trip_id, detail = await self.demo()
        other = {'X-Test-User': '2'}
        self.assertEqual((await self.client.get(f'/trips/{trip_id}', headers=other)).status_code, 404)
        self.assertEqual((await self.client.post(f"/challenges/{detail['challenges'][0]['id']}/action", json={'action': 'accept'}, headers=other)).status_code, 404)
        self.assertEqual((await self.client.get('/review/submissions')).status_code, 403)

    async def test_paused_and_locked_challenges_cannot_award(self):
        trip_id, detail = await self.demo()
        locked = await self.client.post(f"/challenges/{detail['challenges'][1]['id']}/action", json={'action': 'accept'})
        self.assertEqual(locked.status_code, 409)
        await self.client.post(f'/trips/{trip_id}/pause')
        paused = await self.client.post(f"/challenges/{detail['challenges'][0]['id']}/action", json={'action': 'accept'})
        self.assertEqual(paused.status_code, 409)

    async def test_schedule_requires_real_dates_and_correct_duration(self):
        trip_id, detail = await self.demo()
        cleared=await self.client.patch(f'/trips/{trip_id}',json={'expected_revision':detail['trip']['revision'],'start_date':None,'end_date':None})
        self.assertEqual(cleared.status_code,200,cleared.text)
        self.assertEqual((await self.client.get(f'/trips/{trip_id}')).json()['trip']['status'],'saved')
        start=date.today()+timedelta(days=30)
        response=await self.client.patch(f'/trips/{trip_id}',json={'expected_revision':cleared.json()['revision'],'start_date':str(start),'end_date':str(start+timedelta(days=2)),'timezone':'Asia/Dubai'})
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(response.json()['status'],'upcoming')

    async def test_reordering_preserves_challenges_and_replacement_retires(self):
        trip_id, detail = await self.demo()
        ids = {c['id'] for c in detail['challenges']}
        async with self.sessions() as db:
            trip = await db.get(models.Trip, trip_id)
            data = trip.itinerary_data
            data['days'].reverse()
            trip.itinerary_data = preserve_activity_ids(data, trip.itinerary_data)
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(trip, 'itinerary_data')
            await db.commit()
        self.assertEqual(ids, {c['id'] for c in (await self.client.get(f'/trips/{trip_id}')).json()['challenges']})
        async with self.sessions() as db:
            trip = await db.get(models.Trip, trip_id)
            data = trip.itinerary_data
            data['days'][0]['activities'][0]['title'] = 'An entirely different stop'
            trip.itinerary_data = data
            flag_modified(trip, 'itinerary_data')
            await db.commit()
        self.assertIn('retired', [c['state'] for c in (await self.client.get(f'/trips/{trip_id}')).json()['challenges']])

    async def test_forged_image_rejected_and_photo_private(self):
        trip_id, detail = await self.demo()
        await self.accept(detail['challenges'][0])
        await self.reading(detail['challenges'][0])
        challenge = detail['challenges'][1]
        await self.accept(challenge)
        bad = await self.client.post(f"/challenges/{challenge['id']}/submissions", data={'evidence_type': 'photo', 'idempotency_key': 'bad-image-00001', 'text': 'Here is my observation caption.'}, files={'file': ('fake.png', b'<script>bad</script>', 'image/png')})
        self.assertEqual(bad.status_code, 422)
        good = await self.photo(challenge)
        image_id = good.json()['submission']['id']
        self.assertEqual((await self.client.get(f'/submissions/{image_id}/image')).status_code, 200)
        self.assertEqual((await self.client.get(f'/submissions/{image_id}/image', headers={'X-Test-User': '2'})).status_code, 404)

    async def test_sikka_session_is_idempotent_owned_and_never_awards_xp(self):
        session=(await self.client.post('/games/sikka-run/sessions')).json()['session_id']
        body={'session_id':session,'elapsed_seconds':60,'score':900,'mode':'practice'}
        first=await self.client.post('/games/sikka-run/complete',json=body)
        self.assertEqual(first.status_code,200,first.text)
        self.assertEqual(first.json()['xp_awarded'],0)
        self.assertTrue(first.json()['practice_only'])
        self.assertEqual((await self.client.post('/games/sikka-run/complete',json=body)).json(),first.json())
        self.assertEqual((await self.client.post('/games/sikka-run/complete',json=body,headers={'X-Test-User':'2'})).status_code,404)
        self.assertEqual((await self.client.post('/games/ball-roll/complete',json=body)).status_code,409)
        summary=(await self.client.get('/summary')).json()
        self.assertEqual(summary['xp'],0)
        self.assertEqual(summary['stamps'],[])

    async def test_game_sessions_are_practice_only_and_isolated_per_owner(self):
        self.assertEqual((await self.client.post('/games/landmark-puzzle/complete',json={})).status_code,422)
        session=(await self.client.post('/games/landmark-puzzle/sessions')).json()['session_id']
        body={'session_id':session,'elapsed_seconds':42,'score':850,'mode':'medium'}
        one=await self.client.post('/games/landmark-puzzle/complete',json=body)
        self.assertEqual(one.status_code,200,one.text)
        self.assertEqual(one.json()['xp_awarded'],0)
        self.assertTrue(one.json()['practice_only'])
        self.assertEqual((await self.client.post('/games/landmark-puzzle/complete',json=body)).json(),one.json())
        other={'X-Test-User':'2'}
        self.assertEqual((await self.client.post('/games/landmark-puzzle/complete',json=body,headers=other)).status_code,404)
        session2=(await self.client.post('/games/landmark-puzzle/sessions',headers=other)).json()['session_id']
        body['session_id']=session2
        self.assertEqual((await self.client.post('/games/landmark-puzzle/complete',json=body,headers=other)).status_code,200)
        summary=(await self.client.get('/summary')).json()
        self.assertEqual(summary['xp'],0)
        self.assertEqual(summary['stamps'],[])
        self.assertTrue(next(g for g in (await self.client.get('/games')).json()['games'] if g['id']=='landmark-puzzle')['completed'])

    async def test_pilot_partner_offers_claim_and_custom_prefix_code(self):
        _, detail = await self.demo()
        await self.accept(detail['challenges'][0])
        await self.reading(detail['challenges'][0])

        rewards_res = await self.client.get('/rewards')
        self.assertEqual(rewards_res.status_code, 200)
        offers = rewards_res.json()['offers']
        self.assertGreaterEqual(len(offers), 5)

        gahwa_offer = next((o for o in offers if o['id'] == 'al-fahidi-gahwa-v1'), None)
        self.assertIsNotNone(gahwa_offer)
        self.assertTrue(gahwa_offer['eligible'])

        claim_res = await self.client.post(f"/rewards/{gahwa_offer['id']}/claim", json={
            'idempotency_key': 'claim-gahwa-pilot-1'
        })
        self.assertEqual(claim_res.status_code, 200)
        voucher = claim_res.json()['voucher']
        self.assertTrue(voucher['code'].startswith('DEMO-'))
        self.assertEqual(voucher['state'], 'issued')

        redeem_res = await self.client.post(f"/vouchers/{voucher['id']}/demo-redeem")
        self.assertEqual(redeem_res.status_code, 200)
        self.assertEqual(redeem_res.json()['voucher']['state'], 'redeemed')

    async def test_only_supported_landmarks_and_one_main_challenge_per_day(self):
        async with self.sessions() as db:
            trip=models.Trip(user_id=1,title='Mixed stops',duration_days=1,itinerary_data={'days':[{'activities':[{'title':'Random museum'},{'title':'Museum of the Future','id':'source-future','place_id':'museum-of-the-future'},{'title':'Burj Khalifa','place_id':'burj-khalifa'}]}]})
            db.add(trip);await db.commit();trip_id=trip.id
        detail=(await self.client.post(f'/trips/{trip_id}/activate',json={'interests':['heritage'],'pace':'balanced'})).json()
        self.assertEqual(len(detail['challenges']),1)
        challenge=detail['challenges'][0]
        self.assertEqual(challenge['landmark'],'future')
        self.assertEqual(challenge['source_activity_id'],'source-future')
        self.assertEqual(challenge['required_photos'],3)
        self.assertNotIn('correct',challenge['quiz'])

    async def test_heritage_requires_three_photos_and_correct_quiz(self):
        _,challenge=await self.real_photo_challenge()
        path=f"/challenges/{challenge['id']}/submissions"
        base={'evidence_type':'photo','idempotency_key':'heritage-three-001','text':'My three architectural discoveries from the public path.','quiz_answer':'1'}
        single=await self.client.post(path,data=base,files={'file':('one.png',test_png(),'image/png')})
        self.assertEqual(single.status_code,422)
        wrong=await self.client.post(path,data=dict(base,quiz_answer='0'),files=[('photos',(f'{i}.png',test_png(),'image/png')) for i in range(3)])
        self.assertEqual(wrong.status_code,422)
        good=await self.photo(challenge)
        self.assertEqual(good.status_code,200,good.text)
        self.assertEqual(good.json()['submission']['status'],'pending')
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)

    async def test_itinerary_dates_are_shared_with_passport(self):
        async with self.sessions() as db:
            trip=models.Trip(user_id=1,title='Dated',duration_days=1,itinerary_data={'start_date':'2026-11-01','end_date':'2026-11-01','days':[{'activities':[]}]})
            db.add(trip);await db.commit();trip_id=trip.id
        view=(await self.client.get(f'/trips/{trip_id}')).json()
        self.assertEqual(view['trip']['start_date'],'2026-11-01')
        moved=await self.client.patch(f'/trips/{trip_id}',json={'expected_revision':1,'start_date':'2026-11-05','end_date':'2026-11-05'})
        self.assertEqual(moved.status_code,200,moved.text)
        async with self.sessions() as db:
            trip=await db.get(models.Trip,trip_id)
            self.assertEqual(trip.itinerary_data['start_date'],'2026-11-05')
            self.assertEqual(trip.itinerary_data['days'][0]['date'],'2026-11-05')
        stale=await self.client.patch(f'/trips/{trip_id}',json={'expected_revision':1,'start_date':'2026-11-06','end_date':'2026-11-06'})
        self.assertEqual(stale.status_code,409)

    async def test_account_inbox_due_read_and_reschedule(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        from unittest.mock import patch
        from passport.notifications import due_reminders
        current=datetime(2026,11,1,9,45,tzinfo=ZoneInfo('Asia/Dubai'))
        async with self.sessions() as db:
            trip=models.Trip(user_id=1,title='Today',duration_days=1,itinerary_data={'status':'active','start_date':'2026-11-01','end_date':'2026-11-01','days':[{'day_number':1,'activities':[{'id':'future','title':'Museum of the Future','time':'10:00'}]}]})
            db.add(trip);await db.commit();trip_id=trip.id
        def due(t,now=None):return due_reminders(t,current)
        with patch('passport.notifications.due_reminders',side_effect=due):
            first=(await self.client.get('/notifications')).json()['notifications']
            self.assertEqual(len(first),2)
            self.assertEqual((await self.client.get('/notifications',headers={'X-Test-User':'2'})).json()['notifications'],[])
            await self.client.post('/notifications/actions',json={'action':'read_all'})
            self.assertTrue(all(n['read'] for n in (await self.client.get('/notifications')).json()['notifications']))
            async with self.sessions() as db:
                trip=await db.get(models.Trip,trip_id)
                trip.itinerary_data=dict(trip.itinerary_data,status='cancelled');await db.commit()
            self.assertEqual((await self.client.get('/notifications')).json()['notifications'],[])



    async def test_mall_defaults_and_boxing_evidence_use_the_same_task(self):
        async with self.sessions() as db:
            trip = models.Trip(user_id=1, title='Mall challenge tour', destination='Dubai', duration_days=2, itinerary_data={'days': [
                {'day_number':1,'activities':[{'title':'Palm mall','place_id':'palm-jumeirah-mall','location':'Dubai'}]},
                {'day_number':2,'activities':[{'title':'Festival mall','place_id':'dubai-festival-city-mall','location':'Dubai'}]}
            ]})
            db.add(trip)
            await db.commit()
            trip_id=trip.id
        response=await self.client.post(f'/trips/{trip_id}/activate',json={'interests':['adventure'],'pace':'balanced'})
        self.assertEqual(response.status_code,200,response.text)
        challenges=[c for c in response.json()['challenges'] if c['state']!='retired']
        self.assertEqual([c['landmark'] for c in challenges],['boxing','bowling'])
        await self.accept(challenges[0])
        submitted=await self.photo(challenges[0],'boxing-evidence-fixture')
        self.assertEqual(submitted.status_code,200,submitted.text)
        self.assertEqual(submitted.json()['submission']['status'],'pending')
        refreshed=await self.client.post(f'/trips/{trip_id}/activate',json={'interests':['adventure'],'pace':'balanced'})
        self.assertEqual(refreshed.status_code,200,refreshed.text)
        tasks=[c for c in refreshed.json()['challenges'] if c['state']!='retired']
        self.assertEqual(tasks[0]['id'],challenges[0]['id'])
        self.assertEqual(tasks[0]['landmark'],'boxing')
        self.assertEqual(tasks[0]['state'],'pending')
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)

if __name__ == '__main__':
    unittest.main()
