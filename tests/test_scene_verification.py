"""Real temporary DB/queue and deterministic model observations; no accuracy claims."""
import unittest
from unittest.mock import patch
from datetime import timedelta
from io import BytesIO
from PIL import Image
from sqlalchemy import select, func
import models
from passport import evaluators
from passport.scene_rules import capture_facts
from passport.catalogue import heritage_for
from passport.models import Submission, EvidenceCheck, EvidencePhotoUse, Award, utcnow
from passport.verification import claim, process, finish
from passport.vision_models import analyse_evidence
import tests.test_passport as fixture


def photo(color):
    output=BytesIO();Image.new('RGB',(90,110),color).save(output,format='PNG');return output.getvalue()

def observed(scores=None):
    return {'scores':scores or [.94,.01,.01,.02,.02,.01],'lines':[]}


class SceneRulesTests(unittest.TestCase):
    def test_each_scene_has_positive_negative_uncertain_and_light_rules(self):
        for key in ('sunset-seeker','burj-khalifa','dubai-frame'):
            evaluator=evaluators.REGISTRY[key]
            with self.subTest(key=key):
                self.assertEqual(evaluator.assess(observed(),'strict')['decision'],'accept')
                self.assertEqual(evaluator.assess(observed([.1,.01,.01,.95,.02,.01]),'strict')['decision'],'reject')
                self.assertEqual(evaluator.assess(observed([.5,.01,.01,.46,.02,.01]),'strict')['decision'],'retry')
                screenshot=observed([.68,.92,.4,.03,.02,.01])
                self.assertEqual(evaluator.assess(screenshot,'strict')['decision'],'retry')
                self.assertEqual(evaluator.assess(screenshot,'demo')['decision'],'accept')
                self.assertNotEqual(evaluator.policy('strict'),evaluator.policy('demo'))
                with self.assertRaises(ValueError):evaluator.assess(observed([float('nan')]*6),'demo')

    def test_sunset_declarations_and_window_are_not_verified_metadata(self):
        window={'date':'2026-10-28','start':'17:30','end':'18:30'}
        facts=capture_facts('2026-10-28T18:00:00+04:00','Kite Beach',window)
        self.assertEqual(facts['capture_source'],'user_declared')
        for time,place in [('2026-10-28T14:00:00+04:00','Kite Beach'),('bad','Kite Beach'),('2026-10-28T18:00:00','Kite Beach'),('2026-10-28T18:00:00+04:00','')]:
            with self.assertRaises(ValueError):capture_facts(time,place,window)

    def test_frame_template_and_trusted_registry_leave_other_landmarks_manual(self):
        frame=heritage_for({'place_id':'dubai-frame'})
        self.assertFalse(frame['animation_available'])
        self.assertEqual(frame['required_photos'],3)
        self.assertEqual(evaluators.resolve(frame).key,'dubai-frame')
        self.assertIsNone(evaluators.resolve(heritage_for({'place_id':'museum-of-the-future'})))
        self.assertIsNone(evaluators.resolve({'title':'Burj Khalifa','place_id':'unrelated'}))

    def test_scene_models_are_cached_across_types_and_ocr_loaded_only_for_boxing(self):
        import sys, tempfile
        from pathlib import Path
        from types import SimpleNamespace
        from contextlib import nullcontext
        from passport import vision_models as vision
        calls={'processor':0,'model':0,'ocr':0}
        class Model:
            def eval(self):return self
            def __call__(self,**kwargs):return SimpleNamespace(logits_per_image=[[.9]*6])
        def processor(*args,**kwargs):
            calls['processor']+=1
            return lambda **inputs:{}
        def model(*args,**kwargs):calls['model']+=1;return Model()
        class OCR:
            def __init__(self,**kwargs):calls['ocr']+=1
            def predict(self,image):return []
        fake_torch=SimpleNamespace(set_num_threads=lambda _:None,inference_mode=nullcontext,
            sigmoid=lambda _:SimpleNamespace(tolist=lambda:[.9]*6))
        fake_transformers=SimpleNamespace(AutoProcessor=SimpleNamespace(from_pretrained=processor),AutoModel=SimpleNamespace(from_pretrained=model))
        with tempfile.TemporaryDirectory() as temp,patch.dict(vision._models,{},clear=True),patch.dict(sys.modules,{'torch':fake_torch,'transformers':fake_transformers,'paddleocr':None}):
            path=Path(temp)/'sample.png';path.write_bytes(photo('red'))
            for key in ('burj-khalifa','sunset-seeker','dubai-frame'):
                vision.analyse_scene(path,evaluators.REGISTRY[key].labels)
            self.assertEqual(calls,{'processor':1,'model':1,'ocr':0})
            with patch.dict(sys.modules,{'paddleocr':SimpleNamespace(PaddleOCR=OCR)}):
                vision.analyse_boxing(path);vision.analyse_boxing(path)
            self.assertEqual(calls,{'processor':1,'model':1,'ocr':1})

    def test_additive_receipt_migration_keeps_existing_queue_and_receipts(self):
        import importlib.util
        from pathlib import Path
        from sqlalchemy import create_engine,text,inspect
        from alembic.migration import MigrationContext
        from alembic.operations import Operations
        path=Path(__file__).resolve().parents[1]/'alembic/versions/20261028_scene_evidence.py'
        spec=importlib.util.spec_from_file_location('scene_migration',path);migration=importlib.util.module_from_spec(spec);spec.loader.exec_module(migration)
        engine=create_engine('sqlite://')
        with engine.begin() as connection:
            connection.execute(text('CREATE TABLE passport_evidence_uses (image_sha VARCHAR(64) PRIMARY KEY, submission_id VARCHAR(32))'))
            connection.execute(text("INSERT INTO passport_evidence_uses VALUES ('old-hash','old-submission')"))
            with patch.object(migration,'op',Operations(MigrationContext.configure(connection))):
                migration.upgrade()
                self.assertIn('passport_evidence_photo_uses',inspect(connection).get_table_names())
                self.assertEqual(connection.scalar(text('SELECT count(*) FROM passport_evidence_uses')),1)
                migration.downgrade()
                self.assertEqual(connection.scalar(text('SELECT count(*) FROM passport_evidence_uses')),1)
        engine.dispose()

    def test_individual_tiles_use_the_shared_analyser_without_ocr(self):
        boxes=[[0,i*750,1000,(i+1)*750] for i in range(3)]
        with patch('passport.vision_models.analyse_scene',return_value=observed()) as analyse:
            result=analyse_evidence('contact-sheet.jpg',evaluators.REGISTRY['burj-khalifa'],boxes)
        self.assertEqual(len(result),3)
        self.assertEqual([call.kwargs['box'] for call in analyse.call_args_list],boxes)
        self.assertTrue(all(call.kwargs['ocr'] is False for call in analyse.call_args_list))


class SceneQueueTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp=fixture.PassportTests.asyncSetUp
    asyncTearDown=fixture.PassportTests.asyncTearDown
    accept=fixture.PassportTests.accept

    async def setup_scene(self,key='burj-khalifa'):
        self.settings_scene=patch.dict('os.environ',{'PASSPORT_AUTO_SCENES':'true','PASSPORT_VISION_LIGHT_ALLOWED':'true'})
        self.settings_scene.start();self.addCleanup(self.settings_scene.stop)
        item={'title':key,'place_id':key,'location':'Dubai'}
        if key=='sunset-seeker':
            item.update(title='Kite Beach',place_id='kite-beach',challenge={'key':'sunset-seeker','place_id':'kite-beach'})
        async with self.sessions() as db:
            trip=models.Trip(user_id=1,title='Scene evidence test',destination='Dubai',duration_days=1,itinerary_data={'days':[{'activities':[item]}]})
            db.add(trip);await db.commit();trip_id=trip.id
        response=await self.client.post(f'/trips/{trip_id}/activate',json={'interests':['heritage'],'pace':'light'})
        self.assertEqual(response.status_code,200,response.text)
        challenge=response.json()['challenges'][0]
        self.assertEqual(challenge['verification_mode'],'automatic_scene')
        await self.accept(challenge)
        return trip_id,challenge

    async def send(self,challenge,key='scene-test-0001',colors=('red','green','blue'),quiz='0',profile='strict',extra=None):
        data={'evidence_type':'photo','idempotency_key':key,'text':'My discovery photographs at this planned destination.','own_photo_confirmed':'true','evaluation_profile':profile}
        if challenge.get('required_photos')==3:
            data['quiz_answer']=quiz
            files=[('photos',(str(i)+'.png',photo(color),'image/png')) for i,color in enumerate(colors)]
        else:
            data.update(captured_at='2026-10-28T18:00:00+04:00',capture_location='Kite Beach')
            files={'file':('sunset.png',photo(colors[0]),'image/png')}
        data.update(extra or {})
        return await self.client.post(f"/challenges/{challenge['id']}/submissions",data=data,files=files)

    async def test_landmark_all_photos_and_quiz_required_and_award_exactly_once(self):
        _,challenge=await self.setup_scene()
        self.assertEqual((await self.send(challenge,colors=('red','green'))).status_code,422)
        self.assertEqual((await self.send(challenge,quiz='1')).status_code,422)
        self.assertEqual((await self.send(challenge,colors=('red','red','blue'))).status_code,422)
        response=await self.send(challenge)
        self.assertEqual(response.status_code,200,response.text)
        submitted=response.json()['submission'];job=await claim(self.sessions)
        self.assertEqual(submitted['verification']['photo_count'],3)
        calls=[]
        def analyse(path):
            with Image.open(path) as sheet:
                calls.extend(sheet.getpixel((500,375+i*750)) for i in range(3))
            return [observed() for _ in range(3)]
        await process(self.sessions,*job,analyser=analyse)
        await process(self.sessions,*job,analyser=analyse)
        self.assertEqual(len(calls),3)
        self.assertTrue(calls[0][0]>calls[0][1])
        self.assertTrue(calls[1][1]>calls[1][0])
        summary=(await self.client.get('/summary')).json()
        self.assertEqual(summary['xp'],challenge['xp'])
        self.assertEqual(summary['demo_xp'],0)
        self.assertEqual(len(summary['stamps']),1)
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(EvidencePhotoUse)),4)
        replay=await self.send(challenge)
        self.assertEqual(replay.json()['submission']['id'],submitted['id'])

    async def test_one_wrong_photo_blocks_all_rewards_then_light_retake_can_pass(self):
        _,challenge=await self.setup_scene('dubai-frame')
        response=await self.send(challenge);job=await claim(self.sessions)
        await process(self.sessions,*job,analyser=lambda _:[observed(),observed([.1,.01,.01,.95,.01,.01]),observed()])
        result=(await self.client.get('/submissions/'+job[0])).json()['submission']
        self.assertEqual(result['status'],'rejected');self.assertIn('Photo 2:',result['feedback'])
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)
        response=await self.send(challenge,key='frame-light-retry',profile='demo');job=await claim(self.sessions)
        await process(self.sessions,*job,analyser=lambda _:[observed([.68,.9,.2,.02,.01,.01]) for i in range(3)])
        summary=(await self.client.get('/summary')).json()
        self.assertEqual(summary['xp'],challenge['xp']);self.assertEqual(summary['demo_xp'],0)
        result=(await self.client.get('/submissions/'+job[0])).json()['submission']
        self.assertEqual(result['verification']['policy'],'dubai-frame-vision-light-v1')

    async def test_reordered_or_partly_reused_contact_sheet_cannot_award_twice(self):
        _,challenge=await self.setup_scene();await self.send(challenge);job=await claim(self.sessions)
        await process(self.sessions,*job,analyser=lambda _:[observed() for i in range(3)])
        _,other=await self.setup_scene('dubai-frame')
        await self.send(other,key='reused-photo-0001',colors=('blue','yellow','purple'))
        job=await claim(self.sessions)
        def must_not_run(_):raise AssertionError('Reused source must be rejected before inference')
        await process(self.sessions,*job,analyser=must_not_run)
        result=(await self.client.get('/submissions/'+job[0])).json()['submission']
        self.assertEqual(result['verification']['decision'],'reject')
        self.assertEqual((await self.client.get('/summary')).json()['xp'],challenge['xp'])

    async def test_sunset_requires_declarations_and_worker_reclaim_preserves_main_xp(self):
        _,challenge=await self.setup_scene('sunset-seeker')
        self.assertEqual((await self.send(challenge,extra={'captured_at':''})).status_code,422)
        self.assertEqual((await self.send(challenge,extra={'own_photo_confirmed':'false'})).status_code,422)
        response=await self.send(challenge,profile='demo')
        self.assertEqual(response.status_code,200,response.text)
        old=await claim(self.sessions)
        async with self.sessions() as db:
            job=await db.get(EvidenceCheck,old[0]);job.lease_until=utcnow()-timedelta(seconds=1);await db.commit()
        current=await claim(self.sessions)
        self.assertNotEqual(old[1],current[1])
        await finish(self.sessions,*old,{'decision':'accept','feedback':'Superseded'})
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)
        await process(self.sessions,*current,analyser=lambda _:observed())
        result=(await self.client.get('/submissions/'+current[0])).json()['submission']
        self.assertEqual(result['status'],'accepted')
        self.assertEqual(result['verification']['facts']['capture_source'],'user_declared')
        self.assertFalse(result['verification']['reward_is_demo'])
        self.assertEqual((await self.client.get('/summary')).json()['xp'],challenge['xp'])

    async def test_missing_individual_observations_retry_instead_of_accept(self):
        _,challenge=await self.setup_scene();await self.send(challenge);job=await claim(self.sessions)
        await process(self.sessions,*job,analyser=lambda _:observed())
        result=(await self.client.get('/submissions/'+job[0])).json()['submission']
        self.assertEqual(result['verification']['decision'],'retry')
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)

    async def test_auto_scene_switch_off_and_unsupported_subject_stay_manual(self):
        with patch.dict('os.environ',{'PASSPORT_AUTO_SCENES':'false'}):
            self.assertEqual(evaluators.mode_for(heritage_for({'place_id':'burj-khalifa'})),'manual')
        _,challenge=await self.setup_scene('dubai-frame')
        with patch.dict('os.environ',{'PASSPORT_AUTO_SCENES':'false'}):
            response=await self.send(challenge)
        self.assertEqual(response.status_code,200,response.text)
        self.assertIsNone(response.json()['submission']['verification'])
        self.assertIsNone(await claim(self.sessions))
        self.assertEqual(evaluators.mode_for({'challenge_key':'bowling'}),'manual')

    async def test_new_landmark_receipts_are_owner_scoped_and_private(self):
        _,challenge=await self.setup_scene('dubai-frame');response=await self.send(challenge)
        sid=response.json()['submission']['id']
        self.assertEqual((await self.client.get('/submissions/'+sid,headers={'X-Test-User':'2'})).status_code,404)
        self.assertEqual((await self.client.get('/submissions/'+sid+'/image',headers={'X-Test-User':'2'})).status_code,404)
        self.assertEqual((await self.client.get('/submissions/'+sid+'/image')).status_code,200)

    async def test_policy_change_and_removed_image_never_award(self):
        _,challenge=await self.setup_scene();await self.send(challenge);job=await claim(self.sessions)
        async with self.sessions() as db:
            submission=await db.get(Submission,job[0]);submission.verification=dict(submission.verification,policy='unknown-policy');await db.commit()
        await process(self.sessions,*job,analyser=lambda _:[observed() for i in range(3)])
        result=(await self.client.get('/submissions/'+job[0])).json()['submission']
        self.assertEqual(result['verification']['decision'],'retry')
        await self.send(challenge,key='scene-removed-photo');job=await claim(self.sessions)
        await self.client.delete('/submissions/'+job[0]+'/image')
        await process(self.sessions,*job,analyser=lambda _:[observed() for i in range(3)])
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)

    async def test_legacy_queued_boxing_without_registry_fields_still_awards_once(self):
        from tests.test_boxing_verification import AutomaticBoxingTests, observations
        _,challenge=await AutomaticBoxingTests.setup_boxing(self)
        response=await AutomaticBoxingTests.send(self,challenge)
        self.assertEqual(response.status_code,200,response.text)
        sid=response.json()['submission']['id']
        async with self.sessions() as db:
            submission=await db.get(Submission,sid)
            submission.verification={key:value for key,value in submission.verification.items() if key in {'mode','policy','evaluation_profile','state','declared_score','machine_confirmed','own_photo_confirmed'}}
            await db.commit()
        job=await claim(self.sessions)
        await process(self.sessions,*job,analyser=lambda _:observations())
        await process(self.sessions,*job,analyser=lambda _:observations())
        summary=(await self.client.get('/summary')).json()
        self.assertEqual(summary['xp'],challenge['xp']);self.assertEqual(len(summary['stamps']),1)
