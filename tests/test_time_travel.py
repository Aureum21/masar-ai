"""Deterministic integration tests; no provider calls, real accounts or live DB writes."""
import asyncio
import base64
from io import BytesIO
import os
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock,patch
import httpx
from fastapi import FastAPI
from PIL import Image
import auth
from routers.time_travel import router
from services import time_travel as travel
from services.api_protection import ApiProtection

def photo():
    output=BytesIO()
    Image.new('RGB',(12,12),'gold').save(output,format='PNG')
    return 'data:image/png;base64,'+base64.b64encode(output.getvalue()).decode()

class ArchiveRules(unittest.TestCase):
    def test_archive_assets_and_seven_emirates(self):
        self.assertEqual(len(travel.catalogue()),11)
        self.assertEqual(len({v['emirate'] for v in travel.catalogue().values()}),7)
        public=Path(__file__).resolve().parents[1]/'frontend/public'
        for key in travel.catalogue():
            item=travel.archive(key)
            self.assertFalse(item['is_recognized'])
            self.assertIsNone(item['confidence'])
            self.assertEqual(item['source'],'illustrative_archive')
            self.assertTrue((public/item['thumbnail_url'].lstrip('/')).is_file())
            self.assertTrue(any(e['id']=='2026' for e in item['timeline']))
            for era in item['timeline']:
                self.assertTrue((public/era['image_url'].lstrip('/')).is_file())

    def test_no_false_success_or_confidence_inflation(self):
        correct=travel.resolve_observation({'landmark_id':'al_hisn','score':.95})
        self.assertTrue(correct['is_recognized'])
        self.assertEqual(correct['confidence'],.95)
        for identity,score in [('al_hisn',.89),(None,.99),('unrelated',.99)]:
            result=travel.resolve_observation({'landmark_id':identity,'score':score})
            self.assertFalse(result['is_recognized'])
            self.assertNotIn('timeline',result)
        for score in [-1,2,True,None,float('nan')]:
            with self.assertRaises(ValueError):
                travel.resolve_observation({'landmark_id':'al_hisn','score':score})

    def test_local_scene_rejects_ambiguous_and_unrelated_images(self):
        count = len(travel.recognition_labels())
        scores = [.01] * count
        scores[0] = .95
        self.assertEqual(travel.scene_observation(scores)['landmark_id'], 'al_hisn')
        scores[1] = .75
        uncertain = travel.resolve_observation(travel.scene_observation(scores))
        self.assertFalse(uncertain['is_recognized'])
        self.assertNotIn('candidates', uncertain)
        self.assertNotIn('timeline', uncertain)
        scores = [.01] * count
        scores[-1] = .99
        self.assertIsNone(travel.scene_observation(scores)['landmark_id'])
        for invalid in [[], [float('nan')] * count, [True] * count]:
            with self.assertRaises(ValueError): travel.scene_observation(invalid)

    def test_image_reencoded_and_invalid_inputs_rejected(self):
        result=travel.prepare_image(photo())
        self.assertTrue(result.startswith('data:image/jpeg;base64,'))
        for value in ['x','data:image/gif;base64,eA==','aGVsbG8=']:
            with self.assertRaises(Exception) as raised:
                travel.prepare_image(value)
            self.assertEqual(raised.exception.status_code,422)
        out=BytesIO();Image.new('RGB',(4001,4000)).save(out,format='PNG')
        with self.assertRaises(Exception):
            travel.prepare_image(base64.b64encode(out.getvalue()).decode())

class TimeTravelAPI(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        travel._requests.clear()
        self.app=FastAPI();self.app.include_router(router)
        self.app.add_middleware(ApiProtection)
        self.app.dependency_overrides[auth.get_current_user]=lambda:SimpleNamespace(id=71)
        self.client=httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app),base_url='http://test')

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_inference_reuses_evidence_runtime_without_openai(self):
        from unittest.mock import Mock
        scores = [.01] * len(travel.recognition_labels())
        scores[0] = .95
        runtime = Mock(return_value={'scores': scores, 'lines': []})
        with patch('passport.vision_models.analyse_scene', runtime):
            observed = await travel.infer(travel.prepare_image(photo()))
        self.assertEqual(observed['landmark_id'], 'al_hisn')
        runtime.assert_called_once()
        self.assertEqual(runtime.call_args.args[1], travel.recognition_labels())

    async def test_authentication_required(self):
        self.app.dependency_overrides.clear()
        for path in ['/landmarks','/archive/al_hisn']:
            self.assertEqual((await self.client.get('/api/v1/time-travel'+path)).status_code,401)
        self.assertEqual((await self.client.post('/api/v1/time-travel/detect',json={'sample_id':'al_hisn'})).status_code,401)

    async def test_archive_listing_and_unknown_ids(self):
        listed=await self.client.get('/api/v1/time-travel/landmarks')
        self.assertEqual(listed.status_code,200)
        self.assertEqual(len(listed.json()['landmarks']),11)
        self.assertNotIn('timeline',listed.json()['landmarks'][0])
        for body in [{},{'sample_id':'al_hisn','image_base64':photo()},{'sample_id':'al_hisn','award_xp':50},{'image_base64':'x'*7_000_001}]:
            self.assertEqual((await self.client.post('/api/v1/time-travel/detect',json=body)).status_code,422)
        self.assertEqual((await self.client.post('/api/v1/time-travel/detect',json={'sample_id':'missing'})).status_code,404)
        self.assertEqual((await self.client.get('/api/v1/time-travel/archive/missing')).status_code,404)

    async def test_samples_do_not_invoke_recognition(self):
        with patch.object(travel,'infer',new_callable=AsyncMock) as model:
            response=await self.client.post('/api/v1/time-travel/detect',json={'sample_id':'al_hisn'})
            self.assertEqual(response.status_code,200)
            self.assertEqual(response.json()['source'],'illustrative_archive')
            model.assert_not_awaited()

    async def test_optional_recognition_and_safe_provider_errors(self):
        with patch.dict(os.environ,{'TIME_TRAVEL_VISION_ENABLED':'false'}):
            self.assertEqual((await self.client.post('/api/v1/time-travel/detect',json={'image_base64':photo()})).status_code,503)
        with patch.dict(os.environ,{'TIME_TRAVEL_VISION_ENABLED':'true','OPENAI_API_KEY':''}):
            for observed,recognized in [({'landmark_id':'al_hisn','score':.95},True),({'landmark_id':None,'score':.95},False)]:
                with patch.object(travel,'infer',new=AsyncMock(return_value=observed)):
                    result=(await self.client.post('/api/v1/time-travel/detect',json={'image_base64':photo()})).json()
                    self.assertEqual(result['is_recognized'],recognized)
            for error,status in [(TimeoutError('private provider details'),504),(RuntimeError('private provider details'),503)]:
                with patch.object(travel,'infer',new=AsyncMock(side_effect=error)):
                    result=await self.client.post('/api/v1/time-travel/detect',json={'image_base64':photo()})
                    self.assertEqual(result.status_code,status)
                    self.assertNotIn('private provider details',result.text)

    async def test_rate_limit_and_chunked_body_cap(self):
        with patch.dict(os.environ,{'TIME_TRAVEL_VISION_ENABLED':'true','OPENAI_API_KEY':''}),patch.object(travel,'infer',new=AsyncMock(return_value={'landmark_id':None,'score':.1})):
            for _ in range(5):
                self.assertEqual((await self.client.post('/api/v1/time-travel/detect',json={'image_base64':photo()})).status_code,200)
            result=await self.client.post('/api/v1/time-travel/detect',json={'image_base64':photo()})
            self.assertEqual(result.status_code,429)
            self.assertEqual(result.headers['retry-after'],'60')
        async def chunks():
            for _ in range(8):yield b'x'*1_000_000
        result=await self.client.post('/api/v1/time-travel/detect',content=chunks())
        self.assertEqual(result.status_code,413)

    async def test_provider_calls_are_bounded(self):
        active=0;maximum=0
        async def fake(_):
            nonlocal active,maximum
            active+=1;maximum=max(maximum,active)
            await asyncio.sleep(.01)
            active-=1
            return {'landmark_id':None,'score':.1}
        with patch.dict(os.environ,{'TIME_TRAVEL_VISION_ENABLED':'true','OPENAI_API_KEY':''}),patch.object(travel,'_slots',asyncio.Semaphore(2)),patch.object(travel,'infer',new=fake):
            await asyncio.gather(*(travel.recognize(photo(),i) for i in range(5)))
        self.assertEqual(maximum,2)

if __name__=='__main__':unittest.main()
