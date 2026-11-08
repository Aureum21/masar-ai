"""Security regression tests: no providers and no production database access."""
import os
os.environ['MASAR_ENV']='test'
os.environ.setdefault('DATABASE_URL','postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0')
os.environ['SECRET_KEY']='production-test-only-secret'
import asyncio
import unittest
from pathlib import Path
from unittest.mock import patch,AsyncMock,Mock
import httpx
from fastapi import FastAPI,HTTPException
from jose import jwt
import auth
from config.production import validate_settings,cors_origins
from services.api_protection import ApiProtection

PROD={'MASAR_ENV':'production','SECRET_KEY':'a1b2c3d4'*8,'DATABASE_URL':'postgresql://fixture:fixture@fixture.example/db?sslmode=require','CORS_ORIGINS':'https://app.example.com','frontend_url':'https://app.example.com','API_ALLOWED_HOSTS':'api.example.com','PASSPORT_EVIDENCE_DIR':str(Path.cwd()/'sandbox'/'private-fixture-evidence'),'S3_BUCKET_NAME':'fixture','OPENAI_API_KEY':'sk-fixture','NUTIEE_API_KEY':'sand_fixture','CHECKPOINT_BACKEND':'postgres'}

class ProductionSettings(unittest.TestCase):
 def test_production_accepts_explicit_safe_settings(self):
  with patch.dict(os.environ,PROD,clear=True):
   validate_settings();self.assertEqual(cors_origins(),['https://app.example.com'])
 def test_rejects_missing_secret_wildcard_origins_desktop_identity_and_remote_plaintext_db(self):
  for changes in [{'SECRET_KEY':''},{'SECRET_KEY':'REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS'},{'CORS_ORIGINS':'*'},{'AWS_PROFILE':'masar'},{'DATABASE_URL':'postgresql://fixture:fixture@fixture.example/db'},{'CHECKPOINT_BACKEND':'memory'}]:
   with patch.dict(os.environ,{**PROD,**changes},clear=True):
    with self.assertRaises(RuntimeError):validate_settings()
 def test_production_never_loads_developer_dotenv(self):
  from config.runtime import load_environment
  with patch.dict(os.environ,{'MASAR_ENV':'production'},clear=True),patch('config.runtime.load_dotenv') as dotenv:
   load_environment();dotenv.assert_not_called()
 def test_checkpoint_identity_is_owner_scoped(self):
  from services.agent_checkpoints import checkpoint_thread
  self.assertNotEqual(checkpoint_thread(1,'same-conversation'),checkpoint_thread(2,'same-conversation'))
  self.assertEqual(checkpoint_thread(1,'same-conversation'),checkpoint_thread(1,'same-conversation'))

class TokenSecurity(unittest.IsolatedAsyncioTestCase):
 async def test_reset_token_cannot_authenticate_api_and_does_not_reach_db(self):
  db=AsyncMock()
  with self.assertRaises(HTTPException) as error:await auth.get_current_user(auth.create_reset_token('fixture@example.com'),db)
  self.assertEqual(error.exception.status_code,401);db.execute.assert_not_awaited()
 async def test_access_token_works_and_cannot_reset_password(self):
  token=auth.create_access_token({'sub':'fixture@example.com'})
  db=AsyncMock();actor=Mock();db.execute.return_value.scalars=Mock(return_value=Mock(first=Mock(return_value=actor)))
  self.assertIs(await auth.get_current_user(token,db),actor)
  self.assertIsNone(auth.verify_reset_token(token))
 async def test_legacy_token_is_only_accepted_outside_production(self):
  from datetime import datetime,timedelta,timezone
  token=jwt.encode({'sub':'fixture@example.com','exp':datetime.now(timezone.utc)+timedelta(minutes=5)},auth.SECRET_KEY,algorithm=auth.ALGORITHM)
  with patch.dict(os.environ,{'MASAR_ENV':'production'}):
   with self.assertRaises(HTTPException):await auth.get_current_user(token,AsyncMock())
 async def test_token_without_expiration_is_rejected(self):
  token=jwt.encode({'sub':'fixture@example.com','type':'access'},auth.SECRET_KEY,algorithm=auth.ALGORITHM)
  with self.assertRaises(HTTPException):await auth.get_current_user(token,AsyncMock())

class HttpProtection(unittest.IsolatedAsyncioTestCase):
 async def test_rate_limits_have_retry_after_and_spoofed_forwarding_does_not_bypass(self):
  app=FastAPI()
  @app.post('/api/v1/auth/login')
  async def login():return {'ok':True}
  app.add_middleware(ApiProtection,enabled=True)
  async with httpx.AsyncClient(transport=httpx.ASGITransport(app),base_url='http://fixture') as client:
   for i in range(10):self.assertEqual((await client.post('/api/v1/auth/login',headers={'X-Forwarded-For':f'10.0.0.{i}'})).status_code,200)
   response=await client.post('/api/v1/auth/login');self.assertEqual(response.status_code,429);self.assertIn('retry-after',response.headers)
 async def test_browser_can_read_rate_limit_responses(self):
  from fastapi.middleware.cors import CORSMiddleware
  app=FastAPI()
  @app.post('/api/v1/auth/login')
  async def login():return {'ok':True}
  app.add_middleware(ApiProtection,enabled=True)
  app.add_middleware(CORSMiddleware,allow_origins=['https://app.example.com'])
  async with httpx.AsyncClient(transport=httpx.ASGITransport(app),base_url='http://fixture') as client:
   for _ in range(11):response=await client.post('/api/v1/auth/login',headers={'Origin':'https://app.example.com'})
   self.assertEqual(response.status_code,429);self.assertEqual(response.headers['access-control-allow-origin'],'https://app.example.com')
 async def test_chat_capacity_is_held_until_stream_finishes_and_released_after_failure(self):
  from starlette.responses import StreamingResponse
  entered,finish=asyncio.Event(),asyncio.Event()
  app=FastAPI()
  @app.post('/api/v1/chat')
  async def chat():
   async def chunks():
    entered.set();await finish.wait();yield 'done'
   return StreamingResponse(chunks())
  app.add_middleware(ApiProtection,enabled=True)
  async with httpx.AsyncClient(transport=httpx.ASGITransport(app),base_url='http://fixture') as client:
   first=asyncio.create_task(client.post('/api/v1/chat'));await entered.wait()
   try:self.assertEqual((await client.post('/api/v1/chat')).status_code,429)
   finally:finish.set();await first
   self.assertEqual((await client.post('/api/v1/chat')).status_code,200)
 async def test_health_does_not_invoke_a_provider_and_origins_are_explicit(self):
  from main import app
  async with httpx.AsyncClient(transport=httpx.ASGITransport(app),base_url='http://fixture') as client:
   response=await client.get('/health/live');self.assertEqual(response.json(),{'status':'alive'});self.assertEqual(response.headers['x-content-type-options'],'nosniff')
   response=await client.options('/api/v1/chat',headers={'Origin':'https://untrusted.example','Access-Control-Request-Method':'POST'})
   self.assertNotIn('access-control-allow-origin',response.headers)
 async def test_limiter_storage_is_bounded_and_expires(self):
  now=[0];limiter=ApiProtection(None,enabled=True,clock=lambda:now[0]);limiter.max_buckets=2
  self.assertTrue(limiter.admit('one',1,60));self.assertFalse(limiter.admit('one',1,60));self.assertTrue(limiter.admit('two',1,60));self.assertFalse(limiter.admit('three',1,60))
  now[0]=3601;self.assertTrue(limiter.admit('three',1,60));self.assertEqual(len(limiter.buckets),1)
