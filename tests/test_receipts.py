"""Receipt lifecycle contracts: temporary SQLite/storage, deterministic OCR, no providers."""
import os
os.environ.setdefault('MASAR_ENV','test')
os.environ.setdefault('DATABASE_URL','postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0')
import asyncio,base64,importlib.util,json,tempfile,unittest
from datetime import date,timedelta
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch,AsyncMock,Mock
import httpx
from PIL import Image
from fastapi import FastAPI,Request,HTTPException
from sqlalchemy import select,func,text,create_engine,inspect
from sqlalchemy.ext.asyncio import create_async_engine,async_sessionmaker
import auth,models
from database import Base
from passport.models import Award
from receipts.router import router
from receipts.models import Receipt
from receipts import service as s,storage
from receipts.policy import assess
from receipts.extraction import extract
from services.api_protection import ApiProtection

def photo(color='orange'):
    output=BytesIO();image=Image.new('RGB',(50,80),color);exif=image.getexif();exif[271]='private-camera-model'
    image.save(output,format='JPEG',exif=exif)
    return output.getvalue()

def observed():
    return {'merchant_name':'Fixture Store','purchase_date':date.today().isoformat(),'currency':'AED','total_amount':'525.00','vat_amount':'25.00','category':'electronics','is_service':False,'has_planet_tag':True}

class PolicyTests(unittest.TestCase):
    def test_known_goods_are_only_provisional(self):
        result=assess(observed())
        self.assertEqual(result['status'],'eligible');self.assertEqual(result['estimated_refund'],'18.15')
        self.assertEqual(result['official_status'],'unknown');self.assertTrue(result['policy_version'])

    def test_unknown_currency_category_and_service_evidence_do_not_infer(self):
        for key,value in [('currency',None),('currency','USD'),('category',None),('category','mixed'),('is_service',None),('vat_amount',None),('has_planet_tag',False),('purchase_date',None)]:
            self.assertEqual(assess({**observed(),key:value})['status'],'needs_review',(key,value))
        self.assertEqual(assess({**observed(),'is_service':True})['status'],'excluded')
        self.assertEqual(assess({**observed(),'category':'hotel'})['status'],'excluded')

    def test_boundaries_and_bad_numbers(self):
        self.assertEqual(assess({**observed(),'total_amount':'200','vat_amount':'9.52'})['status'],'below_minimum')
        self.assertEqual(assess({**observed(),'total_amount':'250','vat_amount':'11.90'})['status'],'needs_review')
        self.assertEqual(assess({**observed(),'total_amount':'262.50','vat_amount':'12.50'})['estimated_refund'],'7.28')
        for value in ['NaN','Infinity','-1','999']:
            self.assertEqual(assess({**observed(),'vat_amount':value})['status'],'needs_review')
        self.assertEqual(assess({**observed(),'purchase_date':(date.today()+timedelta(days=1)).isoformat()})['status'],'needs_review')

class StorageTests(unittest.TestCase):
    def test_real_decode_pixel_limit_and_metadata_strip(self):
        clean,digest=storage.sanitize(photo())
        with Image.open(BytesIO(clean)) as image:self.assertEqual(dict(image.getexif()),{})
        self.assertEqual(len(digest),64)
        for value in [b'\xff\xd8\xfftest',b'%PDF-1.7',b'<svg/>',b'']:
            with self.assertRaises(HTTPException):storage.sanitize(value)
        with patch.object(storage.Image,'open',return_value=Mock(__enter__=lambda *_:SimpleNamespace(format='PNG',width=5000,height=5000),__exit__=lambda *_:False)):
            with self.assertRaises(HTTPException):storage.sanitize(b'x')

    def test_private_s3_put_read_and_version_delete(self):
        data=photo();ref={'backend':'s3','user_id':1,'receipt_id':'a'*32,'key':'receipts/1/'+'a'*32+'.jpg','bucket':'test-private-bucket','region':'eu-north-1'}
        client=Mock();client.put_object.return_value={'VersionId':'version-one'}
        client.get_object.return_value={'Body':BytesIO(data)}
        with patch.object(storage,'client_for',return_value=client),patch.object(storage,'require_private') as privacy:
            stored=storage.put(ref,data);self.assertEqual(stored['version_id'],'version-one');privacy.assert_called_once()
            self.assertEqual(storage.read(stored),data)
            storage.delete(stored)
            self.assertEqual(client.put_object.call_args.kwargs['ServerSideEncryption'],'AES256')
            self.assertEqual(client.put_object.call_args.kwargs['IfNoneMatch'],'*')
            self.assertNotIn('ACL',client.put_object.call_args.kwargs)
            self.assertEqual(client.delete_object.call_args.kwargs['VersionId'],'version-one')
            self.assertEqual(client.get_object.return_value['Body'].closed,True)
            client.head_object.return_value={'VersionId':'recovered-version'};storage.delete(ref)
            self.assertEqual(client.delete_object.call_args.kwargs['VersionId'],'recovered-version')

    def test_invalid_refs_and_privacy_failure_cannot_write(self):
        with self.assertRaises(HTTPException):storage.validate({'user_id':1,'receipt_id':'../secret'})
        ref={'backend':'s3','user_id':1,'receipt_id':'a'*32,'key':'receipts/1/'+'a'*32+'.jpg','bucket':'test-private-bucket','region':'eu-north-1'}
        client=Mock()
        with patch.object(storage,'client_for',return_value=client),patch.object(storage,'require_private',side_effect=HTTPException(503,'Private bucket required')):
            with self.assertRaises(HTTPException):storage.put(ref,b'test')
        client.put_object.assert_not_called()

class ReceiptAPITests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.env=patch.dict(os.environ,{'RECEIPTS_ENABLED':'true','RECEIPT_STORAGE':'local','RECEIPT_DIR':str(Path(self.temp.name)/'images'),'RECEIPT_DAILY_LIMIT':'20'})
        self.env.start()
        self.engine=create_async_engine('sqlite+aiosqlite:///'+Path(self.temp.name,'test.db').as_posix())
        async with self.engine.begin() as connection:await connection.run_sync(Base.metadata.create_all)
        self.sessions=async_sessionmaker(self.engine,expire_on_commit=False)
        async with self.sessions() as db:
            db.add_all([models.User(id=i,name='Fixture',email=f'fixture{i}@test.invalid',hashed_password='unused') for i in [1,2]])
            await db.commit()
            db.add_all([models.Trip(id=i,user_id=i,title=f'Fixture trip {i}',itinerary_data={}) for i in [1,2]])
            await db.commit()
        self.app=FastAPI();self.app.include_router(router);self.app.add_middleware(ApiProtection)
        async def get_db():
            async with self.sessions() as db:yield db
        async def user(request:Request):return SimpleNamespace(id=int(request.headers.get('X-Test-Owner','1')))
        self.app.dependency_overrides[auth.get_db]=get_db;self.app.dependency_overrides[auth.get_current_user]=user
        self.client=httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app),base_url='http://fixture/api/v1/receipts',follow_redirects=True)

    async def asyncTearDown(self):
        await self.client.aclose();await self.engine.dispose();self.env.stop();self.temp.cleanup()

    async def upload(self,key='request-one',image=None,manual=False,trip=None,headers=None):
        data={'acknowledged_version':s.INTRO_VERSION,'save_unrecognized':str(manual).lower()}
        if trip:data['trip_id']=str(trip)
        return await self.client.post('/process',data=data,files={'file':('sample_apple_dubai_mall.jpg',image or photo(),'image/jpeg')},headers={'Idempotency-Key':key,**(headers or {})})

    async def complete(self,row,values=None):
        job=await s.claim(self.sessions);self.assertEqual(job[0],row['id'])
        await s.process(self.sessions,*job,extractor=AsyncMock(return_value=values or observed()))
        return (await self.client.get('/'+row['id'])).json()

    async def test_empty_list_has_no_seed_side_effects(self):
        for _ in range(2):self.assertEqual((await self.client.get('')).json()['items'],[])
        async with self.sessions() as db:self.assertEqual(await db.scalar(select(func.count()).select_from(Receipt)),0)

    async def test_upload_is_private_queued_and_idempotent(self):
        first=await self.upload();self.assertEqual(first.status_code,202,first.text);row=first.json()
        self.assertEqual(row['state'],'queued');self.assertFalse(row['is_demo'])
        same=await self.upload();self.assertEqual(same.json()['id'],row['id'])
        duplicate=await self.upload('other-request');self.assertEqual(duplicate.json()['id'],row['id'])
        self.assertEqual((await self.upload(image=photo('blue'))).status_code,409)
        image=await self.client.get('/'+row['id']+'/image');self.assertEqual(image.status_code,200)
        self.assertEqual(image.headers['cache-control'],'private, no-store')
        self.assertEqual((await self.client.get('/uploads/receipts/'+row['id']+'.jpg')).status_code,404)

    async def test_no_token_expired_forged_and_reset_tokens_fail(self):
        self.app.dependency_overrides.pop(auth.get_current_user)
        from jose import jwt
        cases=[None,'invalid',jwt.encode({'sub':'fixture1@test.invalid','exp':9999999999,'type':'access'},'incorrect-key',algorithm='HS256'),jwt.encode({'sub':'fixture1@test.invalid','exp':1,'type':'access'},auth.SECRET_KEY,algorithm=auth.ALGORITHM),auth.create_reset_token('fixture1@test.invalid')]
        for token in cases:
            response=await self.client.get('',headers={'Authorization':'Bearer '+token} if token else {})
            self.assertEqual(response.status_code,401)

    async def test_ownership_for_every_operation_and_trip(self):
        row=(await self.upload(manual=True)).json();other={'X-Test-Owner':'2'}
        for method,path,body in [('get','/'+row['id'],None),('get','/'+row['id']+'/image',None),('patch','/'+row['id'],{'expected_revision':row['revision'],'merchant_name':'Attack'}),('post','/'+row['id']+'/retry',{'expected_revision':row['revision']}),('put','/'+row['id']+'/trip',{'expected_revision':row['revision'],'trip_id':2}),('delete','/'+row['id'],None)]:
            args={'headers':other}
            if body:args['json']=body
            self.assertEqual((await getattr(self.client,method)(path,**args)).status_code,404)
        self.assertEqual((await self.upload('other-trip',image=photo('blue'),trip=2)).status_code,404)
        self.assertEqual((await self.client.get('?trip_id=2')).status_code,404)

    async def test_partial_patch_preserves_fields_and_revision_provenance(self):
        row=await self.complete((await self.upload()).json())
        changed=await self.client.patch('/'+row['id'],json={'expected_revision':row['revision'],'merchant_name':'Corrected'})
        self.assertEqual(changed.status_code,200,changed.text);value=changed.json()
        self.assertEqual(value['vat_amount'],'25.00');self.assertEqual(value['currency'],'AED')
        self.assertEqual(value['extracted_fields']['merchant_name'],'Fixture Store');self.assertEqual(value['merchant_name'],'Corrected')
        self.assertEqual(value['corrections'][0]['fields'],{'merchant_name':'Corrected'})
        self.assertEqual((await self.client.patch('/'+row['id'],json={'expected_revision':row['revision'],'merchant_name':'Stale'})).status_code,409)
        self.assertEqual((await self.client.patch('/'+row['id'],json={'expected_revision':value['revision'],'vat_amount':'600'})).status_code,422)

    async def test_client_cannot_write_official_status_or_refund(self):
        row=(await self.upload(manual=True)).json()
        for field in ['estimated_refund','is_demo','official_status','user_id']:
            response=await self.client.patch('/'+row['id'],json={'expected_revision':row['revision'],field:'forged'})
            self.assertEqual(response.status_code,422)

    async def test_claim_recovery_fences_old_worker_and_no_awards(self):
        row=(await self.upload()).json();old=await s.claim(self.sessions)
        async with self.sessions() as db:
            record=await db.get(Receipt,row['id']);record.lease_until=s.now()-timedelta(seconds=1);await db.commit()
        current=await s.claim(self.sessions);self.assertNotEqual(old[1],current[1])
        self.assertFalse(await s.process(self.sessions,*old,extractor=AsyncMock(return_value=observed())))
        self.assertTrue(await s.process(self.sessions,*current,extractor=AsyncMock(return_value=observed())))
        self.assertFalse(await s.process(self.sessions,*current,extractor=AsyncMock(return_value=observed())))
        result=(await self.client.get('/'+row['id'])).json();self.assertEqual(result['state'],'ready')
        async with self.sessions() as db:self.assertEqual(await db.scalar(select(func.count()).select_from(Award)),0)

    async def test_failed_ocr_manual_edit_and_retry(self):
        row=(await self.upload()).json();job=await s.claim(self.sessions)
        await s.process(self.sessions,*job,extractor=AsyncMock(side_effect=RuntimeError('secret-provider-data')))
        row=(await self.client.get('/'+row['id'])).json();self.assertEqual(row['state'],'failed');self.assertNotIn('secret-provider-data',row['feedback'])
        retried=await self.client.post('/'+row['id']+'/retry',json={'expected_revision':row['revision']});self.assertEqual(retried.json()['state'],'queued')
        complete=await self.complete(retried.json(),{**observed(),'currency':None,'is_service':None})
        self.assertEqual(complete['status'],'needs_review');self.assertIsNone(complete['estimated_refund'])
        corrected=await self.client.patch('/'+row['id'],json={'expected_revision':complete['revision'],'currency':'AED','is_service':False})
        self.assertEqual(corrected.json()['estimated_refund'],'18.15')

    async def test_delete_hides_immediately_and_cleanup_survives_failure(self):
        row=(await self.upload()).json();job=await s.claim(self.sessions)
        self.assertEqual((await self.client.delete('/'+row['id'])).status_code,202)
        self.assertEqual((await self.client.get('/'+row['id'])).status_code,404)
        self.assertFalse(await s.process(self.sessions,*job,extractor=AsyncMock(return_value=observed())))
        with patch.object(storage,'delete',side_effect=RuntimeError('storage temporarily offline')):self.assertFalse(await s.cleanup(self.sessions))
        async with self.sessions() as db:
            record=await db.get(Receipt,row['id']);record.lease_until=s.now()-timedelta(seconds=1);await db.commit()
        self.assertTrue(await s.cleanup(self.sessions))
        async with self.sessions() as db:
            record=await db.get(Receipt,row['id']);self.assertEqual(record.state,'deleted');self.assertIsNone(record.storage);self.assertIsNone(record.merchant_name)
        self.assertEqual((await self.upload()).status_code,409)
        self.assertEqual((await self.client.get('')).json()['items'],[])
        self.assertEqual((await self.upload('brand-new-key')).status_code,202)

    async def test_summary_uses_only_ready_real_aed_estimates_and_trip_link(self):
        row=await self.complete((await self.upload(trip=1)).json())
        summary=(await self.client.get('/summary?trip_id=1')).json();self.assertEqual(summary['possible_refund_aed'],'18.15')
        self.assertEqual(summary['recorded_spend_aed'],'525.00');self.assertEqual(summary['official_status'],'unknown')
        response=await self.client.put('/'+row['id']+'/trip',json={'trip_id':None,'expected_revision':row['revision']});self.assertEqual(response.status_code,200)
        self.assertEqual((await self.client.get('/summary?trip_id=1')).json()['count'],0)

    async def test_image_content_acknowledgement_and_body_limits(self):
        for data in [b'\xff\xd8\xffbroken',b'%PDF-1.7',b'<svg/>']:
            self.assertEqual((await self.upload(image=data)).status_code,422)
        response=await self.client.post('/process',data={'acknowledged_version':'old'},files={'file':('x.jpg',photo(),'image/jpeg')},headers={'Idempotency-Key':'request-one'})
        self.assertEqual(response.status_code,422)
        async def chunks():
            for _ in range(12):yield b'x'*1_000_000
        self.assertEqual((await self.client.post('/process',content=chunks())).status_code,413)

    async def test_daily_quota_does_not_block_idempotent_replay(self):
        with patch.dict(os.environ,{'RECEIPT_DAILY_LIMIT':'1'}):
            first=await self.upload(manual=True)
            self.assertEqual(first.status_code,202)
            self.assertEqual((await self.upload(manual=True)).json()['id'],first.json()['id'])
            self.assertEqual((await self.upload('request-two',photo('blue'),manual=True)).status_code,429)

    async def test_pagination_and_expired_upload_recovery(self):
        await self.upload('request-one',photo('orange'),manual=True)
        second=(await self.upload('request-two',photo('blue'),manual=True)).json()
        first=(await self.client.get('?limit=1')).json();self.assertEqual(len(first['items']),1);self.assertTrue(first['next_cursor'])
        next_page=(await self.client.get('?limit=1&cursor='+first['next_cursor'])).json();self.assertNotEqual(first['items'][0]['id'],next_page['items'][0]['id'])
        async with self.sessions() as db:
            row=await db.get(Receipt,second['id']);row.state='uploading';row.lease_until=s.now()-timedelta(seconds=1);await db.commit()
        await s.recover_uploads(self.sessions)
        self.assertEqual((await self.client.get('/'+second['id'])).json()['state'],'failed')

class MigrationTests(unittest.TestCase):
    def test_additive_migration_preserves_legacy_tables(self):
        from alembic.migration import MigrationContext
        from alembic.operations import Operations
        path=Path(__file__).resolve().parents[1]/'alembic/versions/20261029_receipts.py'
        spec=importlib.util.spec_from_file_location('receipt_migration',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        engine=create_engine('sqlite://')
        with engine.begin() as connection:
            connection.execute(text('CREATE TABLE users (id INTEGER PRIMARY KEY)'));connection.execute(text('CREATE TABLE trips (id INTEGER PRIMARY KEY)'))
            connection.execute(text('CREATE TABLE receipts (id INTEGER PRIMARY KEY, merchant_name VARCHAR)'));connection.execute(text("INSERT INTO receipts VALUES (1,'Legacy merchant')"))
            with patch.object(module,'op',Operations(MigrationContext.configure(connection))):
                module.upgrade();self.assertTrue(inspect(connection).has_table('travel_receipts'))
                self.assertEqual(connection.scalar(text('SELECT merchant_name FROM receipts WHERE id=1')),'Legacy merchant')
                module.downgrade();self.assertFalse(inspect(connection).has_table('travel_receipts'))
                self.assertEqual(connection.scalar(text('SELECT count(*) FROM receipts')),1)
        engine.dispose()

if __name__=='__main__':unittest.main()
