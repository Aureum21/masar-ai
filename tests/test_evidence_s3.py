"""Private storage contracts: fake S3 transport, real API/DB transactions."""
from io import BytesIO
import os
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import unittest
from PIL import Image
from botocore.exceptions import ClientError
from sqlalchemy import select,func
from fastapi import HTTPException
from passport import evidence_storage as storage,service
from passport.models import Submission,EvidenceDeletion,utcnow
from passport.evidence_cleanup import process_deletions
from passport.verification import claim,process
from tests import test_boxing_verification as boxing_fixture
import tests.test_passport as fixture


class FakeS3:
    def __init__(self):
        self.objects={};self.puts=[];self.gets=[];self.deletes=[];self.fail_delete=False;self.fail_put=False;self.private=True
    def get_public_access_block(self,**kwargs):
        return {'PublicAccessBlockConfiguration':{k:self.private for k in ('BlockPublicAcls','IgnorePublicAcls','BlockPublicPolicy','RestrictPublicBuckets')}}
    def list_objects_v2(self,Bucket,Prefix,MaxKeys):
        return {'Contents':[{'Key':key,'Size':len(item['data'])} for (bucket,key),item in self.objects.items() if bucket==Bucket and key.startswith(Prefix)],'IsTruncated':False}
    def put_object(self,**kwargs):
        if self.fail_put:raise ConnectionError('private provider detail')
        self.puts.append(kwargs)
        identity=(kwargs['Bucket'],kwargs['Key'])
        if identity in self.objects:raise ClientError({'Error':{'Code':'PreconditionFailed'}},'PutObject')
        self.objects[identity]={'data':kwargs['Body'],'version':'v1','metadata':kwargs.get('Metadata',{})}
        return {'VersionId':'v1'}
    def get_object(self,**kwargs):
        self.gets.append(kwargs)
        item=self.objects.get((kwargs['Bucket'],kwargs['Key']))
        if not item:raise ClientError({'Error':{'Code':'NoSuchKey'}},'GetObject')
        return {'Body':BytesIO(item['data']),'ContentLength':len(item['data'])}
    def head_object(self,**kwargs):
        item=self.objects.get((kwargs['Bucket'],kwargs['Key']))
        if not item:raise ClientError({'Error':{'Code':'404'}},'HeadObject')
        return {'ContentLength':len(item['data']),'VersionId':item['version'],'Metadata':item['metadata']}
    def delete_object(self,**kwargs):
        if self.fail_delete:raise ConnectionError('private provider detail')
        self.deletes.append(kwargs);self.objects.pop((kwargs['Bucket'],kwargs['Key']),None)
        return {}


class S3StorageRulesTests(unittest.TestCase):
    def test_unsafe_reference_never_accesses_another_users_key(self):
        ref={'backend':'s3','bucket':'private-test-bucket','region':'eu-north-1','user_id':1,'name':'a'*32+'.png','key':'passport-evidence/2/'+'a'*32+'.png'}
        with self.assertRaises(HTTPException):storage.validate_ref(ref)
        with self.assertRaises(HTTPException):storage.local_path(1,'../../outside.png')

    def test_only_private_bucket_uploads_with_encryption_and_no_public_acl(self):
        fake=FakeS3();storage._privacy.clear()
        ref={'backend':'s3','bucket':'private-test-bucket','region':'eu-north-1','user_id':1,'name':'a'*32+'.png','key':'passport-evidence/1/'+'a'*32+'.png'}
        with patch('passport.evidence_storage.client_for',return_value=fake):
            result=storage.put_private(ref,fixture.test_png(),'image/png')
        self.assertEqual(fake.puts[0]['ServerSideEncryption'],'AES256')
        self.assertNotIn('ACL',fake.puts[0]);self.assertEqual(result['version_id'],'v1')
        self.assertEqual(fake.puts[0]['IfNoneMatch'],'*')
        fake=FakeS3();fake.private=False;storage._privacy.clear()
        with patch('passport.evidence_storage.client_for',return_value=fake),self.assertRaises(HTTPException) as error:
            storage.put_private(ref,b'data','image/png')
        self.assertEqual(error.exception.status_code,503);self.assertEqual(fake.puts,[])

    def test_partial_network_reads_are_assembled_before_integrity_check(self):
        import hashlib
        class PartialBody(BytesIO):
            def read(self,size=-1):
                return super().read(min(size,7) if size >= 0 else 7)
        payload=b'evidence-photo-bytes'*100
        body=PartialBody(payload)
        ref={'backend':'s3','bucket':'private-test-bucket','region':'eu-north-1','user_id':1,'name':'a'*32+'.png','key':'passport-evidence/1/'+'a'*32+'.png','sha256':hashlib.sha256(payload).hexdigest()}
        from unittest.mock import Mock
        fake=Mock();fake.get_object.return_value={'Body':body,'ContentLength':len(payload)}
        with patch('passport.evidence_storage.client_for',return_value=fake):
            self.assertEqual(storage.read_bytes(SimpleNamespace(user_id=1,image_name=ref['name'],image_storage=ref)),payload)
        self.assertTrue(body.closed)

    def test_new_schema_is_additive_and_preserves_existing_submission(self):
        import importlib.util
        from sqlalchemy import create_engine,text,inspect
        from alembic.migration import MigrationContext
        from alembic.operations import Operations
        path=Path(__file__).resolve().parents[1]/'alembic/versions/20261028_evidence_s3.py'
        spec=importlib.util.spec_from_file_location('s3_evidence_migration',path);migration=importlib.util.module_from_spec(spec);spec.loader.exec_module(migration)
        engine=create_engine('sqlite://')
        with engine.begin() as connection:
            connection.execute(text('CREATE TABLE passport_submissions (id VARCHAR(32) PRIMARY KEY,image_name VARCHAR(80))'))
            connection.execute(text("INSERT INTO passport_submissions VALUES ('old','old.png')"))
            with patch.object(migration,'op',Operations(MigrationContext.configure(connection))):
                migration.upgrade()
                self.assertIn('image_storage',[c['name'] for c in inspect(connection).get_columns('passport_submissions')])
                self.assertEqual(connection.scalar(text('SELECT image_name FROM passport_submissions')),'old.png')
                migration.downgrade()
                self.assertEqual(connection.scalar(text('SELECT image_name FROM passport_submissions')),'old.png')
        engine.dispose()


class S3EvidenceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await fixture.PassportTests.asyncSetUp(self)
        self.cloud_env=patch.dict(os.environ,{'PASSPORT_EVIDENCE_STORAGE':'s3','PASSPORT_EVIDENCE_BUCKET':'private-test-bucket','PASSPORT_EVIDENCE_REGION':'eu-north-1'})
        self.cloud_env.start();self.addCleanup(self.cloud_env.stop)
        self.fake=FakeS3();storage._privacy.clear()
        self.cloud=patch('passport.evidence_storage.client_for',return_value=self.fake)
        self.cloud.start();self.addCleanup(self.cloud.stop)
    asyncTearDown=fixture.PassportTests.asyncTearDown
    accept=fixture.PassportTests.accept
    real_photo_challenge=fixture.PassportTests.real_photo_challenge
    photo=fixture.PassportTests.photo

    async def test_upload_owner_read_worker_read_and_temporary_file_cleanup(self):
        _,challenge=await boxing_fixture.AutomaticBoxingTests.setup_boxing(self)
        response=await boxing_fixture.AutomaticBoxingTests.send(self,challenge)
        self.assertEqual(response.status_code,200,response.text)
        sid=response.json()['submission']['id']
        self.assertNotIn('private-test-bucket',response.text)
        self.assertEqual(list(Path(self.temp.name,'evidence').rglob('*.png')),[])
        async with self.sessions() as db:
            submission=await db.get(Submission,sid)
            self.assertEqual(submission.image_storage['backend'],'s3')
            self.assertEqual(submission.image_storage['version_id'],'v1')
        count=len(self.fake.gets)
        self.assertEqual((await self.client.get('/submissions/'+sid+'/image',headers={'X-Test-User':'2'})).status_code,404)
        self.assertEqual(len(self.fake.gets),count)
        image=await self.client.get('/submissions/'+sid+'/image')
        self.assertEqual(image.status_code,200,image.text)
        self.assertEqual(image.headers['cache-control'],'private, no-store')
        paths=[]
        def analyse(path):
            paths.append(path);self.assertTrue(path.is_file())
            return boxing_fixture.observations()
        job=await claim(self.sessions);await process(self.sessions,*job,analyser=analyse)
        self.assertFalse(paths[0].exists())
        self.assertEqual((await self.client.get('/summary')).json()['xp'],challenge['xp'])

    async def test_failed_s3_delete_remains_durable_and_stamp_is_preserved(self):
        _,challenge=await self.real_photo_challenge()
        sid=(await self.photo(challenge)).json()['submission']['id']
        result=await self.client.post('/review/submissions/'+sid,headers={'X-Passport-Operator-Key':'isolated-test-operator'},json={'decision':'accepted','feedback':'The photo meets the requirements.'})
        self.assertEqual(result.status_code,200,result.text)
        self.fake.fail_delete=True
        deleted=await self.client.delete('/submissions/'+sid+'/image')
        self.assertEqual(deleted.status_code,200,deleted.text)
        self.assertEqual((await self.client.get('/submissions/'+sid+'/image')).status_code,404)
        self.assertEqual((await self.client.get('/summary')).json()['xp'],challenge['xp'])
        async with self.sessions() as db:
            rows=list((await db.scalars(select(EvidenceDeletion))).all());self.assertEqual(len(rows),1)
            self.assertEqual(rows[0].attempts,1);rows[0].retry_at=utcnow();await db.commit()
        self.fake.fail_delete=False
        await process_deletions(self.sessions)
        self.assertEqual(self.fake.objects,{})
        self.assertEqual(self.fake.deletes[0]['VersionId'],'v1')
        async with self.sessions() as db:self.assertEqual(await db.scalar(select(func.count()).select_from(EvidenceDeletion)),0)

    async def test_upload_failure_does_not_create_submission_or_fall_back_to_local(self):
        _,challenge=await self.real_photo_challenge();self.fake.fail_put=True
        response=await self.photo(challenge)
        self.assertEqual(response.status_code,503,response.text)
        self.assertNotIn('private provider detail',response.text)
        async with self.sessions() as db:self.assertEqual(await db.scalar(select(func.count()).select_from(Submission)),0)
        self.assertEqual(list(Path(self.temp.name,'evidence').rglob('*')),[])

    async def test_database_failure_after_upload_removes_uncommitted_object(self):
        _,challenge=await boxing_fixture.AutomaticBoxingTests.setup_boxing(self)
        with patch('passport.verification.enqueue',side_effect=RuntimeError('DB fixture failure')):
            with self.assertRaises(RuntimeError):await boxing_fixture.AutomaticBoxingTests.send(self,challenge)
        self.assertEqual(self.fake.objects,{})
        async with self.sessions() as db:self.assertEqual(await db.scalar(select(func.count()).select_from(Submission)),0)

    async def test_removal_rollback_keeps_the_stored_photo_and_reference(self):
        _,challenge=await self.real_photo_challenge();sid=(await self.photo(challenge)).json()['submission']['id']
        async with self.sessions() as db:
            submission=await db.get(Submission,sid);await service.remove_evidence(db,submission);await db.rollback()
        self.assertEqual((await self.client.get('/submissions/'+sid+'/image')).status_code,200)
        self.assertEqual(self.fake.deletes,[])

    async def test_existing_local_evidence_is_read_even_after_s3_is_selected(self):
        _,challenge=await self.real_photo_challenge()
        with patch.dict(os.environ,{'PASSPORT_EVIDENCE_STORAGE':'local'}):
            sid=(await self.photo(challenge)).json()['submission']['id']
        self.assertEqual((await self.client.get('/submissions/'+sid+'/image')).status_code,200)
        self.assertEqual(self.fake.gets,[])

    async def test_missing_cloud_image_is_not_silently_replaced_by_local_file(self):
        _,challenge=await self.real_photo_challenge();sid=(await self.photo(challenge)).json()['submission']['id']
        self.fake.objects.clear()
        response=await self.client.get('/submissions/'+sid+'/image')
        self.assertEqual(response.status_code,404)

    async def test_migration_verifies_copy_and_keeps_original_and_supports_restart(self):
        from passport.migrate_evidence import migrate
        _,challenge=await self.real_photo_challenge()
        with patch.dict(os.environ,{'PASSPORT_EVIDENCE_STORAGE':'local'}):
            sid=(await self.photo(challenge)).json()['submission']['id']
        async with self.sessions() as db:
            submission=await db.get(Submission,sid)
            path=service.image_path(submission);original=path.read_bytes()
        dry=await migrate(self.sessions)
        self.assertEqual(dry['available'],1);self.assertEqual(dry['migrated'],0);self.assertEqual(self.fake.puts,[])
        applied=await migrate(self.sessions,apply=True)
        self.assertEqual(applied['migrated'],1);self.assertEqual(applied['failed'],0)
        self.assertEqual(path.read_bytes(),original)
        self.assertEqual((await self.client.get('/submissions/'+sid+'/image')).content,original)
        again=await migrate(self.sessions,apply=True)
        self.assertEqual(again['already_s3'],1);self.assertEqual(len(self.fake.puts),1)

    async def test_migration_missing_local_photo_is_reported_without_replacing_it(self):
        from passport.migrate_evidence import migrate
        _,challenge=await self.real_photo_challenge()
        with patch.dict(os.environ,{'PASSPORT_EVIDENCE_STORAGE':'local'}):
            sid=(await self.photo(challenge)).json()['submission']['id']
        async with self.sessions() as db:service.image_path(await db.get(Submission,sid)).unlink()
        result=await migrate(self.sessions,apply=True)
        self.assertEqual(result['missing'],1);self.assertEqual(result['migrated'],0)
        async with self.sessions() as db:self.assertIsNone((await db.get(Submission,sid)).image_storage)

    async def test_integrity_mismatch_is_not_served_as_valid_evidence(self):
        _,challenge=await self.real_photo_challenge();sid=(await self.photo(challenge)).json()['submission']['id']
        next(iter(self.fake.objects.values()))['data']=b'changed object'
        response=await self.client.get('/submissions/'+sid+'/image')
        self.assertEqual(response.status_code,503)

    async def test_s3_quota_is_applied_before_upload(self):
        _,challenge=await self.real_photo_challenge()
        for i in range(100):self.fake.objects[('private-test-bucket',f'passport-evidence/1/{i:032x}.png')]={'data':b'x','metadata':{},'version':'v1'}
        response=await self.photo(challenge)
        self.assertEqual(response.status_code,413,response.text);self.assertEqual(self.fake.puts,[])

    async def test_worker_model_failure_also_removes_its_temporary_download(self):
        _,challenge=await boxing_fixture.AutomaticBoxingTests.setup_boxing(self)
        await boxing_fixture.AutomaticBoxingTests.send(self,challenge)
        paths=[]
        def unavailable(path):paths.append(path);raise RuntimeError('fake inference failure')
        job=await claim(self.sessions);await process(self.sessions,*job,analyser=unavailable)
        self.assertFalse(paths[0].exists())
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)

    async def test_failed_rollback_object_removal_is_durable(self):
        _,challenge=await boxing_fixture.AutomaticBoxingTests.setup_boxing(self);self.fake.fail_delete=True
        with patch('passport.verification.enqueue',side_effect=RuntimeError('DB fixture failure')):
            with self.assertRaises(RuntimeError):await boxing_fixture.AutomaticBoxingTests.send(self,challenge)
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(Submission)),0)
            self.assertEqual(await db.scalar(select(func.count()).select_from(EvidenceDeletion)),1)
        self.fake.fail_delete=False;await process_deletions(self.sessions)
        self.assertEqual(self.fake.objects,{})
