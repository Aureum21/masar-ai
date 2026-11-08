"""Automatic evidence contracts: real DB transactions, fake model observations."""
import unittest
from unittest.mock import patch, Mock
from sqlalchemy import select
import models
from passport.boxing_rules import assess, LABELS
from passport.models import Challenge, Submission, Award, EvidenceCheck, EvidenceUse
from passport.verification import claim, process, finish
import tests.test_passport as fixture


def observations(score=742):
    return {'scores':[.94,.01,.01,.03,.01,.01], 'lines':[
        {'text':str(score),'score':.99,'polygon':[[20,20],[80,20],[80,50],[20,50]]},
        {'text':'BEAT 600','score':.99,'polygon':[[10,200],[90,200],[90,220],[10,220]]}]}


class BoxingRulesTests(unittest.TestCase):
    def test_additive_migration_preserves_old_submissions(self):
        import importlib.util
        from pathlib import Path
        from sqlalchemy import create_engine, text, inspect
        from alembic.migration import MigrationContext
        from alembic.operations import Operations
        path=Path(__file__).resolve().parents[1]/'alembic/versions/20261027_evidence.py'
        spec=importlib.util.spec_from_file_location('evidence_migration',path)
        migration=importlib.util.module_from_spec(spec);spec.loader.exec_module(migration)
        engine=create_engine('sqlite://')
        with engine.begin() as connection:
            connection.execute(text('CREATE TABLE users (id INTEGER PRIMARY KEY)'))
            connection.execute(text('CREATE TABLE passport_submissions (id VARCHAR(32) PRIMARY KEY, status VARCHAR(20))'))
            connection.execute(text("INSERT INTO passport_submissions VALUES ('legacy','pending')"))
            with patch.object(migration,'op',Operations(MigrationContext.configure(connection))):
                migration.upgrade()
                self.assertIn('verification',[c['name'] for c in inspect(connection).get_columns('passport_submissions')])
                self.assertEqual(connection.scalar(text("SELECT status FROM passport_submissions WHERE id='legacy'")),'pending')
                migration.downgrade()
                self.assertEqual(connection.scalar(text('SELECT count(*) FROM passport_submissions')),1)
        engine.dispose()

    def test_require_matching_current_result_not_highest_number(self):
        data=observations()
        self.assertEqual(assess(**data,declared_score=742)['decision'],'accept')
        self.assertEqual(assess(**data,declared_score=999)['decision'],'retry')
        self.assertEqual(assess(**data,declared_score=600)['decision'],'reject')
        data['lines'][0]['score']=.7
        self.assertEqual(assess(**data,declared_score=742)['decision'],'retry')

    def test_high_score_and_wrong_scene_do_not_award(self):
        data=observations()
        data['lines'].append({'text':'HIGH SCORE','score':.99,'polygon':[[10,2],[90,2],[90,16],[10,16]]})
        self.assertEqual(assess(**data,declared_score=742)['decision'],'retry')
        data['scores']=[.1,.01,.01,.02,.95,.03]
        self.assertEqual(assess(**data,declared_score=742)['decision'],'reject')
        data['scores']=[.9,.6,.01,.01,.01,.01]
        self.assertEqual(assess(**data,declared_score=742)['decision'],'retry')


class DemoBoxingRulesTests(unittest.TestCase):
    def test_screenshot_with_matching_score_passes_only_light_profile(self):
        data=observations()
        data['scores']=[.68,.92,.40,.04,.02,.03]
        data['lines'][0].update(text='SCORE: 742',score=.80)
        self.assertEqual(assess(**data,declared_score=742)['decision'],'retry')
        report=assess(**data,declared_score=742,evaluation_profile='demo')
        self.assertEqual(report['decision'],'accept')
        self.assertEqual(report['policy'],'boxing-vision-demo-v1')

    def test_light_profile_still_requires_machine_and_exact_readable_score(self):
        data=observations()
        for wrong in [[.1,.01,.01,.9,.1,.1],[.4,.01,.01,.1,.8,.1],[.1,.01,.01,.1,.1,.95]]:
            self.assertEqual(assess(wrong,data['lines'],742,evaluation_profile='demo')['decision'],'reject')
        self.assertEqual(assess(**data,declared_score=999,evaluation_profile='demo')['decision'],'retry')
        self.assertEqual(assess(**data,declared_score=600,evaluation_profile='demo')['decision'],'reject')
        data['lines'][0]['text']='1742'
        self.assertEqual(assess(**data,declared_score=742,evaluation_profile='demo')['decision'],'retry')
        data['lines'][0].update(text='742',score=.69)
        self.assertEqual(assess(**data,declared_score=742,evaluation_profile='demo')['decision'],'retry')
        with self.assertRaises(ValueError):assess(**data,declared_score=742,evaluation_profile='unknown')


class AutomaticBoxingTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp=fixture.PassportTests.asyncSetUp
    asyncTearDown=fixture.PassportTests.asyncTearDown
    accept=fixture.PassportTests.accept

    async def setup_boxing(self):
        async with self.sessions() as db:
            trip=models.Trip(user_id=1,title='Mall attempt',destination='Dubai',duration_days=1,
                itinerary_data={'days':[{'day_number':1,'activities':[{'title':'Palm mall',
                    'place_id':'palm-jumeirah-mall','location':'Dubai'}]}]})
            db.add(trip);await db.commit();trip_id=trip.id
        with patch.dict('os.environ',{'PASSPORT_AUTO_BOXING':'true'}):
            response=await self.client.post(f'/trips/{trip_id}/activate',json={'interests':['adventure'],'pace':'light'})
        self.assertEqual(response.status_code,200,response.text)
        challenge=response.json()['challenges'][0]
        self.assertEqual(challenge['verification_mode'],'automatic_boxing')
        await self.accept(challenge)
        return trip_id,challenge

    async def send(self,challenge,key='auto-boxing-0001',**override):
        data={'evidence_type':'photo','idempotency_key':key,'text':'My own attempt at the listed mall machine.',
              'boxing_score':'742','machine_confirmed':'true','own_photo_confirmed':'true'}|override
        with patch.dict('os.environ',{'PASSPORT_AUTO_BOXING':'true'}):
            return await self.client.post(f"/challenges/{challenge['id']}/submissions",data=data,
                files={'file':('score.png',fixture.test_png(),'image/png')})

    async def test_status_tracks_queue_claim_and_expired_lease(self):
        from datetime import timedelta
        from passport.models import utcnow
        trip_id,challenge=await self.setup_boxing()
        submission=(await self.send(challenge)).json()['submission']
        path=f"/submissions/{submission['id']}"
        self.assertEqual((await self.client.get(path)).json()['submission']['verification']['state'],'queued')
        job=await claim(self.sessions)
        self.assertEqual((await self.client.get(path)).json()['submission']['verification']['state'],'running')
        detail=(await self.client.get(f'/trips/{trip_id}')).json()
        self.assertEqual(detail['challenges'][0]['latest_submission']['verification']['state'],'running')
        async with self.sessions() as db:
            check=await db.get(EvidenceCheck,submission['id'])
            check.lease_until=utcnow()-timedelta(seconds=1)
            await db.commit()
        current=(await self.client.get(path)).json()['submission']
        self.assertEqual(current['status'],'pending')
        self.assertEqual(current['verification']['state'],'reconnecting')
        replacement=await claim(self.sessions)
        await process(self.sessions,*job,analyser=lambda _:observations())
        self.assertEqual((await self.client.get(path)).json()['submission']['status'],'pending')
        await process(self.sessions,*replacement,analyser=lambda _:observations())
        self.assertEqual((await self.client.get(path)).json()['submission']['status'],'accepted')

    async def test_demo_profile_requires_server_opt_in(self):
        _,challenge=await self.setup_boxing()
        with patch.dict('os.environ',{'PASSPORT_BOXING_DEMO_ALLOWED':'false'}):
            self.assertEqual((await self.send(challenge,evaluation_profile='demo')).status_code,403)
        self.assertEqual((await self.send(challenge,evaluation_profile='unknown')).status_code,422)

    async def test_light_screenshot_awards_main_xp_once_with_reuse_protection(self):
        with patch.dict('os.environ',{'PASSPORT_BOXING_DEMO_ALLOWED':'true'}):
            _,challenge=await self.setup_boxing()
            self.assertEqual(challenge['evaluation_profiles'],['strict','demo'])
            submission=(await self.send(challenge,evaluation_profile='demo')).json()['submission']
        self.assertEqual(submission['verification']['evaluation_profile'],'demo')
        job=await claim(self.sessions)
        data=observations();data['scores']=[.68,.92,.4,.04,.02,.03];data['lines'][0]['score']=.8
        with patch('passport.verification.known_render',return_value=True):
            await process(self.sessions,*job,analyser=lambda _:data)
        result=(await self.client.get(f"/submissions/{submission['id']}")).json()
        self.assertEqual(result['submission']['status'],'accepted',result)
        self.assertFalse(result['awards'][0]['is_demo'])
        self.assertFalse(result['submission']['verification']['reward_is_demo'])
        summary=(await self.client.get('/summary')).json()
        self.assertEqual(summary['xp'],challenge['xp'])
        self.assertEqual(summary['demo_xp'],0)
        await process(self.sessions,*job,analyser=lambda _:data)
        again=(await self.client.get('/summary')).json()
        self.assertEqual(again['xp'],challenge['xp'])
        self.assertEqual(again['demo_xp'],0)
        async with self.sessions() as db:
            self.assertIsNotNone(await db.scalar(select(EvidenceUse)))

    async def test_automatic_award_once_and_private_polling(self):
        _,challenge=await self.setup_boxing()
        invalid=await self.send(challenge,machine_confirmed='false')
        self.assertEqual(invalid.status_code,422)
        response=await self.send(challenge)
        self.assertEqual(response.status_code,200,response.text)
        submission=response.json()['submission'];self.assertEqual(submission['status'],'pending')
        self.assertEqual(submission['verification']['state'],'queued')
        self.assertEqual((await self.client.get(f"/submissions/{submission['id']}",headers={'X-Test-User':'2'})).status_code,404)
        job=await claim(self.sessions)
        await process(self.sessions,*job,analyser=lambda _:observations())
        result=(await self.client.get(f"/submissions/{submission['id']}")).json()
        self.assertEqual(result['submission']['status'],'accepted',result)
        self.assertEqual(len(result['awards']),1)
        self.assertEqual(result['awards'][0]['verification'],'automatic photo content check')
        await process(self.sessions,*job,analyser=lambda _:observations())
        replay=await self.send(challenge)
        self.assertEqual(replay.json()['submission']['status'],'accepted')
        self.assertEqual((await self.send(challenge,boxing_score='743')).status_code,409)
        summary=(await self.client.get('/summary')).json()
        self.assertEqual(summary['xp'],challenge['xp'])
        notices=(await self.client.get('/notifications')).json()['notifications']
        self.assertTrue(any(n['type']=='challenge_result' for n in notices))

    async def test_reused_photo_cannot_earn_for_another_trip(self):
        _,first=await self.setup_boxing();await self.send(first)
        await process(self.sessions,*(await claim(self.sessions)),analyser=lambda _:observations())
        _,second=await self.setup_boxing()
        response=await self.send(second,'auto-boxing-second')
        await process(self.sessions,*(await claim(self.sessions)),analyser=lambda _:observations())
        result=(await self.client.get('/submissions/'+response.json()['submission']['id'])).json()
        self.assertEqual(result['submission']['verification']['decision'],'reject')
        self.assertEqual(len((await self.client.get('/summary')).json()['stamps']),1)

    async def test_model_failure_and_removed_photo_never_award(self):
        _,challenge=await self.setup_boxing();response=await self.send(challenge)
        job=await claim(self.sessions)
        def unavailable(_):raise RuntimeError('runtime unavailable')
        await process(self.sessions,*job,analyser=unavailable)
        result=(await self.client.get('/submissions/'+response.json()['submission']['id'])).json()['submission']
        self.assertEqual(result['verification']['decision'],'retry')
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)
        response=await self.send(challenge,'auto-boxing-retake');job=await claim(self.sessions)
        await self.client.delete('/submissions/'+response.json()['submission']['id']+'/image')
        await process(self.sessions,*job,analyser=lambda _:observations())
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)

    async def test_stale_worker_and_paused_challenge_never_award(self):
        trip_id,challenge=await self.setup_boxing();response=await self.send(challenge)
        job=await claim(self.sessions)
        report={'decision':'accept','feedback':'Matched'}
        await finish(self.sessions,job[0],'superseded-token',report)
        self.assertEqual((await self.client.get('/submissions/'+job[0])).json()['submission']['status'],'pending')
        await self.client.post(f'/trips/{trip_id}/pause')
        await finish(self.sessions,*job,report)
        result=(await self.client.get('/submissions/'+response.json()['submission']['id'])).json()['submission']
        self.assertEqual(result['verification']['decision'],'retry')
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)

    async def test_crashed_worker_lease_can_be_reclaimed(self):
        from datetime import timedelta
        from passport.models import utcnow
        _,challenge=await self.setup_boxing();await self.send(challenge)
        previous=await claim(self.sessions)
        async with self.sessions() as db:
            job=await db.get(EvidenceCheck,previous[0]);job.lease_until=utcnow()-timedelta(seconds=1)
            await db.commit()
        current=await claim(self.sessions)
        self.assertEqual(current[0],previous[0]);self.assertNotEqual(current[1],previous[1])
        await process(self.sessions,*previous,analyser=lambda _:observations())
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)
        await process(self.sessions,*current,analyser=lambda _:observations())
        self.assertEqual((await self.client.get('/summary')).json()['xp'],challenge['xp'])

    async def test_known_demo_photo_never_calls_model(self):
        _,challenge=await self.setup_boxing();await self.send(challenge)
        never=Mock(side_effect=AssertionError('Known demo should be filtered before model inference'))
        with patch('passport.verification.known_render',return_value=True):
            await process(self.sessions,*(await claim(self.sessions)),analyser=never)
        never.assert_not_called()
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)


if __name__=='__main__':unittest.main()
